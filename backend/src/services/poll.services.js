import ApiError from "../utils/api.error.js";
import crypto from "node:crypto";
import Poll from "../models/polls.model.js";
import Question from "../models/questions.model.js";
import User from "../models/user.model.js";
import valkey from "../configs/valkey.client.js";
import { getIO } from "../configs/socket.js";
import { sendPollResultsEmail } from "../utils/email.utils.js";

const createPoll = async (userId,{title,isAnonymous,requireAuth,duration}) => {
    //generate a slug 
    let slug = crypto.randomBytes(6).toString("hex").slice(0, 6);
    //check slug existence
    let existing = await Poll.findOne({
        slug
    })
    while(existing){
        slug = crypto.randomBytes(6).toString("hex").slice(0, 6);
        existing = await Poll.findOne({
            slug
        })
    }

    const poll = await Poll.create({
        creatorId: userId,
        title,
        slug,
        isAnonymous,
        requireAuth,
        duration
    })
    try {
        await valkey.set(`slug:${slug}`, poll._id.toString());
    } catch (error) {
        // Ignore cache failures to avoid breaking poll creation
    }
    const pollObj = poll.toObject();
    // console.log(pollObj);
    return pollObj;
}

const getPolls = async (userId) => {
    const polls = await Poll.find({creatorId: userId}).sort({ createdAt: -1 });
    // Optional: add lazy check here too if needed, 
    // but usually dashboard handles its own state.
    return polls;
}

const getPollById = async (id) => {
    let poll = await Poll.findById(id);
    if(!poll) throw ApiError.notFound("Poll not found");

    if (poll.isStarted && !poll.isPublished && poll.expiryDate && new Date() > new Date(poll.expiryDate)) {
        await publishPoll(poll._id, poll.creatorId);
        poll = await Poll.findById(id);
    }

    return poll;
}

const getPollBySlug = async (slug,user) => {
    let poll = null;
    try {
        const pollId = await valkey.get(`slug:${slug}`);
        if (pollId) {
            poll = await Poll.findById(pollId);
            if (!poll) {
                await valkey.del(`slug:${slug}`);
            }
        }
    } catch (error) {
        // Fallback to Mongo if cache lookup fails
    }
    if (!poll) {
        poll = await Poll.findOne({slug});
        if (poll) {
            try {
                await valkey.set(`slug:${slug}`, poll._id.toString());
            } catch (error) {
                // Ignore cache failures
            }
        }
    }
    if(!poll) throw ApiError.notFound("Poll not found");

    // Auto-publish if expired but not yet published
    if (poll.isStarted && !poll.isPublished && poll.expiryDate && new Date() > new Date(poll.expiryDate)) {
        await publishPoll(poll._id, poll.creatorId);
        poll = await Poll.findById(poll._id);
    }

    // Increment view count (fire-and-forget, don't block the response)
    Poll.findByIdAndUpdate(poll._id, { $inc: { views: 1 } }).catch(() => {});

    if(poll.requireAuth&&!user){
        const pollObj = {
            title: poll.title,
            status: "No Permission"
        }
        return pollObj;
    }
    let pollObj = poll.toObject();
    if(poll.isAnonymous)
        pollObj.creatorId = undefined;
    else {
        const populated = await poll.populate("creatorId", "name email");
        pollObj = populated.toObject();
    }
    pollObj.socket = !poll.isStarted;

    return pollObj;
}

const publishPoll = async (id, userId) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notFound("Poll not found");
    if(poll.creatorId.toString() !== userId.toString()) throw ApiError.forbidden("You are not authorized to publish this poll");

    poll.isPublished = true;
    poll.resultsReady = false;
    await poll.save();

    // ── Broadcast immediately so participants see the transition ──────────
    try {
        const io = getIO();
        io.to(poll._id.toString()).emit("POLL_PUBLISHED", { pollId: poll._id.toString(), resultsReady: false });
    } catch { /* socket not critical */ }

    // ── Flush Valkey tally → Question.options[].count in MongoDB ─────────
    // Run asynchronously so the publish API responds immediately
    (async () => {
        try {
            // 1. Wait for the submission queue to drain (max 15 s)
            const QUEUE_KEY = "queue:submissions";
            const deadline = Date.now() + 15_000;
            while (Date.now() < deadline) {
                const qLen = await valkey.llen(QUEUE_KEY);
                if (qLen === 0) break;
                await new Promise(r => setTimeout(r, 500));
            }

            // 2. Read the final tally from Valkey
            let rawTally = {};
            try { rawTally = await valkey.hgetall(`tally:poll:${poll._id.toString()}`) ?? {}; } catch { }

            // 3. Build $inc operations per question option
            const incOps = [];
            for (const [key, value] of Object.entries(rawTally)) {
                // key format: "q:<questionId>:opt:<optionId>"
                const m = key.match(/^q:(.+):opt:(.+)$/);
                if (!m) continue;
                const [, questionId, optionId] = m;
                const inc = Number(value) || 0;
                if (inc > 0) {
                    incOps.push({
                        updateOne: {
                            filter: { _id: questionId, pollId: poll._id },
                            update: { $set: { "options.$[opt].count": inc } },
                            arrayFilters: [{ "opt.id": optionId }],
                        }
                    });
                }
            }

            if (incOps.length > 0) {
                await Question.bulkWrite(incOps);
                console.log(`[publish] Flushed ${incOps.length} tally entries to MongoDB for poll ${poll._id}.`);
            }

            // Count unique voters first so we can save with resultsReady
            const lockPattern = `lock:poll:${poll._id}:q:*`;
            const lockKeys = await valkey.keys(lockPattern);
            const submitterIds = new Set();
            for (const key of lockKeys) {
                const parts = key.split(':u:');
                if (parts.length === 2) submitterIds.add(parts[1]);
            }
            const voterCount = submitterIds.size;

            // 4. Mark results as ready and save totalVoters
            await Poll.findByIdAndUpdate(poll._id, { resultsReady: true, totalVoters: voterCount });

            // 5. Notify all connected clients that results are now ready
            try {
                const io = getIO();
                io.to(poll._id.toString()).emit("RESULTS_READY", { pollId: poll._id.toString() });
            } catch { }

            // 6. Send results email to creator (voterCount already computed above)
            try {
                const creator = await User.findById(poll.creatorId).select('email name');
                if (creator?.email) {
                    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
                    await sendPollResultsEmail(
                        creator.email,
                        creator.name,
                        poll.title,
                        voterCount,
                        dashboardUrl
                    );
                    console.log(`[publish] Results email sent to ${creator.email} for poll ${poll._id}.`);
                }
            } catch (emailErr) {
                console.error('[publish] Failed to send results email:', emailErr.message);
            }

            console.log(`[publish] Results ready for poll ${poll._id}.`);
        } catch (err) {
            console.error("[publish] Failed to finalize results:", err.message);
        }
    })();

    return { poll };
}

const startPoll = async (id, userId) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notFound("Poll not found");
    if(poll.creatorId.toString() !== userId.toString()) throw ApiError.forbidden("You are not authorized to start this poll");
    if(poll.isStarted) return poll;

    const durationInMs = poll.duration * 1000;
    const expiryDate = new Date(Date.now() + durationInMs);

    poll.isStarted = true;
    poll.expiryDate = expiryDate;
    poll.startedAt = new Date();
    poll.maxConcurrentUsers = 0;
    await poll.save();

    const io = getIO();
    io.to(poll._id.toString()).emit("QUESTION_PUBLISHED", { 
        pollId: poll._id.toString(),
        expiryDate: expiryDate.toISOString()
    });

    // Auto-publish after duration
    setTimeout(() => {
        publishPoll(id, userId).catch(err => console.error(`[auto-publish] Failed for poll ${id}:`, err.message));
    }, durationInMs);

    return poll;
}

const updatePoll = async (id, userId, {title,isAnonymous,requireAuth,duration}) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notFound("Poll not found");
    if(poll.creatorId.toString() !== userId.toString()) throw ApiError.forbidden("You are not authorized to update this poll");

    poll.title = title || poll.title;
    poll.isAnonymous = isAnonymous !== undefined ? isAnonymous : poll.isAnonymous;
    poll.requireAuth = requireAuth !== undefined ? requireAuth : poll.requireAuth;
    poll.duration = duration || poll.duration;

    await poll.save();
    return poll;
}

const deletePoll = async (id, userId) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notfound("Poll not found");
    if(poll.creatorId.toString() !== userId.toString()) throw ApiError.forbidden("You are not authorized to delete this poll");

    try {
        await valkey.del(`slug:${poll.slug}`);
    } catch (error) {
        // Ignore cache failures
    }

    const deletedPoll = await Poll.findByIdAndDelete(id);
    return deletedPoll;
}

const getPollTally = async (id, userId) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notFound("Poll not found");
    // Published results are public — anyone can see them
    // Live (unpublished) tally is restricted to the creator only
    if (!poll.isPublished) {
        if (!userId || poll.creatorId.toString() !== userId.toString()) {
            throw ApiError.forbidden("Only the poll creator can see live results before publishing");
        }
    }

    let tally = {};
    try {
        tally = await valkey.hgetall(`tally:poll:${poll._id.toString()}`);
    } catch (error) {
        // Ignore tally errors
    }

    const parsedTally = Object.fromEntries(
        Object.entries(tally).map(([key, value]) => [key, Number(value)])
    );

    return parsedTally;
}

const getPublishedResults = async (id) => {
    const poll = await Poll.findById(id).lean();
    if (!poll) throw ApiError.notFound("Poll not found");
    if (!poll.isPublished) throw ApiError.forbidden("Results are not published yet");

    const questions = await Question.find({ pollId: id }).sort({ order: 1 }).lean();
    return { poll, questions };
}

export { createPoll, getPollBySlug, getPollById, getPolls, updatePoll, deletePoll, publishPoll, startPoll, getPollTally, getPublishedResults };
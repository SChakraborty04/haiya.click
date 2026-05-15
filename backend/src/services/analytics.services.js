import Poll from "../models/polls.model.js";
import Question from "../models/questions.model.js";
import Response from "../models/responses.model.js";
import ApiError from "../utils/api.error.js";

/**
 * Per-poll analytics (for poll creators when they click a specific poll)
 */
export const getPollAnalytics = async (pollId, userId) => {
    const poll = await Poll.findById(pollId).lean();
    if (!poll) throw ApiError.notFound("Poll not found");
    if (poll.creatorId.toString() !== userId.toString())
        throw ApiError.forbidden("Not authorized");

    const questions = await Question.find({ pollId }).lean();

    // Total votes per question
    const questionStats = questions.map((q) => {
        const totalVotes = q.options.reduce((s, o) => s + (o.count || 0), 0);
        const maxCount = Math.max(...q.options.map((o) => o.count || 0), 0);
        return {
            _id: q._id,
            text: q.text,
            order: q.order,
            isRequired: q.isRequired,
            totalVotes,
            options: q.options.map((o) => ({
                id: o.id,
                text: o.text,
                count: o.count || 0,
                pct: totalVotes > 0 ? Math.round(((o.count || 0) / totalVotes) * 100) : 0,
                isWinner: (o.count || 0) === maxCount && maxCount > 0,
            })),
        };
    });

    // Duration used (how long the poll actually ran)
    let durationUsed = null;
    if (poll.startedAt && poll.expiryDate) {
        const actualEnd = poll.isPublished ? new Date(poll.expiryDate) : new Date();
        durationUsed = Math.round((actualEnd - new Date(poll.startedAt)) / 1000); // in seconds
    }

    // Voters over time — bucket responses by minute using createdAt
    const responses = await Response.find({ pollId })
        .select("createdAt")
        .sort({ createdAt: 1 })
        .lean();

    const votersOverTime = buildVoterTimeline(responses, poll.startedAt, poll.expiryDate);

    return {
        pollId: poll._id,
        title: poll.title,
        status: poll.isPublished ? "published" : poll.isStarted ? "live" : "draft",
        createdAt: poll.createdAt,
        startedAt: poll.startedAt || null,
        expiryDate: poll.expiryDate || null,
        duration: poll.duration, // configured duration in seconds
        durationUsed, // actual seconds the poll ran
        totalVoters: poll.totalVoters || 0,
        maxConcurrentUsers: poll.maxConcurrentUsers || 0,
        views: poll.views || 0,
        questions: questionStats,
        votersOverTime,
        totalQuestions: questions.length,
    };
};

/**
 * Overall analytics across all of a creator's polls
 */
export const getOverallAnalytics = async (userId) => {
    const polls = await Poll.find({ creatorId: userId }).lean();

    const totalPolls = polls.length;
    const publishedPolls = polls.filter((p) => p.isPublished).length;
    const livePolls = polls.filter((p) => p.isStarted && !p.isPublished).length;
    const draftPolls = polls.filter((p) => !p.isStarted).length;

    const totalVotesAllTime = polls.reduce((s, p) => s + (p.totalVoters || 0), 0);
    const totalViews = polls.reduce((s, p) => s + (p.views || 0), 0);

    // Most engaged poll (by totalVoters)
    const mostEngaged = polls
        .filter((p) => p.isPublished)
        .sort((a, b) => (b.totalVoters || 0) - (a.totalVoters || 0))[0] || null;

    // Average participation per published poll
    const publishedWithVoters = polls.filter((p) => p.isPublished && (p.totalVoters || 0) > 0);
    const avgParticipation =
        publishedWithVoters.length > 0
            ? Math.round(
                  publishedWithVoters.reduce((s, p) => s + (p.totalVoters || 0), 0) /
                      publishedWithVoters.length
              )
            : 0;

    // Polls over time — group by month
    const pollsOverTime = buildPollsTimeline(polls);

    // Top 3 polls by engagement
    const topPolls = [...polls]
        .filter((p) => p.isPublished)
        .sort((a, b) => (b.totalVoters || 0) - (a.totalVoters || 0))
        .slice(0, 3)
        .map((p) => ({ _id: p._id, title: p.title, totalVoters: p.totalVoters || 0, views: p.views || 0 }));

    return {
        totalPolls,
        publishedPolls,
        livePolls,
        draftPolls,
        totalVotesAllTime,
        totalViews,
        avgParticipation,
        mostEngaged: mostEngaged
            ? { _id: mostEngaged._id, title: mostEngaged.title, totalVoters: mostEngaged.totalVoters || 0 }
            : null,
        topPolls,
        pollsOverTime,
    };
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildVoterTimeline(responses, startedAt, expiryDate) {
    if (!startedAt || responses.length === 0) return [];

    const start = new Date(startedAt).getTime();
    const end = expiryDate ? new Date(expiryDate).getTime() : responses[responses.length - 1].createdAt.getTime();
    const totalMs = end - start;

    // Use 10 buckets
    const BUCKETS = 10;
    const bucketMs = Math.max(totalMs / BUCKETS, 1000);
    const buckets = Array(BUCKETS).fill(0);

    for (const r of responses) {
        const offset = new Date(r.createdAt).getTime() - start;
        const idx = Math.min(Math.floor(offset / bucketMs), BUCKETS - 1);
        if (idx >= 0) buckets[idx]++;
    }

    return buckets.map((count, i) => ({
        label: `+${Math.round((i * bucketMs) / 60000)}m`,
        count,
    }));
}

function buildPollsTimeline(polls) {
    const map = {};
    for (const p of polls) {
        const d = new Date(p.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, count]) => ({ label, count }));
}

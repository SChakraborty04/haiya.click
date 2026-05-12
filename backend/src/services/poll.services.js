import ApiError from "../utils/api.error.js";
import crypto from "node:crypto";
import Poll from "../models/polls.model.js";

const createPoll = async (userId,{title,isAnonymous,requireAuth,expiryDate}) => {
    //generate a slug 
    const slug = crypto.randomBytes(6).toString("hex").slice(0, 6);
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
        expiryDate
    })
    const pollObj = poll.toObject();
    // console.log(pollObj);
    return pollObj;
}

const getPolls = async (userId) => {
    const polls = await Poll.find({creatorId: userId});
    return polls;
}

const getPollById = async (id) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notFound("Poll not found");
    return poll;
}

const getPollBySlug = async (slug) => {
    const poll = await Poll.findOne({slug});
    if(!poll) throw ApiError.notFound("Poll not found");
    // console.log(poll);
    let pollObj = poll.toObject();
    if(poll.isAnonymous)
    pollObj.creatorId = undefined;
    else
    pollObj = await poll.populate("creatorId", "name email");

    
    return pollObj;
}

const updatePoll = async (id, userId, {title,isAnonymous,requireAuth,expiryDate}) => {
    const poll = await Poll.findById(id);
    console.log(poll);
    console.log(userId);
    if(!poll) throw ApiError.notFound("Poll not found");
    if(poll.creatorId.toString() !== userId.toString()) throw ApiError.forbidden("You are not authorized to update this poll");

    poll.title = title || poll.title;
    poll.isAnonymous = isAnonymous !== undefined ? isAnonymous : poll.isAnonymous;
    poll.requireAuth = requireAuth !== undefined ? requireAuth : poll.requireAuth;
    poll.expiryDate = expiryDate || poll.expiryDate;

    await poll.save();
    return poll;
}

const deletePoll = async (id, userId) => {
    const poll = await Poll.findById(id);
    if(!poll) throw ApiError.notfound("Poll not found");
    if(poll.creatorId.toString() !== userId.toString()) throw ApiError.forbidden("You are not authorized to delete this poll");

    const deletedPoll = await Poll.findByIdAndDelete(id);
    return deletedPoll;
}

export { createPoll, getPollBySlug, getPollById, getPolls, updatePoll,deletePoll};
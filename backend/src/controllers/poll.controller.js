import * as pollService from "../services/poll.services.js";
import ApiResponse from "../utils/api.response.js";

const createPoll = async (req, res) => {
    const poll =  await pollService.createPoll(req.user.id,req.body);
    ApiResponse.created(res, "Poll created successfully", poll);
}
const getAllPolls = async (req, res) => {
    const polls = await pollService.getPolls(req.user.id);
    ApiResponse.ok(res, "Polls fetched successfully", polls);
}

const getPollById = async (req, res) => {
    const poll = await pollService.getPollById(req.params.id);
    ApiResponse.ok(res, "Poll fetched successfully", poll);
}

const getPollBySlug = async (req, res) => {
    const poll = await pollService.getPollBySlug(req.params.slug,req.user);
    if(poll.status === "No Permission"){
        return ApiResponse.noPermission(res, "Unauthenticated users are not allowed in this poll", poll);
    }
    ApiResponse.ok(res, "Poll fetched successfully", poll);
}
const updatePoll = async (req, res) => {
    const poll = await pollService.updatePoll(req.params.id, req.user.id, req.body);
    ApiResponse.ok(res, "Poll updated successfully", poll);
}
const deletePoll = async (req, res) => {
    try{
        const poll = await pollService.deletePoll(req.params.id, req.user.id);
        ApiResponse.ok(res, "Poll deleted successfully",poll);
    }
    catch(err){
        ApiResponse.internal(res, err.message);
    }
}

const publishPoll = async (req, res) => {
    const result = await pollService.publishPoll(req.params.id, req.user.id);
    ApiResponse.ok(res, "Poll results published", result);
}

const startPoll = async (req, res) => {
    const poll = await pollService.startPoll(req.params.id, req.user.id);
    ApiResponse.ok(res, "Poll started", poll);
}

const getPollTally = async (req, res) => {
    const tally = await pollService.getPollTally(req.params.id, req.user?.id);
    ApiResponse.ok(res, "Live tally fetched successfully", tally);
}

const getPublishedResults = async (req, res) => {
    const result = await pollService.getPublishedResults(req.params.id);
    ApiResponse.ok(res, "Published results fetched successfully", result);
}

export { createPoll , getPollBySlug, getPollById, getAllPolls, updatePoll, deletePoll, publishPoll, startPoll, getPollTally, getPublishedResults };

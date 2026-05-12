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
    const poll = await pollService.getPollBySlug(req.params.slug);
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

export { createPoll , getPollBySlug, getPollById, getAllPolls, updatePoll, deletePoll};

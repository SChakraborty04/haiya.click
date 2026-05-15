import User from "../models/user.model.js";
import Question from "../models/questions.model.js";
import ApiError from "../utils/api.error.js";
import Poll from "../models/polls.model.js";

const createQuestion = async ({order,text,isRequired,options},pollId,user) => {
    const poll = await Poll.findById(pollId);
    if(!poll) throw ApiError.notFound("Poll not found");
    if(poll.creatorId.toString()!==user.id.toString()) throw ApiError.forbidden("You are not the creator of this poll");

    const question = await Question.create({
        pollId,
        order,
        text,
        isRequired,
        options
    })
    const questionObj = question.toObject();
    return questionObj;
}
const getQuestionsByPollId = async (pollId, user) => {
    const poll = await Poll.findById(pollId);
    if(!poll) throw ApiError.notFound("Poll not found");

    const isCreator = user && poll.creatorId.toString() === user.id.toString();

    // Enforce requireAuth: only the creator or authenticated users may read questions
    if (poll.requireAuth && !user) {
        throw ApiError.unauthorized("This poll requires you to be logged in");
    }

    // A poll is considered "started" if isStarted=true OR expiryDate is set
    // (expiryDate is written in the same DB operation as isStarted, so using
    // it as a secondary signal eliminates false negatives from replica lag
    // when a client fetches questions immediately after the socket event fires)
    const isLive = poll.isStarted || !!poll.expiryDate;

    if (!isLive && !isCreator) {
        return [];
    }

    const questions = await Question.find({pollId}).sort({order:1});
    return questions;
}


const getAllQuestionsByPollId = async (pollId) => {
    const questions = await Question.find({pollId}).sort({order:1}).populate("options");
    return questions;
}
const updateQuestion = async (questionId,{order,text,isRequired,options},user) => {
    const question = await Question.findById(questionId);
    if(!question) throw ApiError.notFound("Question not found");
    const poll = await Poll.findById(question.pollId);
    if(poll.creatorId.toString()!==user.id.toString()) throw ApiError.forbidden("You are not the creator of this poll");

    question.order = order;
    question.text = text;
    question.isRequired = isRequired;
    question.options = options;
    await question.save();
    const questionObj = question.toObject();
    return questionObj;
}
const deleteQuestion = async (questionId,user) => {
    const question = await Question.findById(questionId);
    if(!question) throw ApiError.notFound("Question not found");
    const poll = await Poll.findById(question.pollId);
    if(poll.creatorId.toString()!==user.id.toString()) throw ApiError.forbidden("You are not the creator of this poll");

    const deletedQuestion = await Question.findByIdAndDelete(questionId);
    return deletedQuestion.toObject();
}


export { createQuestion, getQuestionsByPollId, updateQuestion, deleteQuestion, getAllQuestionsByPollId };
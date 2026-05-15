import * as questionServies from "../services/question.services.js";
import ApiResponse from "../utils/api.response.js";

const createQuestion = async (req,res) => {
    const question = await questionServies.createQuestion(req.body,req.params.pollId,req.user);
    ApiResponse.created(res, "Question created successfully", question);
}
const getQuestionsByPollId = async (req,res) => {
    const questions = await questionServies.getQuestionsByPollId(req.params.pollId, req.user);
    ApiResponse.ok(res, "Questions fetched successfully", questions);
}
const getAllQuestionsByPollId = async (req,res) => {
    const questions = await questionServies.getAllQuestionsByPollId(req.params.pollId);
    ApiResponse.ok(res, "Questions fetched successfully", questions);
}
const updateQuestion = async (req,res) => {
    const question = await questionServies.updateQuestion(req.params.questionId,req.body,req.user);
    ApiResponse.ok(res, "Question updated successfully", question);
}
const deleteQuestion = async (req,res) => {
    const question = await questionServies.deleteQuestion(req.params.questionId,req.user);
    ApiResponse.ok(res, "Question deleted successfully", question);
}

export { createQuestion, getQuestionsByPollId, updateQuestion, deleteQuestion, getAllQuestionsByPollId };
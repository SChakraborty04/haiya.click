import { Router } from "express";
import validate from "../middleware/validate.middleware.js";
import question from "../dto/questions.dto.js";
import { createQuestion, deleteQuestion, getAllQuestionsByPollId, getQuestionsByPollId, updateQuestion } from "../controllers/question.controller.js";
import { authenticate, authenticateOptional } from "../middleware/auth.middleware.js";


const router = Router()
//Routes to create
//get question by pollid, create question, update question, delete question
//atomic operations by quiz creator
router.post("/:pollId",validate(question),authenticate, createQuestion);
router.get("/:pollId", authenticateOptional, getQuestionsByPollId);
router.get("/all/:pollId", getAllQuestionsByPollId);
router.put("/:questionId", validate(question), authenticate, updateQuestion);
router.delete("/:questionId", authenticate, deleteQuestion);

//start the poll

//get all questions by pollid (by user and socket)



export default router;
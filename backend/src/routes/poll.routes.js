import { Router } from "express";
import { createPoll, deletePoll, getAllPolls, getPollById, updatePoll } from "../controllers/poll.controller.js";
import validate from "../middleware/validate.middleware.js";
import PollDto from "../dto/poll.dto.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getPollBySlug } from "../controllers/poll.controller.js";




const router = Router()

//Todo1: Routes to create, get, update and delete polls
router.post("/",validate(PollDto),authenticate, createPoll);
//get
router.get("/my-polls", authenticate,getAllPolls);
router.get("/:id", authenticate, getPollById);
//update polls
router.put("/:id", validate(PollDto), authenticate, updatePoll);
//Delete polls
router.delete("/:id", authenticate, deletePoll);
//get poll by slug(Used to fetch the results of a poll)
router.get("/s/:slug", getPollBySlug);
//Todo2: Polling engine routes to cast votes and get real-time results
//Todo3: Routes to publish results of a poll and get the results of a poll

export default router;
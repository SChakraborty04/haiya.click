import ApiError from "../utils/api.error.js";
import Poll from "../models/polls.model.js";
import valkey from "../configs/valkey.client.js";
import { getIO } from "../configs/socket.js";

const QUEUE_KEY = "queue:submissions";

const submitPoll = async (pollId, payload, user) => {
  const poll = await Poll.findById(pollId);
  if (!poll) throw ApiError.notFound("Poll not found");

  if (poll.requireAuth && !user) {
    throw ApiError.forbidden("Authentication required for this poll");
  }
  if (!poll.isStarted) {
    throw ApiError.forbidden("Poll has not started");
  }
  if (poll.isPublished) {
    throw ApiError.forbidden("Poll results are published");
  }

  const answers = Array.isArray(payload?.answers) ? payload.answers : null;
  if (!answers || answers.length === 0) {
    throw ApiError.badRequest("Answers are required");
  }

  const fingerprint = payload?.fingerprint;
  const submitterId = user?.id || fingerprint;
  if (!submitterId) {
    throw ApiError.badRequest("Fingerprint is required for anonymous submissions");
  }

  const tallyKey = `tally:poll:${pollId}`;
  const io = getIO();

  for (const answer of answers) {
    if (!answer?.questionId || !answer?.optionId) {
      throw ApiError.badRequest("Invalid answer payload");
    }
    
    // Lock per question per user for 7 days
    const lockKey = `lock:poll:${pollId}:q:${answer.questionId}:u:${submitterId}`;
    const locked = await valkey.set(lockKey, "1", "NX", "EX", 604800);
    if (!locked) {
      throw ApiError.conflict(`Already submitted for question: ${answer.questionId}`);
    }

    const field = `q:${answer.questionId}:opt:${answer.optionId}`;
    const newCount = await valkey.hincrby(tallyKey, field, 1);
    io.to(pollId.toString()).emit("VOTE_PULSE", {
      qId: answer.questionId,
      oId: answer.optionId,
      newCount,
    });
  }

  const submission = {
    pollId: pollId.toString(),
    userId: user?.id || null,
    fingerprint: user ? null : fingerprint,
    answers,
    createdAt: new Date().toISOString(),
  };

  await valkey.lpush(QUEUE_KEY, JSON.stringify(submission));

  return { accepted: true };
};

export { submitPoll };

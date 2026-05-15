import * as responseService from "../services/response.services.js";
import ApiResponse from "../utils/api.response.js";
import crypto from "crypto";

const submitPoll = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const userAgent = req.headers['user-agent'] || '';
  
  // Create a fingerprint from IP + User Agent
  const generatedFingerprint = crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex');
  
  // Override any client-provided fingerprint
  const payload = { ...req.body, fingerprint: generatedFingerprint };

  const result = await responseService.submitPoll(req.params.id, payload, req.user);
  ApiResponse.accepted(res, "Submission queued", result);
};

export { submitPoll };

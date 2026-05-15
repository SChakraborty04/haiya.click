import valkey from "../configs/valkey.client.js";
import Response from "../models/responses.model.js";
import Question from "../models/questions.model.js";

const QUEUE_KEY = "queue:submissions";
const BATCH_SIZE = 50;
const DELAY_MS = 3000;

const drainQueue = async () => {
  try {
    const batch = await valkey.rpop(QUEUE_KEY, BATCH_SIZE);
    const items = Array.isArray(batch) ? batch : batch ? [batch] : [];

    if (items.length > 0) {
      const documents = [];
      for (const raw of items) {
        try {
          documents.push(JSON.parse(raw));
        } catch {
          console.error("Invalid submission payload, dropping item");
        }
      }

      if (documents.length > 0) {
        // ── Pass 1: Insert Response records ───────────────────────────────
        try {
          await Response.bulkWrite(
            documents.map((doc) => ({ insertOne: { document: doc } }))
          );
          console.log(`[worker] Synced ${documents.length} response docs to MongoDB.`);
        } catch (mongoErr) {
          console.error("[worker] Response bulkWrite failed, re-queuing:", mongoErr.message);
          // Re-queue items so they are not lost
          await valkey.lpush(QUEUE_KEY, ...items);
          return; // skip option count update if response insert failed
        }

        // ── Pass 2: $inc Question option counts ───────────────────────────
        // Build one update operation per (questionId, optionId) pair
        const countMap = new Map(); // key: "questionId::optionId" → increment amount
        for (const doc of documents) {
          for (const answer of (doc.answers || [])) {
            const key = `${answer.questionId}::${answer.optionId}`;
            countMap.set(key, (countMap.get(key) || 0) + 1);
          }
        }

        if (countMap.size > 0) {
          const questionUpdates = [];
          for (const [key, inc] of countMap.entries()) {
            const [questionId, optionId] = key.split("::");
            questionUpdates.push({
              updateOne: {
                filter: { _id: questionId },
                update: { $inc: { "options.$[opt].count": inc } },
                arrayFilters: [{ "opt.id": optionId }],
              },
            });
          }
          try {
            const result = await Question.bulkWrite(questionUpdates);
            console.log(`[worker] Updated option counts for ${result.modifiedCount} question(s).`);
          } catch (err) {
            console.error("[worker] Question count bulkWrite failed:", err.message);
            // Non-fatal: Response docs are already saved; counts can be recomputed
          }
        }
      }
    }
  } catch (error) {
    console.error("[worker] Queue drain error:", error);
  } finally {
    setTimeout(drainQueue, DELAY_MS);
  }
};

const startSubmissionWorker = () => {
  console.log("[worker] Submission worker started. Draining every 3s.");
  drainQueue();
};

export { startSubmissionWorker };

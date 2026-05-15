import { getPollAnalytics, getOverallAnalytics } from "../services/analytics.services.js";
import ApiResponse from "../utils/api.response.js";

export const pollAnalytics = async (req, res, next) => {
    try {
        const data = await getPollAnalytics(req.params.id, req.user.id);
        ApiResponse.ok(res, "Analytics fetched", data);
    } catch (err) {
        next(err);
    }
};

export const overallAnalytics = async (req, res, next) => {
    try {
        const data = await getOverallAnalytics(req.user.id);
        ApiResponse.ok(res, "Overview analytics fetched", data);
    } catch (err) {
        next(err);
    }
};

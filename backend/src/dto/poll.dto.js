import Joi from "joi";
import BaseDto from "./base.dto.js"

class PollDto extends BaseDto {
    static schema = Joi.object({
        title: Joi.string().trim().min(2).max(100).required(),
        isAnonymous: Joi.boolean().default(false),
        requireAuth: Joi.boolean().default(false),
        expiryDate: Joi.date().greater("now").optional(),
        duration: Joi.number().required()
    })
}

export default PollDto
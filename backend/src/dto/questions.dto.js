import Joi from "joi";
import BaseDto from "./base.dto.js"

class QuestionDto extends BaseDto{
    static schema = Joi.object({
        order: Joi.number().integer().min(1).required(),
        text: Joi.string().trim().min(1).max(500).required(),
        isRequired: Joi.boolean().default(false),
        options: Joi.array().items(
            Joi.object({
                id: Joi.string().required(),
                text: Joi.string().trim().min(1).max(100).required(),
            })
        ).min(2).required()
    })
}

export default QuestionDto;
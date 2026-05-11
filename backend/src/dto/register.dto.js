import Joi from "joi";
import BaseDto from "./base.dto.js"

class RegisterDto extends BaseDto {
    static schema = Joi.object({
        name: Joi.string().trim().min(2).max(50).required(),
        email: Joi.string().email().lowercase().required(),
        password: Joi.string().min(8).required(),
    })
}

export default RegisterDto
import ApiError from "../utils/api.error.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";

import User from "../models/user.model.js";

const userCheck = async (req, res, next) => {
  let token;
  let mode = "no-auth";
  let decoded;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    mode="auth";
  }

  if (!token) mode = "no-auth";
  if (token) {
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      mode = "no-auth";
    }
  }
  let user = null;
  if(decoded) user = await User.findById(decoded.id);
  if (!user) mode = "no-auth";

  req.mode = mode;
  if(user)
  req.user = {
    id: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
  };
  next();
};


export { userCheck };
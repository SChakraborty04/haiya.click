import ApiError from "../utils/api.error.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";

import User from "../models/user.model.js";

const authenticate = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) throw ApiError.unauthorized("Not Autheticated");
  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized("User no longer exists");

  req.user = {
    id: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
  };
  next();
};

const authenticateOptional = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = {
          id: user._id,
          role: user.role,
          name: user.name,
          email: user.email,
        };
      }
    } catch (err) {
      // Ignore token errors for optional auth
    }
  }
  next();
};

export { authenticate, authenticateOptional };
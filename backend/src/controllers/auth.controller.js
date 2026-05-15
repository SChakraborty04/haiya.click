import * as authService from "../services/auth.services.js";
import ApiResponse from "../utils/api.response.js";

const register = async (req, res) => {
  const user = await authService.register(req.body);
  ApiResponse.created(res, "Registration success", user);
};

const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.ok(res, "Login successful", { user, accessToken });
};

const logout = async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie("refreshToken");
  ApiResponse.ok(res, "Logout Success");
};

const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  ApiResponse.ok(res, "User Profile", user);
};

const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken } = await authService.refresh(token);
  ApiResponse.ok(res, "Token refreshed", { accessToken });
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  await authService.verifyEmail(token);
  ApiResponse.ok(res, "Email verified successfully");
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  await authService.resendVerification(email);
  ApiResponse.ok(res, "Verification email resent successfully");
};

export { register, login, logout, getMe, refresh, verifyEmail, resendVerification };
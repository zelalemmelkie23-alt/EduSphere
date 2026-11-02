const AppError = require("../errors/AppError");

function createLoginRateLimit({
  limit = 10,
  windowMs = 15 * 60 * 1000,
  now = Date.now,
  onLimited
} = {}) {
  const attempts = new Map();
  return async function loginRateLimit(req, res, next) {
    const time = now();
    for (const [ip, entry] of attempts) {
      if (entry.resetAt <= time) attempts.delete(ip);
    }
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const entry = attempts.get(ip);
    if (entry && entry.count >= limit) {
      if (onLimited) {
        await onLimited({
          ipAddress: ip,
          requestId: req.get("x-request-id")?.slice(0, 100) || null
        });
      }
      return next(new AppError(429, "LOGIN_RATE_LIMITED", "Too many login attempts. Please try again later."));
    }
    attempts.set(ip, entry
      ? { count: entry.count + 1, resetAt: entry.resetAt }
      : { count: 1, resetAt: time + windowMs });
    req.clearLoginRateLimit = () => attempts.delete(ip);
    return next();
  };
}

module.exports = createLoginRateLimit;

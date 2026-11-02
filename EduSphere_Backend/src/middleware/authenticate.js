const AppError = require("../errors/AppError");
const { hashSessionToken } = require("../utils/session");

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

function createAuthenticate(authService, cookieName) {
  return async function authenticate(req, res, next) {
    try {
      const token = readCookie(req.headers.cookie, cookieName);
      if (!token) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
      }

      req.authSessionHash = hashSessionToken(token);
      req.auth = await authService.getSession(req.authSessionHash);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = createAuthenticate;

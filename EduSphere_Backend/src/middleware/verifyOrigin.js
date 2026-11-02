const AppError = require("../errors/AppError");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function createVerifyOrigin(frontendOrigin) {
  return function verifyOrigin(req, res, next) {
    const origin = req.get("origin");
    if (MUTATING_METHODS.has(req.method) && origin && origin !== frontendOrigin) {
      return next(new AppError(403, "INVALID_ORIGIN", "The request origin is not allowed."));
    }
    return next();
  };
}

module.exports = createVerifyOrigin;

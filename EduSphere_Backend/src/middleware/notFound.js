const AppError = require("../errors/AppError");

function notFound(req, res, next) {
  next(new AppError(404, "NOT_FOUND", "The requested endpoint was not found."));
}

module.exports = notFound;

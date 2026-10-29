const AppError = require("../errors/AppError");

function createErrorHandler(logger = console) {
  return function errorHandler(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    const malformedJson = error.type === "entity.parse.failed";
    const statusCode = error instanceof AppError
      ? error.statusCode
      : malformedJson ? 400 : 500;
    const code = error instanceof AppError
      ? error.code
      : malformedJson ? "INVALID_JSON" : "INTERNAL_SERVER_ERROR";
    const message = error instanceof AppError
      ? error.message
      : malformedJson ? "The request body contains invalid JSON." : "An unexpected error occurred.";

    if (statusCode >= 500) {
      logger.error("Request failed:", error.cause || error);
    }

    res.status(statusCode).json({
      error: { code, message }
    });
  };
}

module.exports = createErrorHandler;

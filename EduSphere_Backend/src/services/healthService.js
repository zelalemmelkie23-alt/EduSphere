const AppError = require("../errors/AppError");

function createHealthService(healthRepository) {
  return {
    async getStatus() {
      try {
        await healthRepository.checkDatabase();
      } catch (error) {
        throw new AppError(
          503,
          "DATABASE_UNAVAILABLE",
          "The school database is unavailable.",
          { cause: error }
        );
      }

      return {
        message: "School API is running",
        data: { status: "ok", database: "connected" }
      };
    }
  };
}

module.exports = createHealthService;

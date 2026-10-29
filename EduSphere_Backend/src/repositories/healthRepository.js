function createHealthRepository(database) {
  return {
    async checkDatabase() {
      await database.query("SELECT 1");
    }
  };
}

module.exports = createHealthRepository;

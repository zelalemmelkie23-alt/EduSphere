function createHealthController(healthService) {
  return async function healthCheck(req, res) {
    const status = await healthService.getStatus();
    res.status(200).json(status);
  };
}

module.exports = createHealthController;

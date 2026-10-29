const createApp = require("./src/app");

if (require.main === module) {
  require("./src/server");
}

module.exports = createApp;

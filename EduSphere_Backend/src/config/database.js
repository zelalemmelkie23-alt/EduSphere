const mysql = require("mysql2/promise");
const { database } = require("./env");

const pool = mysql.createPool({
  host: database.host,
  port: database.port,
  database: database.name,
  user: database.user,
  password: database.password,
  waitForConnections: true,
  connectionLimit: database.connectionLimit,
  queueLimit: 0,
  charset: "utf8mb4"
});

module.exports = pool;

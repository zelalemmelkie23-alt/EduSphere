require("dotenv").config();

function readPositiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

module.exports = Object.freeze({
  environment: process.env.NODE_ENV || "development",
  port: readPositiveInteger("PORT", 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  sessionCookieName: "edusphere_session",
  secureSessionCookie: process.env.NODE_ENV === "production",
  database: Object.freeze({
    host: process.env.DB_HOST || "127.0.0.1",
    port: readPositiveInteger("DB_PORT", 3036),
    name: process.env.DB_NAME || "school_db",
    user: process.env.DB_USER || "school_app",
    password: process.env.DB_PASSWORD || "",
    connectionLimit: readPositiveInteger("DB_CONNECTION_LIMIT", 10)
  })
});

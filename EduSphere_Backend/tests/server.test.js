const test = require("node:test");
const assert = require("node:assert/strict");
const createApp = require("../Server");

async function startServer(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test("health endpoint reports API and database readiness", async (t) => {
  const url = await startServer(t, createApp({
    database: { query: async () => [[{ ready: 1 }], []] },
    logger: { error() {} }
  }));

  const response = await fetch(`${url}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: "School API is running",
    data: { status: "ok", database: "connected" }
  });
});

test("health endpoint returns an unavailable response when MySQL is down", async (t) => {
  const url = await startServer(t, createApp({
    database: { query: async () => { throw new Error("Connection refused"); } },
    logger: { error() {} }
  }));

  const response = await fetch(`${url}/api/v1/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: "The school database is unavailable."
    }
  });
});

test("unknown API routes return a consistent not-found response", async (t) => {
  const url = await startServer(t, createApp({
    database: { query: async () => [] },
    logger: { error() {} }
  }));

  const response = await fetch(`${url}/api/v1/unknown`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint was not found."
    }
  });
});

test("malformed JSON uses the centralized error response", async (t) => {
  const url = await startServer(t, createApp({
    database: { query: async () => [] },
    logger: { error() {} }
  }));

  const response = await fetch(`${url}/api/v1/unknown`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{"
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "INVALID_JSON",
      message: "The request body contains invalid JSON."
    }
  });
});

test("API responses allow the configured frontend origin", async (t) => {
  const url = await startServer(t, createApp({
    database: { query: async () => [[{ ready: 1 }], []] },
    logger: { error() {} }
  }));

  const response = await fetch(`${url}/api/v1/health`, {
    headers: { origin: "http://localhost:5173" }
  });

  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
});

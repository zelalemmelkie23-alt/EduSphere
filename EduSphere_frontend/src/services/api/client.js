const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1")
  .replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function requestApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const request = { ...options, headers, credentials: "include" };
  if (options.body !== undefined && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    request.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, request);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, "INVALID_RESPONSE", "The API returned an invalid response.");
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error?.code || "REQUEST_FAILED",
      payload.error?.message || `The API returned status ${response.status}.`,
    );
  }
  return payload;
}

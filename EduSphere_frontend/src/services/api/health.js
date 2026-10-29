const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1")
  .replace(/\/+$/, "");

export async function fetchHealth() {
  const response = await fetch(`${apiBaseUrl}/health`);
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("The API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || `The API returned status ${response.status}.`);
  }

  return payload.data;
}

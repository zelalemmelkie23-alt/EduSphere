import { requestApi } from "./client";

export async function fetchHealth() {
  const payload = await requestApi("/health");
  return payload.data;
}

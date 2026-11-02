import { reactive } from "vue";
import { ApiError, requestApi } from "./api/client";

export const authState = reactive({
  user: null,
  initialized: false,
  error: "",
});

let initialization;

export async function initializeAuth() {
  if (authState.initialized) return authState.user;
  if (initialization) return initialization;

  initialization = requestApi("/auth/me")
    .then(({ data }) => {
      authState.user = data.user;
      authState.error = "";
      authState.initialized = true;
      return authState.user;
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        authState.user = null;
        authState.error = "";
        authState.initialized = true;
        return null;
      }
      authState.error = error instanceof Error ? error.message : "Unable to connect to the API.";
      throw error;
    })
    .finally(() => {
      initialization = null;
    });

  return initialization;
}

export async function signIn(email, password) {
  const { data } = await requestApi("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  authState.user = data.user;
  authState.error = "";
  authState.initialized = true;
  return data.user;
}

export async function signOut() {
  try {
    await requestApi("/auth/logout", { method: "POST" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
  authState.user = null;
  authState.initialized = true;
  authState.error = "";
}

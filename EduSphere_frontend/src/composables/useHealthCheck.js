import { ref } from "vue";
import { fetchHealth } from "../services/api/health";

export function useHealthCheck() {
  const databaseStatus = ref("checking");
  const connectionError = ref("");

  async function checkDatabase() {
    databaseStatus.value = "checking";
    connectionError.value = "";

    try {
      const health = await fetchHealth();
      if (health?.status !== "ok" || health?.database !== "connected") {
        throw new Error("The API did not confirm database connectivity.");
      }
      databaseStatus.value = "connected";
    } catch (error) {
      databaseStatus.value = "disconnected";
      connectionError.value = error instanceof Error
        ? error.message
        : "Unable to connect to the API.";
    }
  }

  return { databaseStatus, connectionError, checkDatabase };
}

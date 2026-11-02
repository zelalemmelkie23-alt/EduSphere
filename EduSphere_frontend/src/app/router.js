import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../App.vue";
import HealthPage from "../pages/HealthPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import { authState, initializeAuth } from "../services/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "dashboard", component: DashboardPage, meta: { requiresAuth: true } },
    { path: "/login", name: "login", component: LoginPage, meta: { guestOnly: true } },
    { path: "/health", name: "health", component: HealthPage, meta: { public: true } },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth || to.meta.guestOnly) {
    try {
      await initializeAuth();
    } catch {
      authState.user = null;
    }
  }

  if (to.meta.requiresAuth && !authState.user) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && authState.user) return { name: "dashboard" };
  return true;
});

export default router;

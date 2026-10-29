import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "../App.vue";
import HealthPage from "../pages/HealthPage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "dashboard", component: DashboardPage },
    { path: "/health", name: "health", component: HealthPage },
  ],
});

export default router;

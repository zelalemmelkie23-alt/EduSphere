<script setup>
import { computed, onMounted, ref } from "vue";
import { useHealthCheck } from "../composables/useHealthCheck";

const language = ref("en");
const { databaseStatus, connectionError, checkDatabase } = useHealthCheck();

const copy = {
  en: {
    title: "System health",
    description: "Check that the EduSphere API and its MySQL database are reachable.",
    checking: "Checking API and database…",
    connected: "API and database are connected.",
    disconnected: "The API or database could not be reached.",
    retry: "Check again",
    back: "Back to dashboard",
    language: "Language",
  },
  am: {
    title: "የስርዓት ጤና",
    description: "የEduSphere API እና MySQL ዳታቤዝ መድረስ መቻላቸውን ያረጋግጡ።",
    checking: "API እና ዳታቤዙን በመፈተሽ ላይ…",
    connected: "API እና ዳታቤዙ ተገናኝተዋል።",
    disconnected: "API ወይም ዳታቤዙ ላይ መድረስ አልተቻለም።",
    retry: "እንደገና ይፈትሹ",
    back: "ወደ ዳሽቦርድ ይመለሱ",
    language: "ቋንቋ",
  },
};

const t = computed(() => copy[language.value]);
const statusMessage = computed(() => {
  if (databaseStatus.value === "checking") return t.value.checking;
  return databaseStatus.value === "connected" ? t.value.connected : t.value.disconnected;
});

onMounted(checkDatabase);
</script>

<template>
  <main class="health-page">
    <header class="health-header">
      <a class="health-brand" href="/">EduSphere</a>
      <div class="health-language" role="group" :aria-label="t.language">
        <button :class="{ selected: language === 'en' }" @click="language = 'en'">EN</button>
        <button :class="{ selected: language === 'am' }" @click="language = 'am'">አማ</button>
      </div>
    </header>

    <section class="health-card" aria-live="polite">
      <span class="health-indicator" :class="`status-${databaseStatus}`" aria-hidden="true"></span>
      <p class="health-eyebrow">EDUSPHERE · API V1</p>
      <h1>{{ t.title }}</h1>
      <p class="health-description">{{ t.description }}</p>
      <p class="health-status" :class="`status-${databaseStatus}`">{{ statusMessage }}</p>
      <p v-if="connectionError" class="health-error">{{ connectionError }}</p>
      <button class="health-retry" :disabled="databaseStatus === 'checking'" @click="checkDatabase">
        {{ t.retry }}
      </button>
      <RouterLink class="health-back" to="/">{{ t.back }}</RouterLink>
    </section>
  </main>
</template>

<style>
.health-page { min-height: 100vh; padding: 28px clamp(20px, 6vw, 88px); color: #263248; background: #f5f7fb; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.health-header { display: flex; align-items: center; justify-content: space-between; max-width: 1120px; margin: 0 auto; }
.health-brand { color: #293a70; font-size: 19px; font-weight: 750; text-decoration: none; }
.health-language { display: flex; gap: 5px; padding: 4px; border: 1px solid #e3e7ef; border-radius: 22px; background: #fff; }
.health-language button { border: 0; border-radius: 18px; padding: 6px 10px; color: #667085; background: transparent; cursor: pointer; }
.health-language button.selected { color: #fff; background: #536bd5; }
.health-card { position: relative; max-width: 560px; margin: clamp(72px, 16vh, 150px) auto 0; padding: clamp(28px, 6vw, 52px); border: 1px solid #e8ebf1; border-radius: 18px; background: #fff; box-shadow: 0 18px 50px #25365a0e; }
.health-indicator { display: block; width: 12px; height: 12px; margin-bottom: 26px; border-radius: 50%; background: #8a94a5; }
.health-indicator.status-connected { background: #2fa87b; box-shadow: 0 0 0 5px #e6f7f0; }
.health-indicator.status-disconnected { background: #d65b61; box-shadow: 0 0 0 5px #fff0f0; }
.health-eyebrow { color: #78839a; font-size: 10px; font-weight: 750; letter-spacing: .13em; }
.health-card h1 { margin: 10px 0; color: #28334a; font-size: clamp(27px, 5vw, 36px); }
.health-description { color: #78839a; line-height: 1.65; }
.health-status { margin: 28px 0 8px; color: #78839a; font-weight: 650; }
.health-status.status-connected { color: #21865f; }
.health-status.status-disconnected { color: #ba4148; }
.health-error { color: #ba4148; font-size: 13px; line-height: 1.5; }
.health-retry { margin: 18px 14px 0 0; border: 0; border-radius: 8px; padding: 11px 16px; color: #fff; background: #536bd5; font-weight: 650; cursor: pointer; }
.health-retry:disabled { opacity: .6; cursor: wait; }
.health-back { display: inline-block; margin-top: 18px; color: #536bd5; font-size: 13px; font-weight: 600; text-decoration: none; }
</style>

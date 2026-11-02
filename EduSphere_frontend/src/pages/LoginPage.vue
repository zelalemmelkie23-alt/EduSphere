<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authState, signIn } from "../services/auth";

const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const language = ref("en");
const submitting = ref(false);
const errorMessage = ref("");

const copy = {
  en: {
    brand: "EduSphere",
    eyebrow: "SMART SCHOOL MANAGEMENT",
    title: "Welcome back",
    description: "Sign in to your school workspace.",
    email: "Email address",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    language: "Language",
    required: "Enter your email and password.",
  },
  am: {
    brand: "EduSphere",
    eyebrow: "የስማርት ትምህርት ቤት አስተዳደር",
    title: "እንኳን ደህና መጡ",
    description: "ወደ ትምህርት ቤት የስራ ቦታዎ ይግቡ።",
    email: "ኢሜይል",
    password: "የይለፍ ቃል",
    submit: "ግባ",
    submitting: "በመግባት ላይ…",
    language: "ቋንቋ",
    required: "ኢሜይልዎን እና የይለፍ ቃልዎን ያስገቡ።",
  },
};

const t = computed(() => copy[language.value]);

async function submit() {
  errorMessage.value = "";
  if (!email.value.trim() || !password.value) {
    errorMessage.value = t.value.required;
    return;
  }

  submitting.value = true;
  try {
    await signIn(email.value.trim(), password.value);
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    const isInternalPath = redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.startsWith("/\\");
    await router.replace(isInternalPath ? redirect : "/");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to sign in.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="login-page" :class="{ 'amharic-ui': language === 'am' }">
    <header class="login-header">
      <a class="login-brand" href="/">{{ t.brand }}</a>
      <div class="login-language" role="group" :aria-label="t.language">
        <button type="button" :class="{ selected: language === 'en' }" @click="language = 'en'">EN</button>
        <button type="button" :class="{ selected: language === 'am' }" @click="language = 'am'">አማ</button>
      </div>
    </header>

    <section class="login-card">
      <div class="login-mark" aria-hidden="true">E</div>
      <p class="login-eyebrow">{{ t.eyebrow }}</p>
      <h1>{{ t.title }}</h1>
      <p class="login-description">{{ t.description }}</p>

      <form class="login-form" @submit.prevent="submit">
        <label for="email">{{ t.email }}</label>
        <input id="email" v-model="email" type="email" autocomplete="username" required autofocus />
        <label for="password">{{ t.password }}</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required />
        <p v-if="errorMessage || authState.error" class="login-error" role="alert">
          {{ errorMessage || authState.error }}
        </p>
        <button class="login-submit" type="submit" :disabled="submitting">
          {{ submitting ? t.submitting : t.submit }}
        </button>
      </form>
      <p class="login-security">Your session is protected by a secure, HttpOnly cookie.</p>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; padding: 28px clamp(20px, 6vw, 88px); color: #263248; background: radial-gradient(circle at 50% 30%, #fff 0, #f5f7fb 54%, #eef1f8 100%); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.login-header { display: flex; align-items: center; justify-content: space-between; max-width: 1120px; margin: 0 auto; }
.login-brand { color: #293a70; font-size: 19px; font-weight: 800; text-decoration: none; }
.login-language { display: flex; gap: 5px; padding: 4px; border: 1px solid #e3e7ef; border-radius: 22px; background: #fff; }
.login-language button { border: 0; border-radius: 18px; padding: 6px 10px; color: #667085; background: transparent; cursor: pointer; }
.login-language button.selected { color: #fff; background: #536bd5; }
.login-card { width: min(100%, 430px); margin: clamp(68px, 14vh, 132px) auto 0; padding: clamp(28px, 6vw, 46px); border: 1px solid #e8ebf1; border-radius: 18px; background: #fff; box-shadow: 0 24px 70px #25365a12; }
.login-mark { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 13px; color: white; background: #536bd5; font-size: 22px; font-weight: 800; }
.login-eyebrow { margin: 27px 0 8px; color: #78839a; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
.login-card h1 { margin: 0; color: #28334a; font-size: 30px; }
.login-description { margin: 9px 0 26px; color: #78839a; line-height: 1.6; }
.login-form { display: grid; gap: 10px; }
.login-form label { margin-top: 6px; color: #354158; font-size: 13px; font-weight: 650; }
.login-form input { width: 100%; border: 1px solid #dfe4ed; border-radius: 8px; padding: 12px 13px; color: #263248; background: white; font: inherit; outline: none; }
.login-form input:focus { border-color: #536bd5; box-shadow: 0 0 0 3px #536bd51f; }
.login-submit { margin-top: 12px; border: 0; border-radius: 8px; padding: 13px 16px; color: #fff; background: #536bd5; font: inherit; font-weight: 700; cursor: pointer; }
.login-submit:disabled { opacity: .65; cursor: wait; }
.login-error { margin: 3px 0; color: #b43e48; font-size: 13px; line-height: 1.5; }
.login-security { margin: 21px 0 0; color: #8590a3; font-size: 11px; text-align: center; }
</style>

import { createApp } from 'vue'
import AppShell from './app/AppShell.vue'
import router from './app/router'

createApp(AppShell).use(router).mount('#app')

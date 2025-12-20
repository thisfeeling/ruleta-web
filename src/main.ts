import '@fontsource-variable/orbitron'
import '@/assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'
import axiosPlugin from '@/plugins/axios'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(axiosPlugin)

// Mount the app after all plugins are registered
app.mount('#app')

import '@fontsource-variable/orbitron'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'
import axiosPlugin from '@/plugins/axios'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(axiosPlugin)

app.mount('#app')

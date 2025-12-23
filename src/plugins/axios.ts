import axios from 'axios'
import type { App } from 'vue'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Plugin install function so callers can `app.use(axiosPlugin)` safely
export default {
  install(app: App) {
    // attach as global property and as provided symbol
    app.config.globalProperties.$http = axiosInstance
    app.provide('axios', axiosInstance)
  },
}

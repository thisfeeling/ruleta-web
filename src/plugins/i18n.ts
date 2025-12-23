import { createI18n } from 'vue-i18n'
import esCO from '@/locales/es-CO.json'
import enUS from '@/locales/en-US.json'

export type MessageSchema = typeof esCO

const i18n = createI18n<[MessageSchema], 'es-CO' | 'en-US'>({
  legacy: false, // Use Composition API mode
  locale: 'es-CO', // Default locale
  fallbackLocale: 'en-US',
  messages: {
    'es-CO': esCO,
    'en-US': enUS,
  },
  globalInjection: true,
  missingWarn: false,
  fallbackWarn: false,
})

export default i18n

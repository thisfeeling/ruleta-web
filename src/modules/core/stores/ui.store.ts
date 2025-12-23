import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Modal {
  id: string
  component: string
  props?: Record<string, unknown>
  persistent?: boolean
}

export interface Alert {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  action?: {
    label: string
    callback: () => void
  }
}

export const useUIStore = defineStore('ui', () => {
  const modals = ref<Modal[]>([])
  const alerts = ref<Alert[]>([])
  const isLoading = ref(false)
  const loadingMessage = ref<string>('')

  function openModal(modal: Omit<Modal, 'id'>) {
    const id = `modal-${Date.now()}`
    modals.value.push({ id, ...modal })
    return id
  }

  function closeModal(id: string) {
    const index = modals.value.findIndex((m) => m.id === id)
    if (index !== -1) modals.value.splice(index, 1)
  }

  function closeAllModals() {
    modals.value = []
  }

  function showAlert(alert: Omit<Alert, 'id'>) {
    const id = `alert-${Date.now()}`
    const newAlert: Alert = {
      id,
      ...alert,
      duration: alert.duration ?? 5000,
    }

    alerts.value.push(newAlert)

    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        dismissAlert(id)
      }, newAlert.duration)
    }

    return id
  }

  function dismissAlert(id: string) {
    const index = alerts.value.findIndex((a) => a.id === id)
    if (index !== -1) alerts.value.splice(index, 1)
  }

  function clearAlerts() {
    alerts.value = []
  }

  function startLoading(message = 'Cargando...') {
    isLoading.value = true
    loadingMessage.value = message
  }

  function stopLoading() {
    isLoading.value = false
    loadingMessage.value = ''
  }

  function success(message: string, duration?: number) {
    return showAlert({ type: 'success', message, duration })
  }

  function error(message: string, duration?: number) {
    return showAlert({ type: 'error', message, duration })
  }

  function warning(message: string, duration?: number) {
    return showAlert({ type: 'warning', message, duration })
  }

  function info(message: string, duration?: number) {
    return showAlert({ type: 'info', message, duration })
  }

  return {
    modals,
    alerts,
    isLoading,
    loadingMessage,

    openModal,
    closeModal,
    closeAllModals,

    showAlert,
    dismissAlert,
    clearAlerts,
    success,
    error,
    warning,
    info,

    startLoading,
    stopLoading,
  }
})

import { ref } from 'vue'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export type ActionCtx = { id: number; idx: number }

export interface AlertAction {
  label: string
  class?: string
  /**
   * Handler for the action. If it returns `false` (or resolves to `false`) the alert will NOT be dismissed.
   * Returning `void`/other truthy values will let the alert be dismissed (default behavior).
   */
  onClick?: (ctx?: ActionCtx) => boolean | void | Promise<boolean | void>
}

export interface AlertItem {
  id: number
  type: AlertType
  message: string
  title?: string
  duration: number
  actions: AlertAction[] | null
  closable: boolean
  vertical: boolean
  origin?: string | null
  _timeoutId: ReturnType<typeof setTimeout> | null
  _createdAt: number
  _remaining: number
  _persisted: boolean
}

const alerts = ref<AlertItem[]>([])
let alertId = 0

export function useAlert() {
  type ShowAlertOptions = {
    type?: AlertType
    message?: unknown
    title?: string
    duration?: number
    actions?: AlertAction[] | null
    closable?: boolean
    vertical?: boolean
    origin?: string | null
  }

  const showAlert = ({
    type = 'info',
    message = '',
    title = '',
    duration = 6000,
    actions = null,
    closable = true,
    vertical = false,
    origin = null,
  }: ShowAlertOptions = {}): number => {
    const id = alertId++

    // Normalize message: arrays/objects -> string
    let normalizedMessage = ''
    if (Array.isArray(message)) normalizedMessage = message.join(' ')
    else if (typeof message === 'object' && message !== null) {
      const obj = message as Record<string, unknown>
      if (typeof (obj as { message?: unknown }).message === 'string')
        normalizedMessage = String((obj as { message: string }).message)
      else if (obj.hasOwnProperty('errors')) {
        const errors = (obj as { errors?: unknown }).errors
        normalizedMessage = Array.isArray(errors) ? (errors as unknown[]).join(' ') : String(errors)
      } else normalizedMessage = JSON.stringify(obj)
    } else normalizedMessage = String(message)

    const finalType: AlertType = ['info', 'success', 'warning', 'error'].includes(type as string)
      ? (type as AlertType)
      : 'info'

    const item: AlertItem = {
      id,
      type: finalType,
      message: normalizedMessage,
      title: title || undefined,
      duration: duration ?? 6000,
      actions: actions ?? null,
      closable: closable ?? true,
      vertical: vertical ?? false,
      origin: origin ?? null,
      _timeoutId: null,
      _createdAt: Date.now(),
      _remaining: duration ?? 6000,
      _persisted: false,
    }

    alerts.value.push(item)

    if (item.duration > 0) startAutoDismiss(id)

    return id
  }

  const dismissAlert = (id: number) => {
    const idx = alerts.value.findIndex((a) => a.id === id)
    if (idx !== -1) alerts.value.splice(idx, 1)
  }

  const startAutoDismiss = (id: number) => {
    const a = alerts.value.find((x) => x.id === id)
    if (!a) return
    if (a._persisted || !a.duration || a.duration <= 0) return
    if (a._timeoutId) clearTimeout(a._timeoutId)
    a._createdAt = Date.now()
    a._timeoutId = setTimeout(() => dismissAlert(id), a._remaining)
  }

  const clearAutoDismiss = (id: number) => {
    const a = alerts.value.find((x) => x.id === id)
    if (!a) return
    if (a._timeoutId) {
      clearTimeout(a._timeoutId)
      a._timeoutId = null
    }
  }

  const makePersistent = (id: number) => {
    const a = alerts.value.find((x) => x.id === id)
    if (!a) return
    a._persisted = true
    if (a._timeoutId) {
      clearTimeout(a._timeoutId)
      a._timeoutId = null
    }
    a._remaining = 0
  }

  const pauseAutoDismiss = (id: number) => {
    const a = alerts.value.find((x) => x.id === id)
    if (!a) return
    if (a._timeoutId) {
      const elapsed = Date.now() - a._createdAt
      a._remaining = Math.max(0, (a.duration || 0) - elapsed)
      clearTimeout(a._timeoutId)
      a._timeoutId = null
    }
  }

  const resumeAutoDismiss = (id: number) => {
    const a = alerts.value.find((x) => x.id === id)
    if (!a) return
    if (a._persisted) return
    if (!a._remaining || a._remaining <= 0) return
    a._createdAt = Date.now()
    a._timeoutId = setTimeout(() => dismissAlert(id), a._remaining)
  }

  const clearAlerts = () => (alerts.value = [])

  return {
    alerts,
    showAlert,
    dismissAlert,
    startAutoDismiss,
    clearAutoDismiss,
    pauseAutoDismiss,
    resumeAutoDismiss,
    makePersistent,
    clearAlerts,
  }
}

export function useGlobalAlerts() {
  return {
    alerts,
  }
}

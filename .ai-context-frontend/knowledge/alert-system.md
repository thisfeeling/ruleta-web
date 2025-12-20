# Sistema de Alertas (DaisyUI + Vue) ✅

Este documento describe cómo usar los componentes reutilizables de **Alert** que añadimos a Diverso Web, y presenta las muestras de código convertidas a **TypeScript** para la documentación y uso programático.

---

## 🔧 Componentes

- `src/ui/components/alerts/Alert.vue` — Componente de alerta reutilizable.
  - Props principales:
    - `type` — `'info' | 'success' | 'warning' | 'error'` (por defecto: `info`)
    - `variant` — `'default' | 'dash' | 'outline' | 'soft'` (por defecto: `default`) _[nota: `variant` sólo aplica para uso inline]_
    - `title` — texto opcional
    - `message` — texto principal
    - `vertical` — boolean para usar `alert-vertical sm:alert-horizontal`
    - `closable` — boolean para mostrar botón de cierre (emite `close`)
    - `showIcon` — renderizar icono pequeño
    - Slots: `icon`, `title`, slot por defecto (mensaje), `actions` (botones)

- `src/ui/components/alerts/AlertContainer.vue` — Contenedor de posición fija que renderiza las alertas programáticas desde `useAlert`.
  - Las alertas se teletransportan (`<teleport>`) al `body` y se posicionan en la esquina inferior derecha del viewport con un z-index muy alto para que nunca queden ocultas.

---

## ✨ Composable (API programática)

- `src/modules/core/composables/useAlert.ts` — API programática (documentada aquí en TypeScript):
  - `showAlert({ type, message, title, duration, actions, closable, vertical, origin }): number` → devuelve `id`
    - `type`: **sólo** colores permitidos: `info`, `success`, `warning`, `error`.
    - `variant`: **no** se usa en la API programática. Para estilos alternativos use clases `alert-dash`, `alert-outline`, `alert-soft` en alertas inline.
    - `origin` (opcional): cadenas como `auth`, `forgotten`, `recovery` para añadir clases semánticas (ej. `alert-origin-auth`).
    - `duration`: por defecto `6000` ms. Si `0` ➜ no se auto-destruye.
    - El temporizador de auto-dismiss se pausa cuando el usuario hace hover o focus y se reanuda al mouseleave/blur.
  - `dismissAlert(id: number)` — elimina una alerta por id
  - `clearAlerts()` — limpia todas las alertas
  - `alerts` — arreglo reactivo usado por `AlertContainer`

---

## 💻 Código (TypeScript)

> Ejemplos listos para copiar y pegar en la documentación o en el repo.

### `src/modules/core/composables/useAlert.ts`

```ts
// src/modules/core/composables/useAlert.ts
import { ref } from 'vue'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface AlertAction {
  label: string
  class?: string
  onClick?: (ctx?: { id: number; idx: number }) => void
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
  const showAlert = ({
    type = 'info',
    message = '',
    title = '',
    duration = 6000,
    actions = null,
    closable = true,
    vertical = false,
    origin = null,
  }: Partial<
    Pick<
      AlertItem,
      'type' | 'message' | 'title' | 'duration' | 'actions' | 'closable' | 'vertical' | 'origin'
    >
  > = {}): number => {
    const id = alertId++

    // Normaliza mensajes: arrays/objetos -> string
    let normalizedMessage = message
    if (Array.isArray(normalizedMessage)) normalizedMessage = normalizedMessage.join(' ')
    else if (typeof normalizedMessage === 'object' && normalizedMessage !== null) {
      if ((normalizedMessage as any).message)
        normalizedMessage = String((normalizedMessage as any).message)
      else if ((normalizedMessage as any).errors)
        normalizedMessage = Array.isArray((normalizedMessage as any).errors)
          ? (normalizedMessage as any).errors.join(' ')
          : String((normalizedMessage as any).errors)
      else normalizedMessage = JSON.stringify(normalizedMessage)
    } else normalizedMessage = String(normalizedMessage)

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
```

---

### `src/ui/components/alerts/Alert.vue` (script setup en TypeScript)

```vue
<script setup lang="ts">
import { useAttrs } from 'vue'

const props = defineProps<{
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message?: string
  vertical?: boolean
  closable?: boolean
  showIcon?: boolean
  role?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'pause'): void
  (e: 'resume'): void
}>()

const attrs = useAttrs()

function close() {
  emit('close')
}
function onPause() {
  emit('pause')
}
function onResume() {
  emit('resume')
}
</script>
```

> El template y estilos no necesitan cambios para TypeScript.

---

### `src/ui/components/alerts/AlertContainer.vue` (script setup en TypeScript)

```vue
<script setup lang="ts">
import { useAlert, useGlobalAlerts } from '@/modules/core/composables/useAlert'
import Alert from '@/ui/components/alerts/Alert.vue'

const { dismissAlert, pauseAutoDismiss, resumeAutoDismiss } = useAlert()
const { alerts } = useGlobalAlerts()

type ActionButton = { label: string; class?: string; onClick?: (ctx?: any) => void }

function onAction(id: number, idx: number, btn?: ActionButton) {
  if (btn && typeof btn.onClick === 'function') btn.onClick({ id, idx })
  dismissAlert(id)
}

const onPause = (id: number) => pauseAutoDismiss(id)
const onResume = (id: number) => resumeAutoDismiss(id)
</script>
```

---

## 🎨 Estilos y temas

Las alertas usan variables de tema de DaisyUI (`--color-info`, `--color-success`, ...). Existen tres variantes útiles (definidas en `src/assets/main.css`):

- `alert-dash` — borde izquierdo tipo dash con el color correspondiente
- `alert-outline` — fondo transparente y borde coloreado
- `alert-soft` — fondo suave usando `color-mix`

**Espaciado entre alertas**: el contenedor global ahora usa una separación vertical mayor (Tailwind `gap-6`) para evitar que las alertas queden muy pegadas; esto mejora la legibilidad cuando varias alertas aparecen simultáneamente. Además, el contenedor ahora usa un offset mayor desde el borde inferior (`bottom-20`), `pb-10` y `gap-10` para evitar solapamientos con botones inferiores. En móviles el offset aumenta a `calc(4rem + env(safe-area-inset-bottom))` para respetar controles y barras del sistema. Además cada alerta tiene `margin-block-end: 0.75rem` para mantener separación incluso durante las animaciones de entrada/salida. Si aún las ves muy cerca en tu dispositivo, dime el tamaño de pantalla o prefieres valores aún mayores y lo ajusto.

**Actions (botones de acción)**: cada alerta puede incluir una lista de `actions` con la forma `{ label: string, class?: string, onClick?: (ctx?: ActionCtx) => boolean | void | Promise<boolean | void> }`.

- Cuando el usuario hace clic en una acción, se ejecuta `onClick({ id, idx })` si está presente. Si la función devuelve `false` (o resuelve a `false` en caso de ser `async`) la alerta **no** se cerrará automáticamente — esto permite, por ejemplo, validaciones o confirmations en el handler.
- Si `onClick` devuelve `undefined` o cualquier otro valor distinto de `false` (o no existe), la alerta se cerrará automáticamente después del clic (comportamiento por defecto).

Ejemplo para evitar que la alerta se cierre automáticamente:

```ts
showAlert({
  type: 'warning',
  message: '¿Estás seguro?',
  duration: 0,
  actions: [
    {
      label: 'Cancelar',
      onClick: () => false, // evita el dismiss
    },
    {
      label: 'Aceptar',
      class: 'btn btn-xs btn-primary',
      onClick: async () => {
        await doSomething()
        return true // permitirá el dismiss
      },
    },
  ],
})
```

> Nota: Las clases `alert-dash`, `alert-outline` y `alert-soft` siguen disponibles para _markup inline_ (por ejemplo, alertas dentro de un modal). La API programática **no** acepta `variant` y se debe usar `class` si necesita una de estas apariencias inline.

---

## ♿ Accesibilidad

Las alertas usan `role="alert"` por defecto; `Alert` es compatible con lectores de pantalla y emite `close` al ser cerrada.

---

## 📦 Ejemplos de uso

Inline (JSX/Vue template):

```vue
<Alert type="success" class="alert-dash" title="Perfecto" message="Operación exitosa" />
```

Programático (TypeScript):

```ts
import { useAlert } from '@/composables/useAlert'
const { showAlert } = useAlert()

showAlert({
  type: 'warning',
  message: 'Usamos cookies para nada',
  actions: [
    { label: 'Denegar' },
    {
      label: 'Aceptar',
      class: 'btn btn-xs btn-primary',
      onClick: () => console.log('accepted'),
    },
  ],
  duration: 6000, // 6s por defecto si se omite
})
```

---

Si quieres que además convierta los archivos reales del repo (`useAlert.js` → `useAlert.ts`) y ajuste imports en los componentes para usar la versión TypeScript, dímelo y lo hago en el código fuente. ✅

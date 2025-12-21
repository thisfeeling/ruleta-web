<template>
  <teleport to="body">
    <div
      class="alert-overlay fixed bottom-20 right-4 flex flex-col gap-10 max-w-sm pb-10"
      style="z-index: 9999999"
    >
      <transition-group name="alert" tag="div">
        <Alert
          v-for="a in alerts"
          :key="a.id"
          :class="a.origin ? 'alert-origin-' + a.origin : ''"
          :type="a.type"
          :message="a.message"
          :title="a.title"
          :closable="true"
          :vertical="a.vertical"
          @close="dismissAlert(a.id)"
          @pause="onPause(a.id)"
          @resume="onResume(a.id)"
        >
          <template #actions>
            <div v-if="a.actions" class="flex gap-2">
              <button
                v-for="(btn, idx) in a.actions"
                :key="idx"
                @click="onAction(a.id, idx, btn)"
                :class="btn.class || 'btn btn-xs btn-ghost'"
              >
                {{ btn.label }}
              </button>
            </div>
          </template>
        </Alert>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { useAlert, useGlobalAlerts } from '@/modules/core/composables/useAlert'
import Alert from '@/ui/components/alerts/AlertItem.vue'

const { dismissAlert, pauseAutoDismiss, resumeAutoDismiss } = useAlert()
const { alerts } = useGlobalAlerts()

import type { ActionCtx, AlertAction } from '@/modules/core/composables/useAlert'

type ActionButton = AlertAction

const onAction = async (id: number, idx: number, btn?: ActionButton) => {
  if (!btn) return dismissAlert(id)
  if (typeof btn.onClick === 'function') {
    try {
      const res = btn.onClick({ id, idx } as ActionCtx)
      // handle promise or sync return
      const shouldDismiss = await Promise.resolve(res).then((val) => val !== false)
      if (shouldDismiss) dismissAlert(id)
      return
    } catch {
      // swallow errors from handlers but dismiss by default
      dismissAlert(id)
      return
    }
  }
  // default: dismiss
  dismissAlert(id)
}

const onPause = (id: number) => {
  pauseAutoDismiss(id)
}

const onResume = (id: number) => {
  resumeAutoDismiss(id)
}
</script>

<style scoped>
/* Small responsive container */
@media (max-width: 768px) {
  .alert-overlay {
    left: 1rem;
    right: 1rem;
    /* Add extra offset on mobile to avoid overlapping bottom controls */
    bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
  }
}

/* Alert transitions */
.alert-enter-active,
.alert-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.2, 0.9, 0.2, 1),
    opacity 0.28s ease;
}

.alert-enter-from,
.alert-leave-to {
  transform: translateX(12px) scale(0.98);
  opacity: 0;
}

.alert-enter-to,
.alert-leave-from {
  transform: translateX(0) scale(1);
  opacity: 1;
}

/* Stagger children for a nicer effect */
.alert-enter-active > * {
  transition-delay: 0.05s;
}

.alert-leave-active {
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

/* Ensure overlay is above everything and does not get clipped */
.alert-overlay {
  pointer-events: none;
  /* container should not block interactions */
  /* Respect safe-area insets (iOS home indicator, etc.) */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.alert-overlay > * {
  pointer-events: auto;
  /* each alert can be interactive */
}

/* Safety: ensure huge z-index above modals (inline style handles this now) */
</style>

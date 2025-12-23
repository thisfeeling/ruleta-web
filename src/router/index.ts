import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/modules/core/stores/auth.store'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/reconnect',
    name: 'reconnect',
    component: () => import('@/modules/player/ReconnectView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('@/views/LobbyView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/views/GameView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/millionaire',
    name: 'millionaire',
    component: () => import('@/modules/games/millionaire/MillionaireScene.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/rope',
    name: 'rope',
    component: () => import('@/modules/games/rope/RopeScene.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/spell',
    name: 'spell',
    component: () => import('@/modules/games/spell/SpellScene.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/roulette',
    name: 'roulette',
    component: () => import('@/modules/games/roulette/RouletteScene.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/word-search',
    name: 'word-search',
    component: () => import('@/modules/games/word-search/WordSearchScene.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/flappy',
    name: 'flappy',
    component: () => import('@/modules/games/flappy/FlappyScene.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/supervisor',
    name: 'supervisor',
    component: () => import('@/views/SupervisorView.vue'),
    meta: { requiresAuth: true, requiresSupervisor: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Check if route requires auth
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.warn('[Router] Auth required, redirecting to home')
    return next({ name: 'home' })
  }

  // Check if route requires supervisor
  if (to.meta.requiresSupervisor && !authStore.isSupervisor) {
    console.warn('[Router] Supervisor required, redirecting to lobby')
    return next({ name: 'lobby' })
  }

  next()
})

export default router

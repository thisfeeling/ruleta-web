# 01 - Project Setup & Configuration

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Configuración inicial del proyecto Vue 3 con Vite, TypeScript, y todas las dependencias necesarias para el game show.

---

## 🎯 Objectives

- [x] Inicializar proyecto Vue 3 + TypeScript + Vite
- [x] Configurar estructura de carpetas modular
- [x] Instalar y configurar dependencias principales
- [x] Configurar herramientas de desarrollo (ESLint, Prettier, Vitest)
- [x] Configurar Tailwind CSS + DaisyUI
- [x] Configurar path aliases (@/)

---

## 📦 Dependencies to Install

### Core Dependencies

Node.js v20.19.5+ and Npm v11.6.3+ are required.

```bash
# Core framework
npm create vue@latest

# options 

✔ Project name: … ruleta-web
✔ Add TypeScript? … Yes
✔ Add JSX Support? …  Yes 
✔ Add Vue Router for Single Page Application development? … Yes
✔ Add Pinia for state management? … Yes
✔ Add Vitest for Unit testing? …  Yes
✔ Add an End-to-End Testing Solution? … Yes / Playwright
✔ Add ESLint for code quality? … Yes
✔ Add Prettier for code formatting? … Yes

Scaffolding project in ./<your-project-name>...
Done.

# HTTP client
npm add axios

# WebSocket
npm add laravel-echo

# i18n
npm install vue-i18n@11

# Audio
# (No external dependencies, using Web Audio API)
```

### 3D/2D & Game Dependencies

```bash
# Tres.js Three.js ecosystem
npm install @tresjs/core three

# types for Three.js
npm install @types/three -D


# vite.config.ts

import { templateCompilerOptions } from '@tresjs/core'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      // Other config
      ...templateCompilerOptions
    }),
  ],
})


# Phaser (for Flappy Bird)
npm i phaser
```

### UI Dependencies

```bash
# Tailwind + DaisyUI
npm install tailwindcss @tailwindcss/vite

# Icons (optional)
npm install lucide-vue-next
```


---

## 📁 Folder Structure to Create (incomplete) for more info in implements section/what info wants.

```
src/
├── assets/
│   ├── audio/
│   │   ├── music/         # Background themes
│   │   ├── voices/        # TTS narrations
│   │   └── sfx/           # Sound effects
│   │       ├── ui/
│   │       ├── rope/
│   │       ├── bomb/
│   │       ├── roulette/
│   │       └── results/
│   ├── images/
│   │   ├── icons/
│   │   └── backgrounds/
│   └── styles/
│       ├── base.css
│       └── main.css
│
├── locales/
│   ├── en-US.json
│   └── es-CO.json
│
├── modules/
│   ├── core/
│   │   ├── composables/
│   │   ├── services/
│   │   ├── stores/
│   │   └── utils/
│   ├── game/
│   │   ├── engine/
│   │   ├── scenes/
│   │   ├── scoreboard/
│   │   └── stores/
│   ├── games/
│   │   ├── millionaire/
│   │   ├── rope/
│   │   ├── spell/
│   │   ├── roulette/
│   │   ├── word-search/
│   │   └── flappy/
│   ├── player/
│   ├── supervisor/
│   └── chat/
│
├── plugins/
│   ├── axios.ts
│   ├── pinia.ts
│   └── i18n.ts
│
├── router/
│   └── index.ts
│
├── ui/
│   ├── components/
│   │   ├── alerts/
│   │   ├── buttons/
│   │   ├── forms/
│   │   ├── hud/
│   │   ├── modals/
│   │   └── screens/
│   └── layouts/
│       ├── DefaultLayout.vue
│       └── GameLayout.vue
│
├── views/
│   ├── HomeView.vue
│   ├── LobbyView.vue
│   ├── GameView.vue
│   └── SupervisorView.vue
│
├── App.vue
└── main.ts
```

---

## ⚙️ Configuration Files

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/broadcasting': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["node_modules"]
}
```

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['dark', 'light'],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
}
```

### `.env` (example)

```env
VITE_APP_NAME=
VITE_APP_ENV=
VITE_BASE_URL=
VITE_API_URL=
VITE_REVERB_SCHEME=
VITE_REVERB_APP_KEY=
VITE_REVERB_HOST=
VITE_REVERB_PORT=
VITE_ELEVENLABS_API_KEY=
VITE_GITHUB_BACKEND_REPO_URL=
VITE_GITHUB_FRONTEND_REPO_URL=
```

---

## 📝 Implementation Steps

### Step 1: Initialize Project

```bash
npm create vite@latest ruleta-web --template vue-ts
cd ruleta-web
npm install
```

### Step 2: Install All Dependencies

```bash
# Run all pnpm add commands listed above
```

### Step 3: Create Folder Structure

```bash
# Create all folders from structure above
mkdir -p src/{assets/{audio/{music,voices,sfx/{ui,rope,bomb,roulette,results}},images/{icons,backgrounds},styles},locales,modules/{core/{composables,services,stores,utils},game/{engine,scenes,scoreboard,stores},games/{millionaire,rope,spell,roulette,word-search,flappy},player,supervisor,chat},plugins,router,ui/{components/{alerts,buttons,forms,hud,modals,screens},layouts},views}
```

### Step 4: Configure Path Aliases

- Update `vite.config.ts` with @ alias
- Update `tsconfig.json` with paths mapping
- Verify imports work: `import { X } from '@/modules/core/...'`

### Step 5: Configure Tailwind + DaisyUI

```bash
npx tailwindcss init -p
```

- Update `tailwind.config.js` with DaisyUI plugin
- Create `src/assets/styles/main.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom base styles */
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-base-100 text-base-content;
  }
}
```

- Import in `main.ts`: `import '@/assets/styles/main.css'`

### Step 6: Configure ESLint + Prettier

Create `.eslintrc.cjs`:

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
```

Create `.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Step 7: Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

### Step 8: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "e2e": "playwright test",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "format": "prettier --write src/"
  }
}
```

### Step 9: Verify Setup

```bash
npm run dev  # Should start dev server at localhost:5173
npm run lint # Should run without errors
npm run format # Should run formatting without errors
```

---

## ✅ Acceptance Criteria

- [x] Dev server runs on port 5173
- [x] TypeScript compiles without errors
- [x] @ path alias resolves correctly
- [x] Tailwind + DaisyUI classes work
- [x] ESLint + Prettier configured
- [x] Vitest + Playwright installed
- [x] All folders created
- [x] .env configured
- [x] Hot Module Replacement (HMR) works

---

## 🔗 Related Files

- `vite.config.ts`
- `tsconfig.json`
- `tailwind.config.js`
- `package.json`
- `.eslintrc.cjs`
- `.prettierrc.json`

---

## 📚 References

- [Vue 3 Docs](https://vuejs.org)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [DaisyUI](https://daisyui.com)
- [Vitest](https://vitest.dev)

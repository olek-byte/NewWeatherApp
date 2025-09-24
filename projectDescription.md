# Project Description: Vue Weather App with AI Advisor

This document describes the project structure and a step‑by‑step guide to build this app from scratch: a Vue 3 + TypeScript weather application with OpenWeatherMap integration, city search with autocomplete, caching, robust error handling, and an optional AI Advisor powered by Google Gemini (and optionally OpenAI) via a dev proxy.

## 1) Tech Stack
- Framework: Vue 3 (Composition API)
- Language: TypeScript
- Bundler: Vite
- Router: Vue Router 4
- Styling: SCSS + Bootstrap 5
- HTTP: Axios (for OWM/Geo); native fetch for AI
- Linting: ESLint + Prettier
- AI: Gemini (default) and OpenAI via Vite dev proxy

## 2) Directory Structure (high level)
```
weatherApp/
├─ src/
│  ├─ api/
│  │  ├─ http.ts              # Axios instance for OpenWeatherMap
│  │  ├─ weather.ts           # Weather API calls
│  │  ├─ geo.ts               # Geo (city search) API calls
│  │  ├─ ai.ts                # OpenAI helper (optional)
│  │  └─ aiGemini.ts          # Gemini helper (default)
│  ├─ components/
│  │  ├─ HomeSearch.vue       # Search with autocomplete + recent
│  │  ├─ ErrorDisplay.vue     # Consistent error rendering
│  │  └─ AIAdvisorModal.vue   # Minimal AI modal (US English + Russian)
│  ├─ views/
│  │  └─ WeatherDetails.vue   # Weather screen + forecast + AI modal trigger
│  ├─ router/
│  │  └─ index.ts             # Routes configuration
│  ├─ types/                  # Type definitions for app/APIs
│  ├─ utils/                  # Caching, request manager, prompts
│  │  ├─ weatherCache.ts
│  │  ├─ requestManager.ts
│  │  ├─ errorHandler.ts
│  │  └─ aiPromptGenerator.ts
│  ├─ styles/                 # SCSS setup
│  ├─ main.ts                 # App bootstrap
│  └─ App.vue                 # Root view
├─ vite.config.ts             # Aliases and dev proxies for AI
├─ README.md                  # Usage docs
└─ projectDescription.md      # This document
```

## 3) Step‑by‑Step: Create the App

### Step 0. Prerequisites
- Node.js >= 18
- npm >= 9
- API keys: OpenWeatherMap (required), Gemini (recommended), OpenAI (optional)

### Step 1. Scaffold the Project
```bash
npm create vite@latest weatherApp -- --template vue-ts
cd weatherApp
npm i
```

### Step 2. Install Dependencies
```bash
npm i axios bootstrap
npm i -D sass eslint eslint-plugin-vue @vue/eslint-config-typescript @vue/eslint-config-prettier prettier
```

### Step 3. Global Styles
- Add Bootstrap and custom SCSS in `src/styles/`.
- Import in `App.vue` or `main.ts` as needed.

### Step 4. Routing
- Create `src/router/index.ts` with routes for:
  - `home` (search page)
  - `weather` (details with query `lat`, `lon`, `name`)
- Mount `router` in `main.ts`.

### Step 5. OpenWeatherMap Client
- `src/api/http.ts`: Axios instance with base URL and default params (`appid`, `units: 'metric'`).
- `src/api/weather.ts`: functions `getCurrentWeatherByCoords`, `getBriefForecastByCoords`.
- `src/api/geo.ts`: function `searchCities` for autocomplete.
- Types in `src/types/` for both API layers.

### Step 6. City Search Component
- `src/components/HomeSearch.vue` implements:
  - Reactive input with debounce
  - `RequestManager` to cancel in‑flight requests
  - Cache of recent queries (localStorage)
  - Dropdown with keyboard navigation (ARIA)
  - On select: `router.push({ name: 'weather', query: { lat, lon, name } })`

### Step 7. Weather Details View
- `src/views/WeatherDetails.vue` implements:
  - Reading `lat`, `lon`, `name` from route
  - Loading current weather + compact 4‑point forecast
  - `weatherCache` usage to avoid redundant API calls
  - Skeletons for loading state
  - `ErrorDisplay` for unified error UX
  - Button to open the AI modal

### Step 8. Caching and Reliability
- `src/utils/weatherCache.ts`:
  - In‑memory map with timestamps for (lat, lon) pairs
  - Methods: `has`, `get`, `set`, `cleanup`
- `src/utils/requestManager.ts`:
  - Throttle/debounce wrapper with automatic cancellation via `AbortController`
  - Used by city search to reduce API pressure
- `src/utils/errorHandler.ts`:
  - Converts Axios/fetch errors to user‑friendly messages

### Step 9. AI Prompt Generator
- `src/utils/aiPromptGenerator.ts`:
  - `AIPromptGenerator.generateWeatherAdvicePrompt(weather, forecast?)`
  - `getQuickPrompts(weather)` (kept for reuse)
  - All methods static; no `this` dependency in exported functions

### Step 10. Dev Proxies for AI
- In `vite.config.ts` add:
  - Alias `@` → `/src`
  - Proxy `/proxy/gemini/*` → `https://generativelanguage.googleapis.com/*` with header `x-goog-api-key`
  - Proxy `/proxy/openai/*` → `https://api.openai.com/*` with header `Authorization: Bearer ...`
- Proxies read keys from `.env.local` via `loadEnv`.

`.env.local` example:
```env
VITE_OWM_API_KEY=your_openweathermap_api_key
GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=sk-...
```

### Step 11. AI Client Helpers
- `src/api/aiGemini.ts` (default):
  - Endpoint: `/proxy/gemini/v1beta/models/gemini-1.5-flash:generateContent`
  - Sends `responseMimeType: 'application/json'` and `responseSchema` to enforce `{ en, ru }`
  - Parses the JSON; provides fallbacks for edge cases
- `src/api/ai.ts` (optional OpenAI):
  - Endpoint: `/proxy/openai/v1/chat/completions`
  - Includes retries/backoff for 429/5xx

### Step 12. AI Modal
- `src/components/AIAdvisorModal.vue`:
  - Props: `isOpen`, `weather`, `forecast?`
  - On open: builds prompt via `AIPromptGenerator` and calls `requestGeminiAdvice`
  - Shows two blocks: `US English` and `RU Русский`
  - Actions: Copy / Generate again
  - Resilience: cancellation via `AbortController`, debouncing duplicate calls

### Step 13. Wiring in the View
- In `WeatherDetails.vue`:
  - Compute `weatherContext` and `forecastContext`
  - Toggle `showAIModal` from button; pass contexts to modal

### Step 14. Linting & Formatting
```bash
npm run lint
npm run format
```

### Step 15. Build & Preview
```bash
npm run build
npm run preview
```

## 4) Data Flow Overview
- Search flow: `HomeSearch.vue` → `searchCities()` (debounced) → show list → navigate to `weather`.
- Weather flow: `WeatherDetails.vue` loads data via `weather.ts`, consults `weatherCache`, and renders UI → forecasts.
- AI flow: `AIAdvisorModal.vue` uses `aiPromptGenerator.ts` to create a compact prompt → `aiGemini.ts` → proxy → Gemini → JSON `{ en, ru }` → display.

## 5) Environment & Security Notes
- Dev proxies ensure API keys are attached server‑side in the Vite dev server and are not exposed in compiled client code.
- For production deployments, use a small backend or serverless function instead of Vite’s proxy.

## 6) Troubleshooting
- 401/403 (Gemini): invalid/missing `GEMINI_API_KEY`. Restart dev server after editing `.env.local`.
- 429 (rate limits): try again later; the client limits burst and retries.
- OpenAI `insufficient_quota`: recharge account or switch to Gemini.
- Empty AI blocks: ensure provider returns valid JSON; the client attempts normalization.

## 7) Possible Enhancements
- Persistent cache across sessions (IndexedDB) with TTL
- Unit tests for utils (prompt generator, cache, request manager)
- i18n for the UI
- More AI features: multi‑city comparisons, activity‑specific prompts
- Accessibility pass for AI modal (focus trap)

---
This guide reflects the current implementation in the repository and can be followed to recreate or extend the project.

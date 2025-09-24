# ☀️ Vue Weather App

A modern, responsive weather application built with Vue 3, TypeScript, and the OpenWeatherMap API. Features real-time weather data, city search with autocomplete, a minimal AI weather advisor (Gemini/OpenAI via dev proxy), and a clean, intuitive interface.

## ✨ Features

- 🔍 **Smart City Search**: Autocomplete search with recent searches functionality
- 🌤️ **Current Weather**: Real-time weather data including temperature, humidity, wind speed, and pressure
- 📅 **Weather Forecast**: Brief 4-day weather forecast with daily high/low temperatures
- 💾 **Local Storage**: Remembers your recent city searches
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **Fast Performance**: Built with Vite for lightning-fast development and optimized builds
- 🎨 **Modern UI**: Clean interface using Bootstrap 5 and custom SCSS
- 🤖 **AI Advisor**: Contextual weather tips in US English and Russian (Gemini by default)

## 🛠️ Tech Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: SCSS + Bootstrap 5
- **HTTP Client**: Axios
- **Routing**: Vue Router 4
- **API**: OpenWeatherMap API
- **AI**: Google Gemini (AI Studio) via dev proxy, optional OpenAI
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- OpenWeatherMap API key
- (Optional) Google Gemini API key (recommended)
- (Optional) OpenAI API key

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd weatherApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory and add your API keys:

```env
VITE_OWM_API_KEY=your_openweathermap_api_key_here

# AI providers (use one or both). Gemini is used by default in the app.
GEMINI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=sk-...
```

**Getting an API Key:**
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Navigate to the API keys section
3. Generate a new API key
4. Add it to your `.env.local` file

### 4. Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port if 5173 is occupied). The dev server exposes proxies:

- `GET/POST /proxy/gemini/*` → `https://generativelanguage.googleapis.com/*` (header `x-goog-api-key` from `.env.local`)
- `GET/POST /proxy/openai/*` → `https://api.openai.com/*` (header `Authorization: Bearer <OPENAI_API_KEY>`) 

### 5. Production Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 📂 Project Structure

```
src/
├── api/                 # API layer
│   ├── http.ts         # Axios configuration
│   ├── weather.ts      # Weather API endpoints
│   └── geo.ts          # Geocoding API endpoints
│   ├── ai.ts           # OpenAI helper (via dev proxy)
│   └── aiGemini.ts     # Gemini helper (via dev proxy, default)
├── components/         # Vue components
│   ├── HomeSearch.vue        # City search component
│   └── AIAdvisorModal.vue    # Minimal AI modal (US English + Russian)
├── views/             # Page views
│   └── WeatherDetails.vue # Weather details page
├── router/            # Vue Router configuration
│   └── index.ts
├── types/             # TypeScript type definitions
│   ├── weather.ts     # Weather API types
│   └── geo.ts         # Geocoding types
├── styles/            # SCSS stylesheets
│   ├── main.scss      # Main styles and resets
│   ├── _globals.scss  # Global variables
│   └── _mixins.scss   # SCSS mixins
├── mocks/             # Mock data for development
│   └── geo.mock.ts    # Mock geocoding data
├── App.vue            # Root component
└── main.ts            # Application entry point
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (includes type checking)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with maximum 0 warnings
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

## 🌐 API Integration

The application integrates with OpenWeatherMap API using three main endpoints:

### Current Weather
- **Endpoint**: `/data/2.5/weather`
- **Purpose**: Get current weather conditions for specific coordinates
- **Data**: Temperature, humidity, wind speed, pressure, weather description

### Geocoding
- **Endpoint**: `/geo/1.0/direct`
- **Purpose**: Search for cities by name and get coordinates
- **Features**: Supports autocomplete suggestions with country/state information

### Weather Forecast
- **Endpoint**: `/data/2.5/forecast`
- **Purpose**: Get 5-day weather forecast with 3-hour intervals
- **Features**: Aggregated into daily summaries with min/max temperatures

## 🎯 Key Features Deep Dive

### Smart Search Component (`HomeSearch.vue`)
- **Debounced Input**: 350ms delay to reduce API calls
- **Autocomplete**: Real-time city suggestions with keyboard navigation
- **Recent Searches**: Stores last 5 searched cities in localStorage
- **Error Handling**: Graceful handling of network issues and request cancellation
- **Accessibility**: Full ARIA support and keyboard navigation

### Weather Display (`WeatherDetails.vue`)
- **Current Conditions**: Temperature, description, and weather icon
- **Detailed Metrics**: Wind speed, humidity, pressure (displayed in both hPa and mmHg)
- **Forecast Cards**: 4-day forecast with weather icons and temperature ranges
- **Responsive Layout**: Adapts to different screen sizes

### AI Advisor (`AIAdvisorModal.vue`)
- **Provider**: Gemini by default (`src/api/aiGemini.ts`). You can switch to OpenAI by replacing the import in `AIAdvisorModal.vue`.
- **Prompts**: Generated from current weather and short forecast using `src/utils/aiPromptGenerator.ts`.
- **Output**: Two short texts — `US English` and `RU Русский`.
- **UX**: Copy to clipboard, regenerate with spinner, request cancellation and deduplication.

#### Switch provider (optional)
- Use Gemini (default): ensure `GEMINI_API_KEY` is set. Nothing else required.
- Use OpenAI: ensure `OPENAI_API_KEY` is set; change import in `AIAdvisorModal.vue` to `requestAIAdvice` from `src/api/ai.ts`.

### Performance Optimizations
- **Request Cancellation**: Aborts previous requests when new ones are made using AbortController
- **Caching**: Session-based caching for search results to reduce API calls
- **Lazy Loading**: Components loaded on demand with Vue Router
- **Optimized Icons**: Uses OpenWeatherMap's optimized weather icons

## 🔒 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_OWM_API_KEY` | OpenWeatherMap API key | Yes | `abc123...` |
| `GEMINI_API_KEY` | Google AI Studio (Gemini) API key | Optional | `AIza...` |
| `OPENAI_API_KEY` | OpenAI API key | Optional | `sk-...` |

**Note**: After creating or modifying `.env.local`, restart the development server to apply changes.

Security note: keys are injected only into the Vite dev proxy and are not exposed to client code. For production deployments use a backend or serverless function instead of the dev proxy.

## 🏗️ Architecture

### Component Architecture
- **App.vue**: Root component with router outlet
- **HomeSearch.vue**: Handles city search with autocomplete
- **WeatherDetails.vue**: Displays weather information and forecast

### State Management
- Uses Vue 3 Composition API with `ref()` and `computed()`
- Local state management (no external store needed)
- localStorage for persisting recent searches

### API Layer
- Centralized HTTP client configuration in `api/http.ts`
- Separate modules for different API concerns
- Type-safe API responses with TypeScript interfaces

### Styling
- SCSS with global variables and mixins
- Bootstrap 5 for responsive grid and utilities
- Custom styles for weather-specific components

## 🌍 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🧪 Development Notes

### Mock Data
The project includes mock data in `src/mocks/geo.mock.ts` for development and testing purposes. The geo API module contains commented code to switch between real API and mock data.

### TypeScript Configuration
- Strict TypeScript configuration for better code quality
- Path aliases configured for clean imports (`@/` points to `src/`)
- Separate configs for app and node environments

### Code Quality
- ESLint with Vue 3, TypeScript, and Prettier rules
- Maximum 0 warnings policy for production builds
- Automatic formatting on save (if configured in IDE)

## ❗ Troubleshooting

- 429 Too Many Requests (OpenAI/Gemini): wait and try again; the client has limited retries and backoff. Reduce click frequency.
- OpenAI `insufficient_quota`: add funds or use Gemini key.
- 401/403 from Gemini: re-check `GEMINI_API_KEY`, restart dev server.
- Empty AI text: make sure the provider returned valid JSON; the client attempts to normalize responses.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and conventions
- Add TypeScript types for new interfaces
- Test your changes on different screen sizes
- Ensure all linting passes before committing

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenWeatherMap](https://openweathermap.org/) for providing the weather API
- [Google AI Studio](https://ai.google.dev/) for Gemini API
- [Vue.js](https://vuejs.org/) for the amazing framework
- [Bootstrap](https://getbootstrap.com/) for the responsive design system
- [Vite](https://vitejs.dev/) for the fast build tool
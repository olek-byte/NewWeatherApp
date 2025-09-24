<template>
  <div class="container py-4 weather-details">
    <button class="btn btn-link mb-3 p-0 weather-details__back-btn" @click="goBack">← Назад к поиску</button>

    <div class="u-card p-3">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h1 class="h5 m-0">
          Погода: {{ data?.city || name || '—' }}
        </h1>
        <div class="d-flex align-items-center gap-2">
          <span v-if="loading" class="text-muted">Загрузка…</span>
          <span v-else-if="isDataFromCache && data" class="badge bg-success-subtle text-success-emphasis" title="Данные загружены из кэша">
            📱 Из кэша
          </span>
          <button 
            v-if="!loading"
            class="btn btn-outline-primary btn-sm weather-refresh-btn" 
            @click="refreshData"
            :disabled="loading"
            title="Обновить данные"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            Обновить
          </button>
          
          <button 
            v-if="canUseAIAdvisor"
            class="btn btn-outline-success btn-sm ai-advice-btn" 
            @click="openAIAdvisor"
            :disabled="isLoadingAIAdvice"
            title="Получить AI совет по погоде"
          >
            <span v-if="isLoadingAIAdvice" class="spinner-border spinner-border-sm me-1"></span>
            <span v-else class="me-1">🤖</span>
            {{ isLoadingAIAdvice ? 'AI думает...' : 'AI совет' }}
          </button>
        </div>
      </div>

      <ErrorDisplay
        v-if="error"
        :error="error"
        operation="get-weather"
        :can-retry="true"
        :show-details="true"
        @retry="refreshData"
        @dismiss="error = ''"
      />

      <!-- Скелетон загрузки -->
      <div v-else-if="loading" class="weather-skeleton">
        <div class="weather-details__grid">
          <div class="weather-details__main">
            <div class="skeleton skeleton-temp display-4 mb-0"></div>
            <div class="skeleton skeleton-desc mt-2"></div>
          </div>
          <div class="weather-details__icon">
            <div class="skeleton skeleton-icon"></div>
          </div>
          <div class="weather-details__meta">
            <div class="row g-2">
              <div class="col-6">
                <div class="weather-details__item">
                  <div class="skeleton skeleton-label mb-1"></div>
                  <div class="skeleton skeleton-value"></div>
                </div>
              </div>
              <div class="col-6">
                <div class="weather-details__item">
                  <div class="skeleton skeleton-label mb-1"></div>
                  <div class="skeleton skeleton-value"></div>
                </div>
              </div>
              <div class="col-6">
                <div class="weather-details__item">
                  <div class="skeleton skeleton-label mb-1"></div>
                  <div class="skeleton skeleton-value"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <hr class="my-3" />
        
        <!-- Скелетон прогноза -->
        <div class="forecast-skeleton">
          <div class="skeleton skeleton-title h6 mb-2"></div>
          <div class="forecast-brief__list">
            <div v-for="n in 4" :key="n" class="forecast-brief__item">
              <div class="skeleton skeleton-day mb-2"></div>
              <div class="skeleton skeleton-forecast-icon mx-auto mb-2"></div>
              <div class="skeleton skeleton-temps"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="data" class="weather-details__grid">
        <div class="weather-details__main">
          <div class="weather-details__temp display-4 mb-0">{{ data.temp }}°</div>
          <div class="weather-details__desc text-capitalize">{{ data.desc }}</div>
        </div>
        <div class="weather-details__icon">
          <img :src="iconUrl" alt="Иконка погоды" width="100" height="100" />
        </div>
        <div class="weather-details__meta">
          <div class="row g-2">
            <div class="col-6">
              <div class="weather-details__item">
                <div class="weather-details__label">Ветер</div>
                <div class="weather-details__value">{{ data.wind.toFixed(1) }} м/с</div>
              </div>
            </div>
            <div class="col-6">
              <div class="weather-details__item">
                <div class="weather-details__label">Влажность</div>
                <div class="weather-details__value">{{ data.humidity }}%</div>
              </div>
            </div>
            <div class="col-6">
              <div class="weather-details__item">
                <div class="weather-details__label">Давление</div>
                <div class="weather-details__value">
                  {{ data.pressure }} гПа <span class="text-muted">({{ pressureMmHg }} мм)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-muted">Нет данных…</div>

      <hr class="my-3" />

      <div v-if="forecast.length" class="forecast-brief">
        <div class="forecast-brief__title h6 mb-2">Краткий прогноз</div>
        <div class="forecast-brief__list">
          <div v-for="p in forecast" :key="p.dateISO" class="forecast-brief__item">
            <div class="forecast-brief__day">{{ p.dayLabel }}</div>
            <img class="forecast-brief__icon" :src="`https://openweathermap.org/img/wn/${p.icon}.png`" :alt="p.desc"
              width="42" height="42" draggable="false" />
            <div class="forecast-brief__temps">
              <span class="forecast-brief__tmax">{{ p.max }}°</span>
              <span class="forecast-brief__tmin text-muted">{{ p.min }}°</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- AI Совет -->
      <div v-if="aiAdviceResult" class="u-card p-3 mt-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="d-flex align-items-center mb-0">
            <span class="me-2">🤖</span>
            {{ aiAdviceTitle || 'AI Совет' }}
          </h6>
          <button 
            class="btn btn-sm btn-outline-secondary"
            @click="aiAdviceResult = ''"
            title="Скрыть совет"
          >
            ✕
          </button>
        </div>
        
        <div class="ai-advice-content p-3 bg-light rounded">
          <div class="ai-advice-text">
            {{ aiAdviceResult }}
          </div>
          
          <div class="ai-advice-footer mt-2">
            <small class="text-muted d-flex align-items-center">
              <span class="me-1">💡</span>
              Совет сгенерирован AI на основе текущих погодных условий
            </small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- AI Advisor Modal -->
    <AIAdvisorModal
      :is-open="showAIModal"
      :weather="weatherContext"
      :forecast="forecastContext"
      @close="closeAIAdvisor"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentWeatherByCoords } from '@/api/weather'
import { getBriefForecastByCoords } from '@/api/weather'


import type { BriefForecastPoint } from '@/types/weather'
import { weatherCache } from '@/utils/weatherCache'
import { getErrorMessage } from '@/utils/errorHandler'
import ErrorDisplay from '@/components/ErrorDisplay.vue'
import AIAdvisorModal from '@/components/AIAdvisorModal.vue'
import type { WeatherContext, ForecastContext } from '@/utils/aiPromptGenerator'

const forecast = ref<BriefForecastPoint[]>([])
let controllerForecast: AbortController | null = null

const route = useRoute()
const router = useRouter()

const lat = Number(route.query.lat)
const lon = Number(route.query.lon)
const name = String(route.query.name ?? '')

interface WeatherData {
  city: string
  temp: number
  desc: string
  icon: string
  wind: number
  humidity: number
  pressure: number
}

const loading = ref(false)
const error = ref('')
const data = ref<WeatherData | null>(null)

let controller: AbortController | null = null

const iconUrl = computed(() =>
  data.value ? `https://openweathermap.org/img/wn/${data.value.icon}@2x.png` : ''
)

// Перевод давления из гПа в мм рт. ст.
const pressureMmHg = computed(() =>
  data.value ? Math.round(data.value.pressure * 0.750063755) : 0
)

// Проверяем, есть ли свежие данные в кэше
const isDataFromCache = computed(() => 
  weatherCache.has(lat, lon)
)

// AI-советник
const showAIModal = ref(false)
const aiAdviceResult = ref('')
const aiAdviceTitle = ref('')
const isLoadingAIAdvice = ref(false)

// Контекст погоды для AI
const weatherContext = computed<WeatherContext | null>(() => {
  if (!data.value) return null
  
  return {
    city: data.value.city,
    temp: data.value.temp,
    description: data.value.desc,
    humidity: data.value.humidity,
    windSpeed: data.value.wind,
    pressure: data.value.pressure,
    icon: data.value.icon
  }
})

// Контекст прогноза для AI
const forecastContext = computed<ForecastContext>(() => ({
  forecast: forecast.value.map(f => ({
    dayLabel: f.dayLabel,
    min: f.min,
    max: f.max,
    desc: f.desc
  }))
}))

// Доступен ли AI-советник
const canUseAIAdvisor = computed(() => 
  !loading.value && !error.value && weatherContext.value !== null
)

const load = async () => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    error.value = 'Нет координат. Вернитесь и выберите город из списка.'
    return
  }

  // Проверяем кэш перед запросом к API
  const cachedData = weatherCache.get(lat, lon)
  if (cachedData) {
    data.value = cachedData.data
    forecast.value = cachedData.forecast
    error.value = ''
    return
  }

  try {
    // текущая погода
    if (controller) controller.abort()
    controller = new AbortController()
    loading.value = true
    error.value = ''
    const weatherData = await getCurrentWeatherByCoords(lat, lon, controller.signal)
    data.value = weatherData

    // краткий прогноз
    if (controllerForecast) controllerForecast.abort()
    controllerForecast = new AbortController()
    const forecastData = await getBriefForecastByCoords(lat, lon, 4, controllerForecast.signal)
    forecast.value = forecastData

    // Сохраняем в кэш после успешной загрузки
    weatherCache.set(lat, lon, {
      data: weatherData,
      forecast: forecastData
    })
  } catch (loadError: unknown) {
    handleLoadError(loadError)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push({ name: 'home' })
}

const handleLoadError = (loadError: unknown) => {
  const errorMessage = getErrorMessage(loadError, 'get-weather')
  
  // Показываем ошибку только если это не отмененный запрос
  if (errorMessage) {
    error.value = errorMessage
  }
}

const refreshData = () => {
  // Принудительное обновление - пропускаем кэш
  loadFromAPI()
}

// AI-советник функции
const openAIAdvisor = () => {
  if (canUseAIAdvisor.value) {
    showAIModal.value = true
  }
}

const closeAIAdvisor = () => {
  showAIModal.value = false
  aiAdviceResult.value = ''
  aiAdviceTitle.value = ''
}

const loadFromAPI = async () => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    error.value = 'Нет координат. Вернитесь и выберите город из списка.'
    return
  }

  try {
    // текущая погода
    if (controller) controller.abort()
    controller = new AbortController()
    loading.value = true
    error.value = ''
    const weatherData = await getCurrentWeatherByCoords(lat, lon, controller.signal)
    data.value = weatherData

    // краткий прогноз
    if (controllerForecast) controllerForecast.abort()
    controllerForecast = new AbortController()
    const forecastData = await getBriefForecastByCoords(lat, lon, 4, controllerForecast.signal)
    forecast.value = forecastData

    // Обновляем кэш свежими данными
    weatherCache.set(lat, lon, {
      data: weatherData,
      forecast: forecastData
    })
  } catch (loadError: unknown) {
    handleLoadError(loadError)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Очищаем устаревшие элементы кэша при загрузке страницы
  weatherCache.cleanup()
  load()
})

onBeforeUnmount(() => {
  controller?.abort()
  controllerForecast?.abort()
})
</script>

<style scoped lang="scss">
@use '@/styles/globals' as *;
.weather-details {
  max-width: 720px;
  margin: 0 auto;
  padding: $spacing-lg;

  &__back-btn {
    color: $text-white;
    font-weight: $font-weight-medium;
    @include hover-lift(-1px, $shadow-sm);
  }
  &__grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    align-items: center;
  }

  &__temp {
    line-height: 1;
  }

  &__desc {
    color: #6b7280;
  }

  &__icon img {
    display: block;
  }

  &__item {
    padding: .5rem .75rem;
    border: 1px solid #e5e7eb;
    border-radius: .5rem;
    background: #fafafa;
  }

  &__label {
    font-size: .875rem;
    color: #6b7280;
  }

  &__value {
    font-weight: 600;
  }
}

.forecast-brief {
  &__list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)); // под 4 точки
    gap: .5rem;

    @media (max-width: 420px) {
      grid-template-columns: repeat(3, minmax(0, 1fr)); // на узких — 3
    }
  }
  &__item {
    border: 1px solid #e5e7eb;
    border-radius: .5rem;
    background: #fafafa;
    padding: .5rem;
    text-align: center;
  }
  &__day { font-weight: 600; margin-bottom: .25rem; }
  &__icon { display: block; margin: 0 auto; }
  &__temps {
    display: flex; justify-content: center; gap: .35rem;
    margin-top: .25rem;
  }
  &__tmax { font-weight: 600; }
}

.weather-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  
  svg {
    transition: transform 0.3s ease;
  }
  
  &:hover:not(:disabled) svg {
    transform: rotate(-90deg);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.skeleton {
  @include skeleton($color-gray-200);
  border-radius: $radius-sm;
  
  &-temp {
    height: 4rem;
    width: 8rem;
  }
  
  &-desc {
    height: 1.25rem;
    width: 12rem;
  }
  
  &-icon {
    height: 100px;
    width: 100px;
    border-radius: 8px;
  }
  
  &-label {
    height: 0.875rem;
    width: 4rem;
  }
  
  &-value {
    height: 1.125rem;
    width: 5rem;
  }
  
  &-title {
    height: 1.25rem;
    width: 8rem;
  }
  
  &-day {
    height: 1rem;
    width: 2rem;
  }
  
  &-forecast-icon {
    height: 42px;
    width: 42px;
    border-radius: 4px;
  }
  
  &-temps {
    height: 1rem;
    width: 3rem;
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-color-scheme: dark) {
  .skeleton {
    background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
    background-size: 200% 100%;
  }
}

.ai-advice-btn {
  border-color: #28a745;
  color: #28a745;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #28a745;
    border-color: #28a745;
    color: white;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    transform: none;
  }
}

.ai-advice-content {
  border: 1px solid #e9ecef;
  
  .ai-advice-text {
    font-size: 1rem;
    line-height: 1.5;
    color: #495057;
  }
  
  .ai-advice-footer {
    border-top: 1px solid #e9ecef;
    padding-top: 0.5rem;
    margin-top: 0.75rem;
  }
}
</style>

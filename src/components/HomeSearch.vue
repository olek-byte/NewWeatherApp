<template>
    <div class="home-search home-search--container">
        <!-- Предупреждение об отсутствующем API ключе -->
        <div v-if="!hasApiKey" class="alert alert-danger mb-4" role="alert">
            <h4 class="alert-heading">⚠️ Настройка требуется</h4>
            <p class="mb-2">
                <strong>API ключ OpenWeatherMap не настроен!</strong>
            </p>
            <p class="mb-2">
                Для работы приложения необходимо создать файл <code>.env.local</code> в корне проекта:
            </p>
            <pre class="text-dark bg-light p-2 rounded"><code>VITE_OWM_API_KEY=ваш_api_ключ_здесь</code></pre>
            <hr>
            <p class="mb-0">
                📋 Получите бесплатный API ключ на 
                <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" class="alert-link">
                    OpenWeatherMap
                </a>
            </p>
        </div>
        
        <h1 class="home-search__title">Поиск города</h1>
        
        <form class="home-search__form" role="search" @submit.prevent="onSubmit">
            <div class="home-search__input-wrapper">
                <input 
                    class="home-search__input" 
                    type="text" 
                    v-model.trim="query"
                    placeholder="Начните вводить город (например, Kyiv)" 
                    aria-autocomplete="list"
                    aria-controls="home-search-suggestions"
                    @keydown.down.prevent="onArrowDown"
                    @keydown.up.prevent="onArrowUp" 
                    @keydown.enter.prevent="onEnterKey"
                    @keydown.esc="onEscapeKey"
                    @blur="closeDropdownDelayed" 
                />
                
                <button 
                    class="home-search__search-btn" 
                    type="submit" 
                    :disabled="loading || query.trim().length < 2"
                    aria-label="Найти город"
                >
                    <svg class="home-search__search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </button>
            </div>

            <!-- Dropdown suggestions -->
            <div v-if="open" class="home-search__suggestions" role="listbox" id="home-search-suggestions">
                <div v-if="loading || hasActiveRequest" class="home-search__suggestion-item home-search__suggestion-item--loading">
                    <div class="home-search__loading-content">
                        <div class="home-search__loading-info">
                            <div class="home-search__spinner"></div>
                            <span class="home-search__loading-text">{{ hasActiveRequest ? 'Поиск городов...' : 'Загрузка...' }}</span>
                        </div>
                        <div class="home-search__loading-stats">
                            {{ requestStats.pendingDebounces > 0 ? '⏰ Debounce' : '' }}
                            {{ requestStats.activeRequests > 0 ? '🌐 API' : '' }}
                        </div>
                    </div>
                </div>
                
                <div v-else-if="hasNoResults" class="home-search__suggestion-item home-search__suggestion-item--empty">
                    Ничего не найдено
                </div>
                
                <div 
                    v-for="(item, idx) in results" 
                    :key="item.lat + ':' + item.lon + item.name"
                    class="home-search__suggestion-item"
                    :class="{ 'home-search__suggestion-item--active': idx === highlighted }" 
                    role="option"
                    @mouseenter="highlighted = idx" 
                    @mousedown.prevent="selectItem(item)"
                >
                    <div class="home-search__suggestion-name">{{ formatItem(item) }}</div>
                    <div class="home-search__suggestion-coords">
                        ({{ item.lat.toFixed(2) }}, {{ item.lon.toFixed(2) }})
                    </div>
                </div>
            </div>
        </form>

        <div v-if="error" class="home-search__error">{{ error }}</div>

        <div v-if="recent.length" class="home-search__recent-section">
            <div class="home-search__subtitle">Недавние:</div>
            
            <div class="home-search__recent-list">
                <div 
                    v-for="recentCity in recent" 
                    :key="recentCity.lat + ':' + recentCity.lon + recentCity.name" 
                    class="home-search__recent-chip"
                >
                    <button 
                        class="home-search__recent-btn" 
                        @click="selectItem(recentCity)" 
                        :title="formatItem(recentCity)"
                    >
                        {{ formatItem(recentCity) }}
                    </button>
                    
                    <button 
                        class="home-search__recent-remove" 
                        @click.stop="removeRecent(recentCity.lat, recentCity.lon)"
                        aria-label="Удалить из недавних"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { OWMGeoItem } from '@/types/geo'
import { searchCities } from '@/api/geo' // axios
import { RequestManager, REQUEST_CONFIGS } from '@/utils/requestManager'
import { getErrorMessage } from '@/utils/errorHandler'

// Реактивные переменные (видны в шаблоне)
const query = ref<string>('')            // ввод пользователя
const results = ref<OWMGeoItem[]>([])    // подсказки
const loading = ref<boolean>(false)      // индикатор загрузки
const error = ref<string>('')            // текст ошибки
const open = ref<boolean>(false)         // открыт ли список подсказок
const highlighted = ref<number>(-1)      // выделенный индекс

// ── Нереактивные служебные (не попадают в шаблон)
const cache = new Map<string, OWMGeoItem[]>() // кэш на сессию по ключу запроса
const requestManager = new RequestManager()   // менеджер запросов с автоматической отменой

// ── Недавние выборы (храним в localStorage) 
const RECENT_KEY = 'weather_recent_cities'
const recent = ref<OWMGeoItem[]>([])

const loadRecent = () => {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) recent.value = JSON.parse(raw)
}

const pushRecent = (item: OWMGeoItem) => {
    const arr = [item, ...recent.value.filter(recentCity => recentCity.lat !== item.lat || recentCity.lon !== item.lon)].slice(0, 5)
    recent.value = arr
    localStorage.setItem(RECENT_KEY, JSON.stringify(arr))
}

//очистку всего списка
// function clearRecent(): void {
//     recent.value = []
//     localStorage.removeItem(RECENT_KEY)
// }

//удаление одного элемента
const removeRecent = (lat: number, lon: number): void => {
    recent.value = recent.value.filter(recentCity => recentCity.lat !== lat || recentCity.lon !== lon)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
}

// Реакция на ввод с автоматической отменой предыдущих запросов
watch(query, (queryValue) => {
    error.value = ''
    highlighted.value = -1

    if (!queryValue || queryValue.trim().length < 2) {
        // Отменяем активные запросы если ввод слишком короткий
        requestManager.cancelRequest('city-search')
        results.value = []
        open.value = false
        loading.value = false
        return
    }

    // Запускаем поиск с debounce и автоматической отменой
    performSearch(queryValue.trim())
})

const doSearch = async () => {
    const searchQuery = query.value.trim()
    if (!searchQuery) return
    // 1) Кэш на тот же запрос
    if (cache.has(searchQuery)) {
        results.value = cache.get(searchQuery) || []
        open.value = results.value.length > 0
        return
    }
    // Используем новую систему управления запросами
    await performSearch(searchQuery)
}

const formatItem = (cityItem: OWMGeoItem) => {
    return [cityItem.name, cityItem.state, cityItem.country].filter(Boolean).join(', ')
}

const selectItem = (selectedCity: OWMGeoItem) => {
  open.value = false
  results.value = []
  query.value = ''        // очищаем поле ввода
  pushRecent(selectedCity)

  // Переход на страницу деталей с координатами
  router.push({
    name: 'weather',
    query: {
      lat: String(selectedCity.lat),
      lon: String(selectedCity.lon),
      name: selectedCity.name
    }
  })
}

/*
function selectItem(i: OWMGeoItem) {
    // selectedCity.value = i  // (добавь ref, если нужно)
    // закрываем дропдаун и чистим список результатов
    open.value = false
    results.value = []
    // очищаем инпут 
    query.value = ''
    // сохраняем в "Недавние"
    pushRecent(i)
}
*/

// Функции для Vue директив
const onArrowDown = () => {
    if (!open.value || !results.value.length) return
    highlighted.value = (highlighted.value + 1) % results.value.length
}

const onArrowUp = () => {
    if (!open.value || !results.value.length) return
    highlighted.value = (highlighted.value - 1 + results.value.length) % results.value.length
}

const onEnterKey = () => {
    if (!open.value || !results.value.length) return
    const selectedItem = results.value[highlighted.value]
    if (selectedItem) selectItem(selectedItem)
}

const onEscapeKey = () => {
    open.value = false
}

//Логика сабмита
const onSubmit = () => {
  if (loading.value || query.value.trim().length < 2) return

  if (open.value && results.value.length) {
    const itemIndex = highlighted.value >= 0 ? highlighted.value : 0
    const selectedItem = results.value[itemIndex]
    if (selectedItem) {
      selectItem(selectedItem) // очищаем инпут и закрываем список
      return
    }
  }
  // если подсказок ещё нет — форсим поиск
  doSearch()
}

// Функция для закрытия дропдауна с задержкой (для @blur)
const closeDropdownDelayed = () => {
    // Задержка позволяет обработать клик по элементу списка до закрытия
    setTimeout(() => {
        open.value = false
    }, 150)
}

onMounted(() => {
    loadRecent()
})

// Новая функция поиска с улучшенным управлением запросами
const performSearch = async (searchQuery: string): Promise<void> => {
    // 1) Проверяем кэш перед запросом
    if (cache.has(searchQuery)) {
        results.value = cache.get(searchQuery) || []
        open.value = results.value.length > 0
        loading.value = false
        return
    }
    try {
        loading.value = true
        // 2) Используем RequestManager с оптимизированной конфигурацией для поиска
        // REQUEST_CONFIGS.SEARCH = { debounceMs: 350, strategy: 'debounce' }
        // Это означает: запрос выполнится только через 350ms после последнего ввода
        const citiesData = await requestManager.executeWithThrottleDebounce(
            'city-search',
            async (signal: AbortSignal, requestId: number) => {
                const data = await searchCities(searchQuery, 5, signal)
                return { data, requestId, query: searchQuery }
            },
            REQUEST_CONFIGS.SEARCH  // 🎯 Оптимизированные настройки для поиска
        )
        // 3) Обрабатываем результат (может быть null если запрос был отменен)
        if (citiesData && citiesData.query === query.value.trim()) {
            results.value = citiesData.data
            cache.set(searchQuery, citiesData.data) // кэшируем
            open.value = true
            error.value = ''
        }
    } catch (searchError: unknown) {
        handleSearchError(searchError)
    } finally {
        loading.value = false
    }
}

// Унифицированная обработка ошибок поиска
const handleSearchError = (searchError: unknown): void => {
    const errorMessage = getErrorMessage(searchError, 'search-cities')
    
    // Показываем ошибку только если это не отмененный запрос
    if (errorMessage) {
        error.value = errorMessage
    }
}

onBeforeUnmount(() => {
    // Отменяем все активные запросы при размонтировании
    requestManager.destroy()
})

const hasNoResults = computed<boolean>(() =>
    !loading.value && open.value && results.value.length === 0 && query.value.trim().length >= 2
)

// Проверяем, есть ли активные запросы
const hasActiveRequest = computed<boolean>(() => 
    requestManager.hasActiveRequest('city-search')
)

// Статистика запросов для отладки (в dev режиме)
const requestStats = computed(() => 
    requestManager.getStats()
)

// Проверка наличия API ключа
const hasApiKey = computed(() => {
    return Boolean(import.meta.env.VITE_OWM_API_KEY)
})
</script>

<style scoped lang="scss">
@use '@/styles/globals' as *;

.home-search {
  max-width: 720px;
  margin: 0 auto;
  padding: $spacing-lg;

  &--container {
    background: transparent;
  }

  &__title {
    color: $text-white;
    font-weight: $font-weight-bold;
    font-size: $font-size-2xl;
    margin-bottom: $spacing-lg;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  &__form {
    position: relative;
    margin-bottom: $spacing-lg;
  }

  &__input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__input {
    @include form-control();
    width: 100%;
    padding-right: 3rem;
    font-size: $font-size-base;
  }

  &__search-btn {
    position: absolute;
    top: 50%;
    right: $spacing-sm;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: $radius-full;
    background: transparent;
    cursor: pointer;
    transition: $transition-fast;
    color: $text-muted;

    &:hover:not(:disabled) {
      background: rgba($color-primary, 0.1);
      color: $color-primary;
    }

    &:focus-visible {
      outline: 2px solid $color-primary; 
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__search-icon {
    display: block;
  }

  &__suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: $z-dropdown;
    @include glassmorphism($color-white, $blur-md, rgba($color-gray-300, 0.3));
    border-top: none;
    border-radius: 0 0 $radius $radius;
    max-height: 260px;
    overflow: auto;
    @include slide-up($transition-fast, 10px);
  }

  &__suggestion-item {
    padding: $spacing-sm $spacing-md;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
    align-items: center;
    transition: $transition-fast;
    border-bottom: 1px solid rgba($color-gray-200, 0.5);

    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: rgba($color-primary-light, 0.1);
    }

    &--active {
      background: $color-gray-100;
    }

    &--empty {
      color: $text-secondary;
        cursor: default;
      justify-content: center;
      font-style: italic;
    }

    &--loading {
      cursor: default;
    }
  }

  &__suggestion-name {
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }

  &__suggestion-coords {
    font-size: $font-size-sm;
    color: $text-muted;
  }

  &__loading-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  &__loading-info {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__loading-text {
    color: $text-secondary;
  }

  &__loading-stats {
    font-size: $font-size-xs;
    color: $text-light;
  }

  &__spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba($color-primary, 0.2);
    border-top: 2px solid $color-primary;
    border-radius: $radius-full;
    animation: spin 1s linear infinite;

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }

  &__error {
    color: $color-error-dark;
    font-weight: $font-weight-medium;
    padding: $spacing-sm;
    background: rgba($color-error, 0.1);
    border: 1px solid rgba($color-error, 0.3);
    border-radius: $radius;
    margin-top: $spacing-sm;
  }

  &__recent-section {
    margin-top: $spacing-lg;
  }

  &__subtitle {
    margin-bottom: $spacing-xl;
    color: $text-white;
    font-weight: $font-weight-semibold;
    font-size: $font-size-lg;
  }

  &__recent-list {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
  }

  &__recent-chip {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    border: 1px solid $color-gray-300;
    border-radius: $radius-full;
    padding: $spacing-xs $spacing-sm $spacing-xs $spacing-md;
    @include glassmorphism($color-gray-50, $blur-sm, rgba($color-white, 0.5));
    transition: $transition-fast;

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-sm;
    }
  }

  &__recent-btn {
        border: 0;
        background: transparent;
        padding: 0;
    line-height: $line-height-tight;
        cursor: pointer;
    color: $text-primary;
    font-weight: $font-weight-medium;
    transition: $transition-fast;
    
    &:hover {
      color: $color-primary;
    }
  }

  &__recent-remove {
        border: 0;
        background: transparent;
        cursor: pointer;
        line-height: 1;
    padding: 0 $spacing-xs;
        font-size: 16px;
    color: $color-error;
    font-weight: $font-weight-semibold;
    transition: $transition-fast;
    border-radius: $radius-full;

        &:hover {
      color: $color-error-dark;
      background: rgba($color-error, 0.1);
      transform: scale(1.1);
    }
  }
}

@media (max-width: 768px) {
  .home-search {
    padding: $spacing-md;

    &__title {
      font-size: $font-size-xl;
    }

    &__recent-list {
      gap: $spacing-xs;
    }

    &__recent-chip {
      font-size: $font-size-sm;
    }
  }
}
</style>
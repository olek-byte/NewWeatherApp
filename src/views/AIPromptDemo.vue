<template>
    <div class="ai-prompt-demo ai-prompt-demo--container">
      <div class="ai-prompt-demo__wrapper">
        <div class="ai-prompt-demo__content">
          <h1 class="ai-prompt-demo__title">🤖 AI Prompt Generator - Демонстрация</h1>
          
          <div class="alert alert-info mb-4">
            <div class="d-flex align-items-center">
              <span class="me-2">💡</span>
              <div>
                <strong>Что это?</strong><br>
                Генератор создает короткие и эффективные промпты для AI на основе текущих погодных условий.
                Все промпты ≤40 слов для оптимального использования с различными AI моделями.
              </div>
            </div>
          </div>
  
          <!-- Выбор примера погоды -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">🌤️ Выберите погодные условия:</h5>
            </div>
            <div class="card-body">
              <div class="row g-2">
                <div 
                  v-for="(example, index) in weatherExamples" 
                  :key="index"
                  class="col-md-3"
                >
                  <button 
                    class="btn w-100 text-start"
                    :class="selectedExample === index ? 'btn-primary' : 'btn-outline-primary'"
                    @click="selectedExample = index"
                  >
                    <div class="fw-bold">{{ example.name }}</div>
                    <small class="text-muted">
                      {{ example.data.temp }}°C, {{ example.data.description }}
                    </small>
                  </button>
                </div>
              </div>
              
              <!-- Детали выбранной погоды -->
              <div v-if="currentWeather" class="mt-3 p-3 bg-light rounded">
                <h6>📍 {{ currentWeather.data.city }}</h6>
                <div class="row">
                  <div class="col-md-6">
                    <strong>Температура:</strong> {{ currentWeather.data.temp }}°C<br>
                    <strong>Описание:</strong> {{ currentWeather.data.description }}<br>
                    <strong>Влажность:</strong> {{ currentWeather.data.humidity }}%
                  </div>
                  <div class="col-md-6">
                    <strong>Ветер:</strong> {{ currentWeather.data.windSpeed }} м/с<br>
                    <strong>Давление:</strong> {{ currentWeather.data.pressure }} гПа<br>
                    <strong>Время:</strong> {{ new Date().toLocaleTimeString('ru') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Быстрые промпты -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">⚡ Быстрые промпты (готовые шаблоны):</h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div 
                  v-for="(quick, index) in quickPrompts" 
                  :key="index"
                  class="col-md-6"
                >
                  <div class="card h-100">
                    <div class="card-header d-flex align-items-center">
                      <span class="me-2 fs-4">{{ quick.icon }}</span>
                      <strong>{{ quick.title }}</strong>
                    </div>
                    <div class="card-body">
                      <div class="font-monospace small bg-light p-2 rounded mb-2">
                        {{ quick.prompt }}
                      </div>
                      <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                          {{ quick.prompt.split(/\s+/).length }} слов
                        </small>
                        <button 
                          class="btn btn-sm btn-outline-primary"
                          @click="copyToClipboard(quick.prompt)"
                        >
                          📋 Копировать
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Детальная статистика промптов -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">📊 Анализ всех типов промптов:</h5>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Тип</th>
                      <th>Промпт</th>
                      <th>Слова</th>
                      <th>Символы</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="stat in promptStats" :key="stat.type">
                      <td>
                        <span class="badge bg-secondary">{{ stat.type }}</span>
                      </td>
                      <td>
                        <div class="font-monospace small" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                          {{ stat.prompt }}
                        </div>
                      </td>
                      <td>
                        <span :class="stat.isOptimal ? 'text-success' : 'text-warning'">
                          {{ stat.words }}
                        </span>
                      </td>
                      <td>{{ stat.chars }}</td>
                      <td>
                        <span 
                          class="badge"
                          :class="stat.isOptimal ? 'bg-success' : stat.words < 10 ? 'bg-danger' : 'bg-warning'"
                        >
                          {{ stat.isOptimal ? '✅ Оптимально' : stat.words < 10 ? '⚠️ Слишком короткий' : '⚠️ Может быть длинным' }}
                        </span>
                      </td>
                      <td>
                        <button 
                          class="btn btn-sm btn-outline-primary"
                          @click="copyToClipboard(stat.prompt)"
                        >
                          📋
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
  
          <!-- Пользовательская активность -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="mb-0">✏️ Промпт для конкретной активности:</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-8">
                  <div class="mb-3">
                    <label for="activity-input" class="form-label">Введите активность:</label>
                    <input 
                      id="activity-input"
                      v-model="customActivity"
                      type="text" 
                      class="form-control"
                      placeholder="например: бег в парке, фотосъемка, рыбалка, велопрогулка..."
                    >
                  </div>
                  
                  <div v-if="customActivity" class="alert alert-light">
                    <strong>Сгенерированный промпт:</strong>
                    <div class="font-monospace mt-2 p-2 bg-white rounded border">
                      {{ generatedPrompts.custom }}
                    </div>
                    <div class="mt-2 d-flex justify-content-between">
                      <small class="text-muted">
                        {{ generatedPrompts.custom.split(/\s+/).length }} слов, 
                        {{ generatedPrompts.custom.length }} символов
                      </small>
                      <button 
                        class="btn btn-sm btn-primary"
                        @click="copyToClipboard(generatedPrompts.custom)"
                      >
                        📋 Копировать промпт
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-4">
                  <h6>Популярные активности:</h6>
                  <div class="d-grid gap-1">
                    <button 
                      v-for="activity in ['бег трусцой', 'пикник в парке', 'фотосъемка на улице', 'поход в горы', 'рыбалка', 'велопрогулка']"
                      :key="activity"
                      class="btn btn-sm btn-outline-secondary text-start"
                      @click="customActivity = activity"
                    >
                      {{ activity }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Инструкции по использованию -->
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">📖 Как использовать промпты:</h5>
            </div>
            <div class="card-body">
              <ol>
                <li><strong>Выберите подходящий тип промпта</strong> в зависимости от того, какой совет нужен</li>
                <li><strong>Скопируйте промпт</strong> нажав кнопку "📋 Копировать"</li>
                <li><strong>Отправьте в AI</strong> (ChatGPT, Claude, Gemini и др.)</li>
                <li><strong>Получите персонализированный совет</strong> на русском языке</li>
              </ol>
              
              <div class="alert alert-success mt-3">
                <strong>💡 Преимущества наших промптов:</strong><br>
                • Оптимальная длина (≤40 слов) для быстрого ответа<br>
                • Контекстная информация о погоде включена<br>
                • Четкие инструкции для AI на русском языке<br>
                • Адаптированы под конкретные потребности пользователя
              </div>
              
              <div class="alert alert-info">
                <strong>🔗 Интеграция с AI сервисами:</strong><br>
                В будущем можно добавить прямую интеграцию с OpenAI API, Google Gemini или другими AI сервисами 
                для автоматического получения ответов без копирования промптов.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AIPromptGenerator } from '@/utils/aiPromptGenerator'
import type { WeatherContext, ForecastContext } from '@/utils/aiPromptGenerator'

// Примеры погодных данных для демонстрации
const weatherExamples: Array<{ name: string; data: WeatherContext; forecast?: ForecastContext }> = [
  {
    name: 'Холодная зима в Москве',
    data: {
      city: 'Москва',
      temp: -8,
      description: 'снег, метель',
      humidity: 85,
      windSpeed: 7,
      pressure: 1013,
      icon: '13d'
    },
    forecast: {
      forecast: [
        { dayLabel: 'Завтра', min: -12, max: -5, desc: 'снег' },
        { dayLabel: 'Послезавтра', min: -15, max: -8, desc: 'ясно, морозно' }
      ]
    }
  },
  {
    name: 'Жаркое лето в Киеве',
    data: {
      city: 'Киев',
      temp: 32,
      description: 'солнечно, жарко',
      humidity: 65,
      windSpeed: 3,
      pressure: 1020,
      icon: '01d'
    },
    forecast: {
      forecast: [
        { dayLabel: 'Завтра', min: 22, max: 35, desc: 'солнечно' },
        { dayLabel: 'Послезавтра', min: 24, max: 33, desc: 'переменная облачность' }
      ]
    }
  },
  {
    name: 'Дождливая осень в Санкт-Петербурге',
    data: {
      city: 'Санкт-Петербург',
      temp: 12,
      description: 'дождь, облачно',
      humidity: 92,
      windSpeed: 8,
      pressure: 998,
      icon: '10d'
    },
    forecast: {
      forecast: [
        { dayLabel: 'Завтра', min: 8, max: 15, desc: 'дождь' },
        { dayLabel: 'Послезавтра', min: 10, max: 16, desc: 'переменная облачность' }
      ]
    }
  },
  {
    name: 'Весна в Одессе',
    data: {
      city: 'Одесса',
      temp: 18,
      description: 'переменная облачность',
      humidity: 70,
      windSpeed: 5,
      pressure: 1015,
      icon: '03d'
    },
    forecast: {
      forecast: [
        { dayLabel: 'Завтра', min: 15, max: 22, desc: 'солнечно' },
        { dayLabel: 'Послезавтра', min: 17, max: 24, desc: 'солнечно' }
      ]
    }
  }
]

const selectedExample = ref(0)
const customActivity = ref('')

// Текущий пример погоды
const currentWeather = computed(() => weatherExamples[selectedExample.value])

// Различные типы промптов для текущей погоды
const generatedPrompts = computed(() => {
  const current = currentWeather.value
  if (!current) return { general: '', clothing: '', activities: '', health: '', custom: '' }
  
  const weather = current.data
  const forecast = current.forecast
  
  return {
    general: AIPromptGenerator.generateWeatherAdvicePrompt(weather, forecast),
    clothing: `What to wear today? ${weather.temp}°C, ${weather.description}. Clothing advice in Russian.`,
    activities: `Best activities for ${weather.temp}°C ${weather.description} weather? Russian tips.`,
    health: `Health tips for ${weather.temp}°C, humidity ${weather.humidity}%, ${weather.description}? Russian advice.`,
    custom: customActivity.value ? 
      AIPromptGenerator.generateActivityPrompt(weather, customActivity.value) : 
      'Введите активность для получения промпта...'
  }
})

// Статистика промптов
const promptStats = computed(() => {
  return Object.entries(generatedPrompts.value).map(([type, prompt]) => {
    const words = prompt.split(/\s+/).filter(w => w.length > 0)
    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      prompt,
      words: words.length,
      chars: prompt.length,
      isOptimal: words.length <= 40 && words.length >= 10
    }
  })
})

// Быстрые промпты
const quickPrompts = computed(() => {
  const current = currentWeather.value
  if (!current) return []
  return AIPromptGenerator.getQuickPrompts(current.data)
})

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Можно добавить уведомление об успешном копировании
  })
}
</script>

<style scoped lang="scss">
@use '@/styles/globals' as *;

.ai-prompt-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: $spacing-lg;

  &__wrapper {
    display: flex;
    flex-direction: column;
  }

  &__content {
    width: 100%;
  }

  &__title {
    color: $text-white;
    font-weight: $font-weight-bold;
    font-size: $font-size-2xl;
    margin-bottom: $spacing-lg;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

@media (max-width: 768px) {
  .ai-prompt-demo {
    padding: $spacing-md;

    &__title {
      font-size: $font-size-xl;
    }
  }
}
</style>
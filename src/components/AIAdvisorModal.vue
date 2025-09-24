<template>
  <div v-if="isOpen" class="ai-advisor-modal ai-advisor-modal--open" tabindex="-1" role="dialog" @click.self="closeModal">
    <div class="ai-advisor-modal__dialog" role="document">
      <div class="ai-advisor-modal__content">
        <div class="ai-advisor-modal__header">
          <h5 class="ai-advisor-modal__title">
            <span class="ai-advisor-modal__icon">💡</span>
            {{ title }}
          </h5>
          <button type="button" class="ai-advisor-modal__close-btn" @click="closeModal" aria-label="Close modal"></button>
        </div>

        <div class="ai-advisor-modal__body">
          <div v-if="!weather" class="ai-advisor-modal__empty-state">
            Нет данных для генерации.
          </div>

          <div v-else class="ai-advisor-modal__content-wrapper">
            <div class="ai-advisor-modal__advice-section ai-advisor-modal__advice-section--english">
              <div class="ai-advisor-modal__advice-label">US English:</div>
              <div class="ai-advisor-modal__advice-text">{{ adviceEN }}</div>
            </div>

            <div class="ai-advisor-modal__advice-section ai-advisor-modal__advice-section--russian">
              <div class="ai-advisor-modal__advice-label">RU Русский:</div>
              <div class="ai-advisor-modal__advice-text">{{ adviceRU }}</div>
            </div>
          </div>

        </div>

        <div class="ai-advisor-modal__footer">
          <button 
            type="button" 
            class="ai-advisor-modal__button ai-advisor-modal__button--copy"
            :class="{ 'ai-advisor-modal__button--success': isCopied }"
            @click="copyAdvice"
            :disabled="isCopied"
          >
            <span class="ai-advisor-modal__button-icon">{{ isCopied ? '✅' : '📄' }}</span> 
            <span class="ai-advisor-modal__button-text">{{ isCopied ? 'Copied!' : 'Copy' }}</span>
          </button>
          <button 
            type="button" 
            class="ai-advisor-modal__button ai-advisor-modal__button--primary" 
            :disabled="!weather || isGenerating" 
            @click="generateAdvice"
          >
            <span v-if="isGenerating" class="ai-advisor-modal__spinner"></span>
            <span class="ai-advisor-modal__button-text">Generate again</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="isOpen" class="ai-advisor-modal__backdrop ai-advisor-modal__backdrop--visible"></div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WeatherContext, ForecastContext } from '@/utils/aiPromptGenerator'

import { requestGeminiAdvice } from '@/api/aiGemini'
import { AIPromptGenerator } from '@/utils/aiPromptGenerator'

interface Props {
  isOpen: boolean
  weather: WeatherContext | null
  forecast?: ForecastContext
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const isGenerating = ref(false)
const adviceEN = ref('')
const adviceRU = ref('')
const isCopied = ref(false)
let currentAbort: AbortController | null = null
let lastRequestedAt = 0

const title = computed(() => {
  if (!props.weather) return 'AI Advice'
  return `AI Advice for ${props.weather.city}`
})

const closeModal = () => {
  emit('close')
}

const generateAdvice = async () => {
  if (!props.weather) return
  // Простая защита от частых кликов и двойных вызовов от вотчеров
  const now = Date.now()
  if (now - lastRequestedAt < 800) return
  lastRequestedAt = now

  // Отменяем предыдущий запрос, если он еще в работе
  if (currentAbort) currentAbort.abort()
  currentAbort = new AbortController()

  isGenerating.value = true
  try {
    const prompt = AIPromptGenerator.generateWeatherAdvicePrompt(
      props.weather,
      props.forecast
    )
    const { en, ru } = await requestGeminiAdvice(prompt)
    adviceEN.value = en
    adviceRU.value = ru
  } catch {
    adviceEN.value = 'Failed to get AI advice.'
    adviceRU.value = 'Не удалось получить совет AI.'
  } finally {
    isGenerating.value = false
    currentAbort = null
  }
}

const copyAdvice = async () => {
  const text = `US English:\n${adviceEN.value}\n\nRU Русский:\n${adviceRU.value}`
  try { 
    await navigator.clipboard.writeText(text)
    isCopied.value = true
    setTimeout(() => { isCopied.value = false }, 2000)
  } catch (err) { 
    void err 
  }
}

watch(() => props.isOpen, (open) => {
  if (open) generateAdvice()
})

// function generateAdvice() {
//   if (!props.weather) return
//   isGenerating.value = true

//   const w = props.weather
//   const tempEN = describeTempEN(w.temp)
//   const tempRU = describeTempRU(w.temp)

//   const clothingEN = pick([
//     'Light clothing like t-shirts and jeans works well',
//     'Layer up with a light jacket or hoodie',
//     'Wear a warm coat, hat and gloves',
//     'Choose breathable fabrics and stay hydrated'
//   ])
//   const clothingRU = pick([
//     'Легкая одежда, футболки и джинсы подойдут отлично',
//     'Наденьте легкую куртку или худи',
//     'Теплая куртка, шапка и перчатки будут кстати',
//     'Выбирайте дышащие ткани и не забывайте пить воду'
//   ])

//   const activityEN = pick([
//     'Perfect time for outdoor activities',
//     'Good weather for a relaxed walk',
//     'Consider indoor plans if it feels uncomfortable',
//     'A great day to stay active'
//   ])
//   const activityRU = pick([
//     'Идеально для активностей на улице',
//     'Хорошее время для спокойной прогулки',
//     'Если некомфортно — выберите занятия в помещении',
//     'Отличный день, чтобы быть активным'
//   ])

//   adviceEN.value = `${w.city}: ${tempEN} ${w.temp}°C, ${w.description}. ${clothingEN}. ${activityEN}!`
//   adviceRU.value = `${w.city}: ${tempRU}, ${w.temp}°C, ${w.description}. ${clothingRU}. ${activityRU}!`

//   setTimeout(() => { isGenerating.value = false }, 400)
// }
</script>

<style scoped lang="scss">
@use '@/styles/globals' as *;

.ai-advisor-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: $z-modal;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: $transition-all;

  &--open {
    opacity: 1;
    visibility: visible;
  }

  &__dialog {
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    margin: $spacing-lg;
    transform: translateY(20px);
    transition: $transition-all;

    .ai-advisor-modal--open & {
      transform: translateY(0);
    }
  }

  &__content {
    @include glassmorphism($gradient-card, $blur-xl, rgba($color-white, 0.3));
    border-radius: $radius-lg;
    overflow: hidden;
    box-shadow: $shadow-blue-lg;
  }

  &__header {
    padding: $spacing-lg;
    background: rgba($color-primary-light, 0.1);
    border-bottom: 1px solid rgba($color-primary-light, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    margin: 0;
    display: flex;
    align-items: center;
  }

  &__icon {
    margin-right: $spacing-sm;
    font-size: $font-size-xl;
  }

  &__close-btn {
    background: none;
    border: none;
    font-size: $font-size-lg;
    cursor: pointer;
    color: $text-muted;
    padding: $spacing-xs;
    border-radius: $radius-sm;
    transition: $transition-fast;
    @include hover-lift(-1px, $shadow-sm);

    &:hover {
      color: $text-primary;
      background: rgba($color-error, 0.1);
    }

    &::before {
      content: '✕';
    }
  }

  &__body {
    padding: $spacing-lg;
  }

  &__empty-state {
    color: $text-muted;
    text-align: center;
    padding: $spacing-xl 0;
    font-style: italic;
  }

  &__content-wrapper {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__advice-section {
    &--english {
      .ai-advisor-modal__advice-label {
        color: $color-primary;
      }
    }

    &--russian {
      .ai-advisor-modal__advice-label {
        color: $color-secondary;
      }
    }
  }

  &__advice-label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: $spacing-xs;
  }

  &__advice-text {
    font-size: $font-size-base;
    line-height: $line-height-relaxed;
    color: $text-secondary;
    padding: $spacing-lg;
    @include glassmorphism(rgba($color-white, 0.7), $blur-sm, rgba($color-primary-light, 0.1));
    border-radius: $radius;
    min-height: 100px;
    display: flex;
    align-items: center;
  }

  &__footer {
    padding: $spacing-lg;
    background: rgba($color-primary-light, 0.05);
    border-top: 1px solid rgba($color-primary-light, 0.2);
    display: flex;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__button {
    padding: $spacing-sm $spacing-lg;
    border: 2px solid transparent;
    border-radius: $radius;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: $transition-all;
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    @include button-press();

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;

      &:hover {
        transform: none;
      }
    }

    &--copy {
      @include outline-button(rgba($color-primary-light, 0.7), $gradient-form);
      
      &:hover:not(:disabled) {
        color: $color-primary-dark;
      }
    }

    &--primary {
      @include gradient-button();
    }

    &--success {
      @include gradient-button(
        linear-gradient(135deg, $color-success 0%, $color-success-dark 100%),
        linear-gradient(135deg, $color-success-dark 0%, darken($color-success-dark, 10%) 100%)
      );
      @include pulse();
    }
  }

  &__button-icon {
    font-size: $font-size-base;
  }

  &__button-text {
    font-weight: inherit;
  }

  &__spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba($color-white, 0.3);
    border-top: 2px solid $color-white;
    border-radius: $radius-full;
    animation: spin 1s linear infinite;

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }

  &__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba($color-gray-900, 0.5);
    z-index: $z-modal-backdrop;
    opacity: 0;
    visibility: hidden;
    transition: $transition-all;
    backdrop-filter: $blur-sm;

    &--visible {
      opacity: 1;
      visibility: visible;
    }
  }
}

@media (max-width: 576px) {
  .ai-advisor-modal {
    &__dialog {
      width: 95%;
      margin: $spacing-sm;
    }

    &__header,
    &__body,
    &__footer {
      padding: $spacing-md;
    }

    &__footer {
      flex-direction: column;
      gap: $spacing-sm;
    }

    &__button {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>

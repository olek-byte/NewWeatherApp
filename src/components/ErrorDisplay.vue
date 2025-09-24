<template>
  <div class="error-display error-display--danger" role="alert">
    <div class="error-display__container">
      <div class="error-display__icon">
        {{ errorIcon }}
      </div>

      <div class="error-display__content">
        <div class="error-display__message">
          {{ error }}
        </div>

        <div v-if="canShowRetry || showDetails" class="error-display__actions">
          <button 
            v-if="canShowRetry" 
            class="error-display__button error-display__button--retry" 
            @click="onRetry"
          >
            <span class="error-display__button-icon">🔄</span>
            <span class="error-display__button-text">Попробовать снова</span>
          </button>

          <button 
            v-if="showDetails" 
            class="error-display__button error-display__button--details" 
            @click="showStats = !showStats"
          >
            <span class="error-display__button-text">{{ showStats ? 'Скрыть' : 'Подробнее' }}</span>
          </button>

          <button 
            class="error-display__button error-display__button--dismiss" 
            @click="onDismiss"
          >
            <span class="error-display__button-icon">✕</span>
            <span class="error-display__button-text">Закрыть</span>
          </button>
        </div>

        <!-- Error statistics in dev mode -->
        <div v-if="showStats && showDetails" class="error-display__stats">
          <div class="error-display__stats-content">
            <div class="error-display__stats-title">Статистика ошибок:</div>
            
            <div class="error-display__stats-section">
              <div class="error-display__stats-label">По типу:</div>
              <div class="error-display__stats-items">
                <span 
                  v-for="(count, type) in errorStats.byType" 
                  :key="type" 
                  class="error-display__stats-item"
                >
                  {{ type }}: {{ count }}
                </span>
              </div>
            </div>
            
            <div class="error-display__stats-section">
              <div class="error-display__stats-label">По операции:</div>
              <div class="error-display__stats-items">
                <span 
                  v-for="(count, op) in errorStats.byOperation" 
                  :key="op" 
                  class="error-display__stats-item"
                >
                  {{ op }}: {{ count }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { errorHandler } from '@/utils/errorHandler'

interface Props {
  error: string
  operation?: string
  canRetry?: boolean
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  operation: 'unknown',
  canRetry: false,
  showDetails: false
})

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()

const showStats = ref(false)

// Получаем детали ошибки если есть operation
const errorStats = computed(() => errorHandler.getErrorStats())

const errorIcon = computed(() => {
  if (props.error.includes('🌐')) return '🌐'
  if (props.error.includes('⏱️')) return '⏱️'
  if (props.error.includes('🔑')) return '🔑'
  if (props.error.includes('🚦')) return '🚦'
  if (props.error.includes('🔍')) return '🔍'
  if (props.error.includes('🛠️')) return '🛠️'
  if (props.error.includes('❌')) return '❌'
  if (props.error.includes('😔')) return '😔'
  return '⚠️'
})

const canShowRetry = computed(() => {
  return props.canRetry && (
    props.error.includes('сетью') ||
    props.error.includes('время ожидания') ||
    props.error.includes('сервер') ||
    props.error.includes('много запросов')
  )
})

const onRetry = () => {
  emit('retry')
}

const onDismiss = () => {
  emit('dismiss')
}
</script>

<style scoped lang="scss">
@use '@/styles/globals' as *;

.error-display {
  @include glassmorphism(rgba(255, 235, 238, 0.9), $blur-sm, rgba($color-error, 0.2));
  border-radius: $radius;
  padding: $spacing-lg;
  margin: $spacing-sm 0;
  border-left: 4px solid $color-error;

  &--danger {
  }

  &--warning {
    background: rgba(255, 248, 225, 0.9);
    border-left-color: $color-warning;
    border-color: rgba($color-warning, 0.2);
  }

  &--info {
    background: rgba(225, 245, 254, 0.9);
    border-left-color: $color-info;
    border-color: rgba($color-info, 0.2);
  }

  &__container {
    display: flex;
    align-items: flex-start;
    gap: $spacing-md;
  }

  &__icon {
    font-size: $font-size-xl;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 2px;
  }

  &__content {
    flex-grow: 1;
    min-width: 0;
  }

  &__message {
    font-weight: $font-weight-medium;
    color: $text-primary;
    line-height: $line-height-relaxed;
    margin-bottom: $spacing-sm;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-top: $spacing-md;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-sm;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: $transition-all;
    background: transparent;
    @include hover-lift(-1px, $shadow-sm);

    &--retry {
      border-color: $color-error;
      color: $color-error;

      &:hover {
        background: $color-error;
        color: $text-white;
      }
    }

    &--details {
      border-color: $color-gray-400;
      color: $color-gray-600;

      &:hover {
        background: $color-gray-100;
        color: $color-gray-800;
      }
    }

    &--dismiss {
      color: $text-muted;
      padding: $spacing-xs;

      &:hover {
        color: $color-error;
        background: rgba($color-error, 0.1);
      }
    }
  }

  &__button-icon {
    font-size: $font-size-sm;
  }

  &__button-text {
  }

  &__stats {
    margin-top: $spacing-lg;
    padding: $spacing-md;
    @include glassmorphism(rgba($color-gray-50, 0.8), $blur-sm, rgba($color-gray-200, 0.5));
    border-radius: $radius-sm;
    @include slide-up($transition-normal, 10px);
  }

  &__stats-content {
    font-size: $font-size-xs;
    color: $text-muted;
  }

  &__stats-title {
    font-weight: $font-weight-semibold;
    color: $text-secondary;
    margin-bottom: $spacing-sm;
  }

  &__stats-section {
    margin-bottom: $spacing-sm;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__stats-label {
    font-weight: $font-weight-medium;
    color: $text-secondary;
    margin-bottom: $spacing-xs;
  }

  &__stats-items {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
  }

  &__stats-item {
    background: rgba($color-primary, 0.1);
    color: $color-primary-dark;
    padding: 2px $spacing-xs;
    border-radius: $radius-sm;
    font-weight: $font-weight-medium;
  }
}

@media (max-width: 576px) {
  .error-display {
    &__container {
      flex-direction: column;
      gap: $spacing-sm;
    }

    &__actions {
      flex-direction: column;
      gap: $spacing-xs;
    }

    &__button {
      justify-content: center;
      width: 100%;
    }

    &__stats-items {
      flex-direction: column;
      gap: $spacing-xs;
    }
  }
}
</style>

<template>
    <div class="error-test-page error-test-page--container">
        <div class="error-test-page__wrapper">
            <div class="error-test-page__content">
                <h1 class="error-test-page__title">🧪 Тестирование обработчика ошибок</h1>

                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Симуляция ошибок</h5>
                    </div>
                    <div class="card-body">
                        <div class="row g-2">
                            <div class="col-md-6">
                                <button class="btn btn-outline-danger w-100" @click="simulateNetworkError">
                                    🌐 Сетевая ошибка
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-outline-warning w-100" @click="simulateTimeoutError">
                                    ⏱️ Таймаут
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-outline-info w-100" @click="simulate404Error">
                                    🔍 404 - Не найдено
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-outline-secondary w-100" @click="simulateRateLimitError">
                                    🚦 Лимит запросов
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-outline-dark w-100" @click="simulateServerError">
                                    🛠️ Ошибка сервера
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-outline-primary w-100" @click="simulateAuthError">
                                    🔑 Ошибка авторизации
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Отображение ошибки -->
                <div v-if="testError" class="mb-4">
                    <h5 class="mb-3">Результат обработки:</h5>
                    <ErrorDisplay :error="testError" operation="test-operation" :can-retry="true" :show-details="true"
                        @retry="() => { }" @dismiss="clearError" />
                </div>

                <!-- Инструкции -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">📖 Как это работает</h5>
                    </div>
                    <div class="card-body">
                        <ol>
                            <li><strong>Нажмите на любую кнопку</strong> чтобы симулировать ошибку</li>
                            <li><strong>Посмотрите на сообщение</strong> - оно будет человеко-понятным</li>
                            <li><strong>Проверьте статистику</strong> в боковой панели</li>
                            <li><strong>Используйте кнопки "Попробовать снова"</strong> если они доступны</li>
                        </ol>

                        <div class="alert alert-info mt-3">
                            <strong>💡 Особенности обработчика:</strong><br>
                            • Автоматически определяет тип ошибки<br>
                            • Показывает понятные сообщения пользователю<br>
                            • Логирует ошибки для аналитики<br>
                            • Предлагает кнопки восстановления где это уместно<br>
                            • Отслеживает частые ошибки<br>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Боковая панель со статистикой -->
            <div class="col-md-4">
                <div class="card sticky-top">
                    <div class="card-header d-flex justify-content-between">
                        <h5 class="mb-0">📊 Статистика ошибок</h5>
                        <button class="btn btn-outline-secondary btn-sm" @click="clearAllErrors">
                            Очистить
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6>По типу:</h6>
                            <div v-if="Object.keys(errorStats.byType).length === 0" class="text-muted">
                                Нет данных
                            </div>
                            <div v-else>
                                <div v-for="(count, type) in errorStats.byType" :key="type"
                                    class="d-flex justify-content-between">
                                    <span class="text-capitalize">{{ type }}:</span>
                                    <span class="badge bg-secondary">{{ count }}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h6>По операции:</h6>
                            <div v-if="Object.keys(errorStats.byOperation).length === 0" class="text-muted">
                                Нет данных
                            </div>
                            <div v-else>
                                <div v-for="(count, operation) in errorStats.byOperation" :key="operation"
                                    class="d-flex justify-content-between">
                                    <span>{{ operation }}:</span>
                                    <span class="badge bg-primary">{{ count }}</span>
                                </div>
                            </div>
                        </div>

                        <hr>
                        <small class="text-muted">
                            💡 В production эти данные можно отправлять на сервер аналитики для мониторинга качества
                            API.
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { errorHandler, handleError } from '@/utils/errorHandler'
import ErrorDisplay from '@/components/ErrorDisplay.vue'

const testError = ref('')
const errorStats = ref(errorHandler.getErrorStats())

// Симуляция различных типов ошибок
function simulateNetworkError() {
    const error = new Error('Network Error')
        ; (error as any).code = 'ERR_NETWORK'

    const result = handleError(error, 'test-operation')
    testError.value = result.userMessage
    updateStats()
}

function simulateTimeoutError() {
    const error = new Error('Timeout')
        ; (error as any).code = 'ECONNABORTED'

    const result = handleError(error, 'test-operation')
    testError.value = result.userMessage
    updateStats()
}

function simulate404Error() {
    const error = new Error('Not Found')
        ; (error as any).response = { status: 404 }

    const result = handleError(error, 'search-cities')
    testError.value = result.userMessage
    updateStats()
}

function simulateRateLimitError() {
    const error = new Error('Too Many Requests')
        ; (error as any).response = { status: 429 }

    const result = handleError(error, 'get-weather')
    testError.value = result.userMessage
    updateStats()
}

function simulateServerError() {
    const error = new Error('Internal Server Error')
        ; (error as any).response = { status: 500 }

    const result = handleError(error, 'get-weather')
    testError.value = result.userMessage
    updateStats()
}

function simulateAuthError() {
    const error = new Error('Unauthorized')
        ; (error as any).response = { status: 401 }

    const result = handleError(error, 'get-weather')
    testError.value = result.userMessage
    updateStats()
}

function updateStats() {
    errorStats.value = errorHandler.getErrorStats()
}

function clearError() {
    testError.value = ''
}

function clearAllErrors() {
    errorHandler.clearErrorLog()
    testError.value = ''
    updateStats()
}
</script>


<style scoped lang="scss">
@use '@/styles/globals' as *;

.error-test-page {
  max-width: 1000px;
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
  .error-test-page {
    padding: $spacing-md;

    &__title {
      font-size: $font-size-xl;
    }
  }
}
</style>
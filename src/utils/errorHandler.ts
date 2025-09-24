import type { AxiosError, ErrorDetails, ErrorContext } from '@/types/errors'

//централизованный обработчик ошибок для всего приложения
//унифицирует обработку сетевых ошибок, лимитов API, 404 и других исключений

export class ErrorHandler {
    private static instance: ErrorHandler
    private errorLog: Array<ErrorDetails & ErrorContext> = []

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler()
        }
        return ErrorHandler.instance
    }

    //основной метод для обработки любых ошибок
    handle(error: unknown, context: ErrorContext): ErrorDetails {
        const errorDetails = this.parseError(error, context)

        // Логируем ошибку
        this.logError(errorDetails, context)

        // Дополнительная обработка в зависимости от типа
        this.processError(errorDetails, context)

        return errorDetails
    }

    //парсинг различных типов ошибок в унифицированный формат
    private parseError(error: unknown, context: ErrorContext): ErrorDetails {
        // Проверяем, что это отмененный запрос - не показываем пользователю
        if (this.isCancelledRequest(error)) {
            return {
                type: 'unknown',
                code: 'CANCELLED',
                message: 'Request was cancelled',
                userMessage: '',
                canRetry: false,
                severity: 'low'
            }
        }

        const axiosError = error as AxiosError

        // Сетевые ошибки
        if (axiosError?.code === 'ERR_NETWORK') {
            return {
                type: 'network',
                code: 'ERR_NETWORK',
                message: 'Network connection failed',
                userMessage: '🌐 Проблемы с интернет-соединением. Проверьте подключение и попробуйте снова.',
                canRetry: true,
                severity: 'medium'
            }
        }

        // Таймауты
        if (axiosError?.code === 'ECONNABORTED' || axiosError?.code === 'ERR_TIMEOUT') {
            return {
                type: 'timeout',
                code: axiosError.code,
                message: 'Request timeout',
                userMessage: '⏱️ Превышено время ожидания. Сервер отвечает медленно, попробуйте через несколько секунд.',
                canRetry: true,
                severity: 'medium'
            }
        }

        // HTTP статус коды
        if (axiosError?.response?.status) {
            return this.parseHttpError(axiosError.response.status, context)
        }

        // Неизвестная ошибка
        return {
            type: 'unknown',
            code: 'UNKNOWN',
            message: error instanceof Error ? error.message : 'Unknown error',
            userMessage: this.getGenericErrorMessage(context.operation),
            canRetry: false,
            severity: 'medium'
        }
    }

    //обработка HTTP ошибок по статус кодам
    private parseHttpError(status: number, context: ErrorContext): ErrorDetails {
        switch (status) {
            case 400:
                return {
                    type: 'config',
                    code: 400,
                    message: 'Bad Request',
                    userMessage: '❌ Ошибка конфигурации. Проверьте API ключ OpenWeatherMap в файле .env.local',
                    canRetry: false,
                    severity: 'high'
                }

            case 401:
                return {
                    type: 'auth',
                    code: 401,
                    message: 'Unauthorized',
                    userMessage: '🔑 Проблема с доступом к сервису. Обратитесь к администратору.',
                    canRetry: false,
                    severity: 'high'
                }

            case 403:
                return {
                    type: 'auth',
                    code: 403,
                    message: 'Forbidden',
                    userMessage: '🚫 Доступ запрещен. Проверьте права доступа.',
                    canRetry: false,
                    severity: 'high'
                }

            case 404:
                return {
                    type: 'notfound',
                    code: 404,
                    message: 'Not Found',
                    userMessage: this.get404Message(context.operation),
                    canRetry: false,
                    severity: 'low'
                }

            case 429:
                return {
                    type: 'ratelimit',
                    code: 429,
                    message: 'Too Many Requests',
                    userMessage: '🚦 Слишком много запросов. Подождите немного перед следующей попыткой.',
                    canRetry: true,
                    retryAfter: 60, // По умолчанию ждем 1 минуту
                    severity: 'medium'
                }

            case 500:
            case 502:
            case 503:
            case 504:
                return {
                    type: 'server',
                    code: status,
                    message: 'Server Error',
                    userMessage: '🛠️ Сервер временно недоступен. Попробуйте через несколько минут.',
                    canRetry: true,
                    severity: 'high'
                }

            default:
                return {
                    type: 'unknown',
                    code: status,
                    message: `HTTP ${status}`,
                    userMessage: `❌ Ошибка сервиса (код: ${status}). Попробуйте позже.`,
                    canRetry: false,
                    severity: 'medium'
                }
        }
    }

    //проверка, является ли ошибка отмененным запросом
    private isCancelledRequest(error: unknown): boolean {
        const axiosError = error as AxiosError
        return axiosError?.code === 'ERR_CANCELED' ||
            axiosError?.name === 'CanceledError' ||
            axiosError?.name === 'AbortError'
    }

    //генерация сообщений 404 в зависимости от операции
    private get404Message(operation: string): string {
        switch (operation) {
            case 'search-cities':
                return '🔍 Города с таким названием не найдены. Попробуйте другое написание.'
            case 'get-weather':
                return '🌤️ Данные о погоде для этого местоположения не найдены.'
            case 'get-forecast':
                return '📅 Прогноз для этого города недоступен.'
            default:
                return '❓ Запрашиваемые данные не найдены.'
        }
    }

    //генерация общих сообщений об ошибках
    private getGenericErrorMessage(operation: string): string {
        switch (operation) {
            case 'search-cities':
                return '😔 Не удалось найти города. Проверьте написание и попробуйте снова.'
            case 'get-weather':
                return '🌡️ Не удалось загрузить данные о погоде. Попробуйте обновить страницу.'
            case 'get-forecast':
                return '📊 Не удалось загрузить прогноз погоды. Попробуйте снова.'
            default:
                return '❌ Произошла ошибка. Попробуйте повторить операцию.'
        }
    }

    //логирование ошибок для аналитики
    private logError(errorDetails: ErrorDetails, context: ErrorContext): void {
        const logEntry = {
            ...errorDetails,
            ...context,
            timestamp: Date.now()
        }

        // Добавляем в локальный лог
        this.errorLog.push(logEntry)

        // Ограничиваем размер лога
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(-50)
        }

        // В production можно отправлять на сервер аналитики
        if (errorDetails.severity === 'critical' || errorDetails.severity === 'high') {
            console.error('Critical error:', logEntry)
        } else if (import.meta.env.DEV) {
            console.warn('Error handled:', logEntry)
        }
    }

    //дополнительная обработка ошибок
    private processError(errorDetails: ErrorDetails, context: ErrorContext): void {
        // Обработка rate limit - можно показать countdown
        if (errorDetails.type === 'ratelimit' && errorDetails.retryAfter) {
            // Можно добавить логику для показа таймера обратного отсчета
        }

        // Обработка критических ошибок аутентификации
        if (errorDetails.type === 'auth' && errorDetails.severity === 'high') {
            // Можно добавить редирект на страницу настроек API ключа
        }

        // Автоматическое логирование частых ошибок
        if (this.isFrequentError(context.operation, errorDetails.type)) {
            console.warn(`Frequent ${errorDetails.type} errors in ${context.operation}`)
        }
    }

    //проверка частых ошибок одного типа
    private isFrequentError(operation: string, errorType: string): boolean {
        const recentErrors = this.errorLog
            .filter(log => log.operation === operation && log.type === errorType)
            .filter(log => Date.now() - log.timestamp < 5 * 60 * 1000) // За последние 5 минут

        return recentErrors.length >= 3
    }

    //получение статистики ошибок
    getErrorStats(): { byType: Record<string, number>; byOperation: Record<string, number> } {
        const byType: Record<string, number> = {}
        const byOperation: Record<string, number> = {}

        this.errorLog.forEach(log => {
            byType[log.type] = (byType[log.type] || 0) + 1
            byOperation[log.operation] = (byOperation[log.operation] || 0) + 1
        })

        return { byType, byOperation }
    }

    //очистка логов ошибок
    clearErrorLog(): void {
        this.errorLog = []
    }

    //простой метод для быстрой обработки ошибок
    getErrorMessage(error: unknown, operation: string): string {
        const errorDetails = this.handle(error, {
            operation,
            timestamp: Date.now()
        })

        return errorDetails.userMessage
    }
}

// Экспортируем singleton
export const errorHandler = ErrorHandler.getInstance()

// Вспомогательная функция для быстрого использования
export function handleError(error: unknown, operation: string, params?: any): ErrorDetails {
    return errorHandler.handle(error, {
        operation,
        params,
        timestamp: Date.now()
    })
}

// Функция для получения только сообщения пользователю
export function getErrorMessage(error: unknown, operation: string): string {
    return errorHandler.getErrorMessage(error, operation)
}

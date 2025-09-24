//менеджер запросов с поддержкой отмены, debounce/throttle и retry
//автоматически отменяет предыдущие запросы при новых

import { retryOperation } from './retryHandler'

export interface RequestOptions {
  debounceMs?: number
  throttleMs?: number
  timeoutMs?: number
  retries?: number
  strategy?: 'debounce' | 'throttle' | 'both'
  enableRetry?: boolean
  retryConfig?: 'AGGRESSIVE' | 'STANDARD' | 'CONSERVATIVE' | 'FAST'
}

export class RequestManager {
  private activeRequests = new Map<string, AbortController>()
  private debounceTimers = new Map<string, number>()
  private throttleTimers = new Map<string, number>()
  private lastRequestTimes = new Map<string, number>()
  private requestIds = new Map<string, number>()

  //отменяет активный запрос по ключу
  cancelRequest(key: string): void {
    const controller = this.activeRequests.get(key)
    if (controller) {
      controller.abort()
      this.activeRequests.delete(key)
    }

    const debounceTimer = this.debounceTimers.get(key)
    if (debounceTimer) {
      window.clearTimeout(debounceTimer)
      this.debounceTimers.delete(key)
    }

    const throttleTimer = this.throttleTimers.get(key)
    if (throttleTimer) {
      window.clearTimeout(throttleTimer)
      this.throttleTimers.delete(key)
    }
  }

  //создает новый AbortController для запроса
  createRequest(key: string): AbortController {
    // Отменяем предыдущий запрос
    this.cancelRequest(key)

    // Создаем новый контроллер
    const controller = new AbortController()
    this.activeRequests.set(key, controller)

    // Увеличиваем счетчик запросов для отслеживания race conditions
    const currentId = (this.requestIds.get(key) || 0) + 1
    this.requestIds.set(key, currentId)

    return controller
  }

  //выполняет запрос с debounce/throttle и автоматической отменой предыдущих
  async executeWithThrottleDebounce<T>(
    key: string,
    requestFn: (signal: AbortSignal, requestId: number) => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T | null> {
    const { 
      debounceMs = 300, 
      throttleMs = 1000, 
      timeoutMs = 10000, 
      strategy = 'debounce',
      enableRetry = false,
      retryConfig = 'STANDARD'
    } = options

    return new Promise((resolve, reject) => {
      const now = Date.now()
      const lastRequestTime = this.lastRequestTimes.get(key) || 0
      
      const executeRequest = async () => {
        try {
          this.lastRequestTimes.set(key, now)
          
          // Обертка для запроса с retry, если включен
          const requestWithRetry = enableRetry 
            ? () => this.executeRequestOnce(key, requestFn, timeoutMs)
            : () => this.executeRequestOnce(key, requestFn, timeoutMs)

          const result = enableRetry
            ? await retryOperation(requestWithRetry, retryConfig || 'STANDARD')
            : await requestWithRetry()
            
          // Проверяем, что это все еще актуальный запрос
          const currentRequestId = this.requestIds.get(key)!
          if (this.requestIds.get(key) === currentRequestId) {
            resolve(result)
          } else {
            // Запрос устарел, игнорируем результат
            resolve(null)
          }
        } catch (error) {
          // Не показываем ошибки для отмененных запросов
          if (error instanceof Error && 
              (error.name === 'AbortError' || 
               (error as any).code === 'ERR_CANCELED' ||
               (error as any).name === 'CanceledError')) {
            resolve(null)
          } else {
            reject(error)
          }
        }
      }

      // Применяем стратегию throttle/debounce
      if (strategy === 'throttle') {
        // Throttle: ограничиваем частоту выполнения
        if (now - lastRequestTime >= throttleMs) {
          executeRequest()
        } else {
          // Устанавливаем таймер на следующий возможный запрос
          const remainingTime = throttleMs - (now - lastRequestTime)
          const existingTimer = this.throttleTimers.get(key)
          if (existingTimer) {
            window.clearTimeout(existingTimer)
          }
          
          const timer = window.setTimeout(() => {
            this.throttleTimers.delete(key)
            executeRequest()
          }, remainingTime)
          
          this.throttleTimers.set(key, timer)
        }
      } else if (strategy === 'debounce') {
        // Debounce: откладываем выполнение
        const existingTimer = this.debounceTimers.get(key)
        if (existingTimer) {
          window.clearTimeout(existingTimer)
        }

        const timer = window.setTimeout(() => {
          this.debounceTimers.delete(key)
          executeRequest()
        }, debounceMs)

        this.debounceTimers.set(key, timer)
      } else if (strategy === 'both') {
        // Комбинируем: throttle + debounce
        if (now - lastRequestTime >= throttleMs) {
          // Если прошло достаточно времени, применяем только debounce
          const existingTimer = this.debounceTimers.get(key)
          if (existingTimer) {
            window.clearTimeout(existingTimer)
          }

          const timer = window.setTimeout(() => {
            this.debounceTimers.delete(key)
            executeRequest()
          }, debounceMs)

          this.debounceTimers.set(key, timer)
        } else {
          // Иначе откладываем до окончания throttle периода + debounce
          const remainingThrottleTime = throttleMs - (now - lastRequestTime)
          const totalDelay = remainingThrottleTime + debounceMs
          
          const existingTimer = this.debounceTimers.get(key)
          if (existingTimer) {
            window.clearTimeout(existingTimer)
          }

          const timer = window.setTimeout(() => {
            this.debounceTimers.delete(key)
            executeRequest()
          }, totalDelay)

          this.debounceTimers.set(key, timer)
        }
      }
    })
  }

  //выполняет одиночный запрос с timeout
  private async executeRequestOnce<T>(
    key: string,
    requestFn: (signal: AbortSignal, requestId: number) => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const controller = this.createRequest(key)
    const requestId = this.requestIds.get(key)!

    // Добавляем timeout
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      const result = await requestFn(controller.signal, requestId)
      clearTimeout(timeoutId)
      this.activeRequests.delete(key)
      return result
    } catch (error) {
      clearTimeout(timeoutId)
      this.activeRequests.delete(key)
      throw error
    }
  }

  //обратная совместимость с предыдущим методом
  async executeWithDebounce<T>(
    key: string,
    requestFn: (signal: AbortSignal, requestId: number) => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T | null> {
    return this.executeWithThrottleDebounce(key, requestFn, { ...options, strategy: 'debounce' })
  }

  //отменяет все активные запросы
  cancelAllRequests(): void {
    for (const [key] of this.activeRequests) {
      this.cancelRequest(key)
    }
  }

  //проверяет, есть ли активный запрос
  hasActiveRequest(key: string): boolean {
    return this.activeRequests.has(key)
  }

  //получает статистику активных запросов
  getStats(): { activeRequests: number; pendingDebounces: number } {
    return {
      activeRequests: this.activeRequests.size,
      pendingDebounces: this.debounceTimers.size
    }
  }

  //очищает все ресурсы (для cleanup в onBeforeUnmount)
  destroy(): void {
    this.cancelAllRequests()
    this.requestIds.clear()
  }
}

// Предустановленные конфигурации для разных типов запросов
export const REQUEST_CONFIGS = {
  // Для поиска - агрессивный debounce, минимальное спамление API
  SEARCH: {
    debounceMs: 350,        // Ждем 350ms после последнего ввода
    throttleMs: 1000,       // Максимум 1 запрос в секунду
    timeoutMs: 8000,        // Таймаут 8 секунд
    strategy: 'debounce' as const,
    enableRetry: true,
    retryConfig: 'CONSERVATIVE' as const
  },
  
  // Для автокомплита - быстрая реакция, умеренное ограничение
  AUTOCOMPLETE: {
    debounceMs: 200,        // Быстрая реакция
    throttleMs: 500,        // До 2 запросов в секунду
    timeoutMs: 5000,
    strategy: 'debounce' as const,
    enableRetry: false      // Не повторяем автокомплит
  },
  
  // Для обновления данных - комбинированная стратегия
  REFRESH: {
    debounceMs: 100,        // Минимальная задержка
    throttleMs: 2000,       // Не чаще раза в 2 секунды
    timeoutMs: 10000,
    strategy: 'both' as const,
    enableRetry: true,
    retryConfig: 'STANDARD' as const
  },
  
  // Для критичных запросов - только throttle
  CRITICAL: {
    debounceMs: 0,          // Без debounce
    throttleMs: 3000,       // Строгое ограничение частоты
    timeoutMs: 15000,       // Больший таймаут
    strategy: 'throttle' as const,
    enableRetry: true,
    retryConfig: 'AGGRESSIVE' as const
  }
} as const

// Экспортируем singleton для глобального использования
export const globalRequestManager = new RequestManager()

import type { ErrorDetails } from '@/types/errors'

//обработчик повторных попыток с экспоненциальным backoff
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryCondition?: (error: ErrorDetails) => boolean
}

export class RetryHandler {
  private static defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,      // 1 секунда
    maxDelay: 10000,      // 10 секунд
    retryCondition: (error) => error.canRetry && 
      ['network', 'timeout', 'server'].includes(error.type)
  }

  //выполняет операцию с автоматическими повторными попытками
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config }
    let lastError: any

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Если это последняя попытка, прекращаем
        if (attempt === finalConfig.maxRetries) {
          break
        }

        // Проверяем, стоит ли повторять
        if (finalConfig.retryCondition) {
          // Для проверки условия нужно обработать ошибку
          // Упрощенная проверка на основе кода ошибки
          const shouldRetry = this.shouldRetryError(error)
          if (!shouldRetry) {
            break
          }
        }

        // Вычисляем задержку с экспоненциальным backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(2, attempt),
          finalConfig.maxDelay
        )

        // Добавляем случайность (jitter) ±25%
        const jitter = delay * 0.25 * (Math.random() - 0.5)
        const finalDelay = Math.max(100, delay + jitter)

        console.log(`Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${Math.round(finalDelay)}ms`)
        
        await this.sleep(finalDelay)
      }
    }

    throw lastError
  }

  //простая проверка, стоит ли повторять запрос
  private static shouldRetryError(error: any): boolean {
    // Сетевые ошибки
    if (error?.code === 'ERR_NETWORK') return true
    
    // Таймауты
    if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_TIMEOUT') return true
    
    // Серверные ошибки 5xx
    if (error?.response?.status >= 500) return true
    
    // 429 Too Many Requests (с осторожностью)
    if (error?.response?.status === 429) return true
    
    // Не повторяем для других ошибок
    return false
  }

  //промисифицированный sleep
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  //создает retry wrapper для функции
  static createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    config: Partial<RetryConfig> = {}
  ): T {
    return ((...args: Parameters<T>) => {
      return this.withRetry(() => fn(...args), config)
    }) as T
  }
}

// Предустановленные конфигурации для разных сценариев
export const RETRY_CONFIGS = {
  // Агрессивные повторы для критичных операций
  AGGRESSIVE: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 8000
  },
  
  // Стандартные повторы для обычных запросов
  STANDARD: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  },
  
  // Консервативные повторы для поиска
  CONSERVATIVE: {
    maxRetries: 2,
    baseDelay: 1500,
    maxDelay: 3000
  },
  
  // Быстрые повторы для UI операций
  FAST: {
    maxRetries: 2,
    baseDelay: 300,
    maxDelay: 1000
  }
} as const

// Функция-обертка для удобного использования
export async function retryOperation<T>(
  operation: () => Promise<T>,
  configName: keyof typeof RETRY_CONFIGS = 'STANDARD'
): Promise<T> {
  return RetryHandler.withRetry(operation, RETRY_CONFIGS[configName])
}

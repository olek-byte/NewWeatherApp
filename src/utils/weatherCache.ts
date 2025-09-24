import type { WeatherCache, WeatherCacheItem, CacheConfig } from '@/types/cache'

const CACHE_KEY = 'weather_cache'
const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 5 * 60 * 1000, // 5 минут в миллисекундах
  maxSize: 50 // максимум 50 городов в кэше
}

class WeatherCacheManager {
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  //генерирует ключ кэша на основе координат
  private generateKey(lat: number, lon: number): string {
    // Округляем координаты до 3 знаков после запятой (точность ~100м)
    return `${lat.toFixed(3)},${lon.toFixed(3)}`
  }

  //загружает кэш из localStorage
  private loadCache(): WeatherCache {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      return cached ? JSON.parse(cached) : {}
    } catch (error) {
      console.warn('Failed to load weather cache:', error)
      return {}
    }
  }

  //сохраняет кэш в localStorage
  private saveCache(cache: WeatherCache): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to save weather cache:', error)
    }
  }

  //проверяет, не устарел ли элемент кэша
  private isExpired(item: WeatherCacheItem): boolean {
    return Date.now() - item.timestamp > this.config.maxAge
  }

  //очищает устаревшие элементы кэша
  private cleanupExpired(cache: WeatherCache): WeatherCache {
    const cleaned: WeatherCache = {}
    
    for (const [key, item] of Object.entries(cache)) {
      if (!this.isExpired(item)) {
        cleaned[key] = item
      }
    }
    
    return cleaned
  }

  //ограничивает размер кэша, удаляя самые старые элементы
  private limitSize(cache: WeatherCache): WeatherCache {
    const entries = Object.entries(cache)
    
    if (entries.length <= this.config.maxSize) {
      return cache
    }

    // Сортируем по времени создания (самые новые первыми)
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
    
    // Берем только maxSize самых новых элементов
    const limited: WeatherCache = {}
    entries.slice(0, this.config.maxSize).forEach(([key, item]) => {
      limited[key] = item
    })
    
    return limited
  }

  //получает данные из кэша
  get(lat: number, lon: number): WeatherCacheItem | null {
    const key = this.generateKey(lat, lon)
    const cache = this.loadCache()
    const item = cache[key]

    if (!item || this.isExpired(item)) {
      return null
    }

    return item
  }

  //сохраняет данные в кэш
  set(lat: number, lon: number, data: Omit<WeatherCacheItem, 'timestamp'>): void {
    const key = this.generateKey(lat, lon)
    let cache = this.loadCache()

    // Добавляем новый элемент с текущим временем
    cache[key] = {
      ...data,
      timestamp: Date.now()
    }

    // Очищаем устаревшие элементы
    cache = this.cleanupExpired(cache)
    
    // Ограничиваем размер кэша
    cache = this.limitSize(cache)

    // Сохраняем в localStorage
    this.saveCache(cache)
  }

  //проверяет, есть ли свежие данные в кэше
  has(lat: number, lon: number): boolean {
    return this.get(lat, lon) !== null
  }

  //очищает весь кэш
  clear(): void {
    localStorage.removeItem(CACHE_KEY)
  }

  //удаляет устаревшие элементы из кэша
  cleanup(): void {
    let cache = this.loadCache()
    cache = this.cleanupExpired(cache)
    this.saveCache(cache)
  }

  //получает информацию о кэше
  getStats(): { size: number; oldestTimestamp: number; newestTimestamp: number } {
    const cache = this.loadCache()
    const entries = Object.values(cache)

    if (entries.length === 0) {
      return { size: 0, oldestTimestamp: 0, newestTimestamp: 0 }
    }

    const timestamps = entries.map(item => item.timestamp)
    
    return {
      size: entries.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps)
    }
  }
}

// Экспортируем синглтон для использования во всем приложении
export const weatherCache = new WeatherCacheManager()

// Экспортируем класс для тестирования или создания кастомных экземпляров
export { WeatherCacheManager }

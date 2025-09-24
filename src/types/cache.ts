export interface WeatherCacheItem {
  data: {
    city: string
    temp: number
    desc: string
    icon: string
    wind: number
    humidity: number
    pressure: number
  }
  forecast: Array<{
    dateISO: string
    dayLabel: string
    min: number
    max: number
    icon: string
    desc: string
  }>
  timestamp: number
}

export interface WeatherCache {
  [key: string]: WeatherCacheItem
}

export interface CacheConfig {
  maxAge: number // время жизни кэша в миллисекундах
  maxSize: number // максимальное количество элементов в кэше
}

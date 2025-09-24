import type { OWMGeoItem } from '@/types/geo'
import { http } from './http'

// Axios
export async function searchCities(
  query: string,
  limit = 5,
  signal?: AbortSignal
): Promise<OWMGeoItem[]> {
  if (!query || query.trim().length < 2) return []
  
  try {
    const { data } = await http.get<OWMGeoItem[]>('/geo/1.0/direct', {
      params: { q: query, limit },  // OpenWeatherMap API ожидает параметр 'q'
      signal, 
    })
    
    if (import.meta.env.DEV) {
      console.log(`🔍 Поиск городов для "${query}":`, data)
    }
    
    return data || []
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`❌ Ошибка поиска городов для "${query}":`, error)
    }
    throw error
  }
}

/*
// Фейковы Апи слой 
import type { OWMGeoItem } from '@/types/geo'
import { GEO_MOCK } from '@/mocks/geo.mock'

// Возвращаем Promise, чтобы код компонента выглядел как с настоящим API - фейк сервер.
export async function searchCities(q: string, limit = 5, signal?: AbortSignal): Promise<OWMGeoItem[]> {
  if (!q || q.trim().length < 2) return []

  // Имитируем сетевую задержку
  const delay = (ms: number) => new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => resolve(), ms)
    // Поддержка отмены (как у axios.abort())
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(id)
        reject(Object.assign(new Error('Canceled'), { code: 'ERR_CANCELED', name: 'CanceledError' }))
      })
    }
  })

  await delay(300) // 300мс — как будто сеть думает

  const norm = (s: string) => s.toLowerCase()
  const qn = norm(q)

  const filtered = GEO_MOCK.filter(i =>
    norm(i.name).includes(qn) ||
    (i.state && norm(i.state).includes(qn)) ||
    norm(i.country).includes(qn)
  ).slice(0, limit)

  return filtered
}
  */
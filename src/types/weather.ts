export interface OWMWeatherItem { description: string; icon: string }
export interface OWMMain { temp: number; pressure: number; humidity: number }
export interface OWMWind { speed: number }
export interface OWMCurrentResp {
  name: string
  weather: OWMWeatherItem[]
  main: OWMMain
  wind: OWMWind
}

// для forecast 
export interface OWMForecastItem {
  dt: number
  main: { temp: number; temp_min: number; temp_max: number }
  weather: OWMWeatherItem[]
}

export interface OWMForecastResp {
  list: OWMForecastItem[]
  city: { timezone: number } // смещение в секундах от UTC
}

// Вью-модель для краткого прогноза
export interface BriefForecastPoint {
  dateISO: string      // "2025-09-22"
  dayLabel: string     // "Пн" / "Вт" (локаль)
  min: number
  max: number
  icon: string
  desc: string
}
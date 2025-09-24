
export interface WeatherContext {
  city: string
  temp: number
  description: string
  humidity: number
  windSpeed: number
  pressure: number
  icon: string
  timeOfDay?: 'morning' | 'day' | 'evening' | 'night'
}

export interface ForecastContext {
  forecast?: Array<{
    dayLabel: string
    min: number
    max: number
    desc: string
  }>
}

export class AIPromptGenerator {

  static generateWeatherAdvicePrompt(
    weather: WeatherContext,
    forecast?: ForecastContext
  ): string {
    const { city, temp, description, humidity, windSpeed } = weather
    
    // Определяем время суток на основе текущего времени
    const hour = new Date().getHours()
    const timeOfDay = this.getTimeOfDay(hour)
    
    // Формируем базовый контекст
    const tempDescription = this.getTemperatureDescription(temp)
    const weatherCondition = this.translateWeatherDescription(description)
    const windCondition = this.getWindDescription(windSpeed)
    const humidityCondition = this.getHumidityDescription(humidity)
    
    // Добавляем прогноз если есть
    const forecastInfo = forecast?.forecast?.length 
      ? this.getForecastSummary(forecast.forecast.slice(0, 2))
      : ''
    
    // Генерируем короткий промпт (≤40 слов)
    const prompt = [
      `Weather advice for ${city}:`,
      `${tempDescription} ${temp}°C,`,
      `${weatherCondition},`,
      windCondition ? `${windCondition},` : '',
      humidityCondition ? `${humidityCondition},` : '',
      `${timeOfDay}.`,
      forecastInfo,
      'Give brief personal advice (clothing, activities, health tips). Answer in Russian.'
    ].filter(Boolean).join(' ')
    
    // Обрезаем до 40 слов если нужно
    return this.truncateToWordLimit(prompt, 40)
  }

  //генерирует промпт для сравнения городов
  static generateComparisonPrompt(
    currentWeather: WeatherContext,
    ...otherCities: WeatherContext[]
  ): string {
    const cities = [currentWeather, ...otherCities].slice(0, 3) // Максимум 3 города
    
    const comparisons = cities.map(w => 
      `${w.city}: ${w.temp}°C, ${this.translateWeatherDescription(w.description)}`
    ).join('; ')
    
    const prompt = `Compare weather: ${comparisons}. Best choice for outdoor activities? Russian please.`
    
    return this.truncateToWordLimit(prompt, 35)
  }

   //генерирует промпт для планирования активности
  static generateActivityPrompt(
    weather: WeatherContext,
    activity: string
  ): string {
    const { temp, description, windSpeed, humidity } = weather
    const weatherCondition = this.translateWeatherDescription(description)
    
    const prompt = `Weather for ${activity}: ${temp}°C, ${weatherCondition}, wind ${windSpeed}m/s, humidity ${humidity}%. Is it suitable? Tips in Russian.`
    
    return this.truncateToWordLimit(prompt, 35)
  }

   //Определяет время суток
  private static getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  //описание температуры
  private static getTemperatureDescription(temp: number): string {
    if (temp < -10) return 'Very cold'
    if (temp < 0) return 'Cold'
    if (temp < 10) return 'Cool'
    if (temp < 20) return 'Mild'
    if (temp < 30) return 'Warm'
    return 'Hot'
  }
  
   //перевод описания погоды на английский
  private static translateWeatherDescription(desc: string): string {
    const translations: Record<string, string> = {
      'ясно': 'clear',
      'солнечно': 'sunny',
      'облачно': 'cloudy',
      'пасмурно': 'overcast',
      'дождь': 'rain',
      'снег': 'snow',
      'туман': 'fog',
      'гроза': 'thunderstorm',
      'ветрено': 'windy'
    }
    
    const lowerDesc = desc.toLowerCase()
    for (const [ru, en] of Object.entries(translations)) {
      if (lowerDesc.includes(ru)) return en
    }
    
    // Если перевод не найден, возвращаем оригинал
    return desc.length > 15 ? desc.substring(0, 15) : desc
  }
  
   //описание ветра
  private static getWindDescription(windSpeed: number): string {
    if (windSpeed < 2) return ''
    if (windSpeed < 5) return 'light breeze'
    if (windSpeed < 10) return 'moderate wind'
    return 'strong wind'
  }

   //описание влажности
  private static getHumidityDescription(humidity: number): string {
    if (humidity < 30) return 'dry air'
    if (humidity > 80) return 'high humidity'
    return ''
  }

   //краткое описание прогноза
  private static getForecastSummary(forecast: Array<{ dayLabel: string; min: number; max: number; desc: string }>): string {
    if (!forecast.length) return ''
    
    const tomorrow = forecast[0]
    if (tomorrow) {
      return `Tomorrow: ${tomorrow.min}-${tomorrow.max}°C.`
    }
    return ''
  }

   //обрезает текст до указанного количества слов
  private static truncateToWordLimit(text: string, maxWords: number): string {
    const words = text.split(/\s+/)
    if (words.length <= maxWords) return text
    
    return words.slice(0, maxWords).join(' ') + '...'
  }

   //предустановленные шаблоны для разных ситуаций
  static getQuickPrompts(weather: WeatherContext): Array<{
    title: string
    prompt: string
    icon: string
  }> {
    return [
      {
        title: 'Общие советы',
        prompt: AIPromptGenerator.generateWeatherAdvicePrompt(weather),
        icon: '💡'
      },
      {
        title: 'Одежда',
        prompt: `What to wear today? ${weather.temp}°C, ${weather.description}. Clothing advice in Russian.`,
        icon: '👔'
      },
      {
        title: 'Активности',
        prompt: `Best activities for ${weather.temp}°C ${weather.description} weather? Russian tips.`,
        icon: '🏃‍♂️'
      },
      {
        title: 'Здоровье',
        prompt: `Health tips for ${weather.temp}°C, humidity ${weather.humidity}%, ${weather.description}? Russian advice.`,
        icon: '🏥'
      }
    ]
  }
}

// Экспортируем основные функции для удобства
export const generateWeatherAdvice = AIPromptGenerator.generateWeatherAdvicePrompt
export const generateActivityAdvice = AIPromptGenerator.generateActivityPrompt
export const getQuickPrompts = AIPromptGenerator.getQuickPrompts

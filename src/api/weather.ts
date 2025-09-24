import { http } from './http'
import type { OWMCurrentResp } from '@/types/weather'
import type { OWMForecastResp, BriefForecastPoint } from '@/types/weather'

export async function getCurrentWeatherByCoords(lat: number, lon: number, signal?: AbortSignal) {
    const { data } = await http.get<OWMCurrentResp>('/data/2.5/weather', {
        params: { lat, lon }, // units/appid подставятся из http.ts
        signal
    })
    return {
        city: data.name,
        temp: Math.round(data.main.temp),
        desc: data.weather[0]?.description ?? '',
        icon: data.weather[0]?.icon ?? '01d',
        wind: data.wind.speed,      // м/с
        humidity: data.main.humidity, // %
        pressure: data.main.pressure  // гПа
    }
}

// Локальная дата (YYYY-MM-DD) по смещению timezone (секунды)
function localDateYMD(dtSec: number, tzOffsetSec: number): string {
    const d = new Date((dtSec + tzOffsetSec) * 1000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// Локальный ярлык дня недели
function dayShortLabel(dtSec: number, tzOffsetSec: number, locale = navigator.language): string {
    const d = new Date((dtSec + tzOffsetSec) * 1000)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
        .replace('.', '') // некоторые локали ставят точки
}

// Выбор "лучшей" иконки на день: приоритет слотов около 12–15 часов; иначе — самая частая
function pickIconDescForDay(items: { dt: number; icon: string; desc: string }[], tz: number) {
    if (!items.length) return { dt: 0, icon: '01d', desc: 'clear sky' }
    let best = items[0]
    let bestScore = Number.POSITIVE_INFINITY
    for (const it of items) {
        const localHour = new Date((it.dt + tz) * 1000).getUTCHours()
        const score = Math.abs(localHour - 13) // середина дня как ориентир
        if (score < bestScore) { best = it; bestScore = score }
    }
    return best
}

// Краткий прогноз на N дней (3–5 точек). days: сколько "точек" вернуть (по умолчанию 4: сегодня + 3 дня)
export async function getBriefForecastByCoords(
    lat: number,
    lon: number,
    days = 4,
    signal?: AbortSignal
): Promise<BriefForecastPoint[]> {
    const { data } = await http.get<OWMForecastResp>('/data/2.5/forecast', {
        params: { lat, lon },
        signal
    })
    const tz = data.city.timezone ?? 0

    // Группируем 3-часовые слоты по локальной дате YYYY-MM-DD
    const byDay = new Map<string, { dt: number; min: number; max: number; icons: { dt: number; icon: string; desc: string }[] }>()
    for (const item of data.list) {
        const ymd = localDateYMD(item.dt, tz)
        const entry = byDay.get(ymd) ?? { dt: item.dt, min: item.main.temp_min, max: item.main.temp_max, icons: [] }
        entry.dt = Math.min(entry.dt, item.dt) // для сортировки по дате
        entry.min = Math.min(entry.min, item.main.temp_min)
        entry.max = Math.max(entry.max, item.main.temp_max)
        entry.icons.push({ dt: item.dt, icon: item.weather[0]?.icon ?? '01d', desc: item.weather[0]?.description ?? '' })
        byDay.set(ymd, entry)
    }

    // Сортируем дни по дате и собираем точки
    const points: BriefForecastPoint[] = Array
        .from(byDay.entries())
        .sort((a, b) => a[1].dt - b[1].dt)
        .slice(0, Math.max(3, Math.min(days, 5)))
        .map(([ymd, info]) => {
            const best = pickIconDescForDay(info.icons, tz)
            return {
                dateISO: ymd,
                dayLabel: dayShortLabel(info.dt, tz),
                min: Math.round(info.min),
                max: Math.round(info.max),
                icon: best?.icon ?? '01d',
                desc: best?.desc ?? 'clear sky'
            }
        })

    return points
}
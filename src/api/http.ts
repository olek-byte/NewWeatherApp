import axios from 'axios'

export const http = axios.create({
    baseURL: 'https://api.openweathermap.org',
    timeout: 10000, // 10s 
    params: {
        appid: import.meta.env.VITE_OWM_API_KEY,
        units: 'metric'
    },
})
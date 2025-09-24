export interface ApiError {
    code?: string
    name?: string
    message: string
    status?: number
    response?: {
        status: number
        data: any
    }
}

export interface NetworkError extends Error {
    code: string
    response?: {
        status: number
        data: any
    }
}

// Axios error type
export interface AxiosError extends Error {
    code?: string
    response?: {
        status: number
        data: any
        statusText?: string
    }
    request?: any
    config?: any
}

// Унифицированные типы ошибок для обработчика
export interface ErrorDetails {
    type: 'network' | 'timeout' | 'auth' | 'ratelimit' | 'notfound' | 'server' | 'unknown' | 'config'
    code?: string | number
    message: string
    userMessage: string
    canRetry: boolean
    retryAfter?: number // секунды для rate limit
    severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ErrorContext {
    operation: string // 'search-cities', 'get-weather', etc.
    params?: any
    timestamp: number
    requestId?: string
}
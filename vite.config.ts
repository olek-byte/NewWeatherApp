import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [vue()],
    resolve: { alias: { '@': '/src' } },
    server: {
      proxy: {
        '/proxy/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          secure: true,
          rewrite: p => p.replace(/^\/proxy\/openai/, ''),
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || ''}`,
            'Content-Type': 'application/json'
          }
        },
        '/proxy/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: p => p.replace(/^\/proxy\/gemini/, ''),
          headers: {
            'x-goog-api-key': env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '',
            'Content-Type': 'application/json'
          }
        }
      }
    }
  }
})
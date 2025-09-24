export type AIAdvice = { en: string; ru: string }

const MODEL = 'models/gemini-1.5-flash'

export async function requestGeminiAdvice(prompt: string): Promise<AIAdvice> {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'You are a helpful weather advisor. Return ONLY compact JSON object with two string fields: {"en":"US English text","ru":"Русский текст"}. ' +
              'Do not include markdown, not code fences, no explanations.'
          },
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 240,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          en: { type: 'string' },
          ru: { type: 'string' }
        },
        required: ['en', 'ru']
      }
    }
  }

  const res = await fetch(`/proxy/gemini/v1beta/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  // Try to parse JSON from text output
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed?.en === 'string' && typeof parsed?.ru === 'string') {
      return parsed as AIAdvice
    }
    // Some models may return { advice: '...' } — try to route by alphabet
    if (typeof parsed?.advice === 'string') {
      const adv: string = parsed.advice
      const isRussian = /[А-Яа-яЁё]/.test(adv)
      return isRussian ? { en: '', ru: adv } : { en: adv, ru: '' }
    }
    return { en: String(text), ru: '' }
  } catch {
    return { en: String(text), ru: '' }
  }
}



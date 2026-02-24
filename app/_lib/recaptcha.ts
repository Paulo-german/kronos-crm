const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const SCORE_THRESHOLD = 0.5

interface RecaptchaResponse {
  success: boolean
  score: number
  action: string
  'error-codes'?: string[]
}

export async function verifyRecaptchaToken(token: string): Promise<void> {
  if (!RECAPTCHA_SECRET_KEY) {
    throw new Error('RECAPTCHA_SECRET_KEY não configurada')
  }

  const response = await fetch(
    'https://www.google.com/recaptcha/api/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    },
  )

  const data: RecaptchaResponse = await response.json()

  if (!data.success || data.score < SCORE_THRESHOLD) {
    throw new Error('Verificação de segurança falhou. Tente novamente.')
  }
}

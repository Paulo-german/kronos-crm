import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }

  return resendInstance
}

// Re-exportar como `resend` com lazy init (mesmo padrão do Stripe)
export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    return Reflect.get(getResend(), prop)
  },
})

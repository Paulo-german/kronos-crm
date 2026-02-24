import { createClient } from '@supabase/supabase-js'

let adminInstance: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!adminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured',
      )
    }

    adminInstance = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminInstance
}

// Proxy pattern para lazy initialization (mesmo padrão do Stripe)
export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createClient>,
  {
    get(_, prop) {
      return Reflect.get(getSupabaseAdmin(), prop)
    },
  },
)

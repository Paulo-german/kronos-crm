import dns from 'node:dns/promises'
import net from 'node:net'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SsrfCheckResult {
  allowed: boolean
  reason?:
    | 'invalid_scheme'
    | 'private_ip'
    | 'loopback'
    | 'link_local'
    | 'dns_failed'
    | 'head_failed'
    | 'unsupported_content_type'
    | 'too_large'
    | 'too_many_redirects'
  // Populado apenas quando allowed === true — expõe headers da resposta terminal
  // para evitar um segundo HEAD no caller (ex: extract-and-send-inline-media).
  headers?: {
    contentType: string
    contentLength: number | null
    mediaType: 'image' | 'video' | 'audio' | 'document' | null
  }
}

interface SsrfValidateOptions {
  timeoutMs?: number
  maxBytes?: number
  acceptedMimePrefixes: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 2_000
const MAX_REDIRECT_HOPS = 3

// Ranges RFC1918 e especiais que nunca devem ser alvos de requisições.
// Representados como [networkBigInt, maskBigInt] para comparação eficiente.
const IPV4_BLOCKED_RANGES: Array<{ label: SsrfCheckResult['reason']; network: bigint; mask: bigint }> = [
  // Loopback 127.0.0.0/8
  { label: 'loopback', network: ipv4ToBigInt('127.0.0.0'), mask: prefixToMaskV4(8) },
  // RFC1918 — 10.0.0.0/8
  { label: 'private_ip', network: ipv4ToBigInt('10.0.0.0'), mask: prefixToMaskV4(8) },
  // RFC1918 — 172.16.0.0/12
  { label: 'private_ip', network: ipv4ToBigInt('172.16.0.0'), mask: prefixToMaskV4(12) },
  // RFC1918 — 192.168.0.0/16
  { label: 'private_ip', network: ipv4ToBigInt('192.168.0.0'), mask: prefixToMaskV4(16) },
  // Link-local — 169.254.0.0/16 (metadados AWS/GCP — crítico bloquear)
  { label: 'link_local', network: ipv4ToBigInt('169.254.0.0'), mask: prefixToMaskV4(16) },
  // Multicast — 224.0.0.0/4
  { label: 'private_ip', network: ipv4ToBigInt('224.0.0.0'), mask: prefixToMaskV4(4) },
  // Reserved / broadcast — 240.0.0.0/4
  { label: 'private_ip', network: ipv4ToBigInt('240.0.0.0'), mask: prefixToMaskV4(4) },
]

// ---------------------------------------------------------------------------
// Helpers — IPv4
// ---------------------------------------------------------------------------

function ipv4ToBigInt(ip: string): bigint {
  const octets = ip.split('.').map(Number)
  return (
    (BigInt(octets[0]) << BigInt(24)) |
    (BigInt(octets[1]) << BigInt(16)) |
    (BigInt(octets[2]) << BigInt(8)) |
    BigInt(octets[3])
  )
}

function prefixToMaskV4(prefix: number): bigint {
  // Cria máscara de prefixo /N como inteiro de 32 bits.
  return ((BigInt(1) << BigInt(prefix)) - BigInt(1)) << BigInt(32 - prefix)
}

function isBlockedIpv4(ip: string): SsrfCheckResult['reason'] | null {
  if (!net.isIPv4(ip)) return null
  const addr = ipv4ToBigInt(ip)
  for (const range of IPV4_BLOCKED_RANGES) {
    if ((addr & range.mask) === range.network) {
      return range.label
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers — IPv6
// ---------------------------------------------------------------------------

function isBlockedIpv6(ip: string): SsrfCheckResult['reason'] | null {
  if (!net.isIPv6(ip)) return null

  // Loopback ::1
  if (ip === '::1') return 'loopback'

  // Normaliza para lowercase para comparações de prefixo.
  const lower = ip.toLowerCase()

  // Link-local fe80::/10 — primeiros 10 bits são 1111111010
  // Os dois primeiros octetos começam com fe8x, fe9x, feax ou febx.
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return 'link_local'

  // Multicast ff00::/8
  if (lower.startsWith('ff')) return 'private_ip'

  // Endereços únicos locais fc00::/7 (fc::/7 — inclui fd::/8)
  if (/^f[cd]/i.test(lower)) return 'private_ip'

  // ::ffff:0:0/96 — IPv4-mapped (pode ocultar um IP privado — rejeitar por precaução)
  if (lower.startsWith('::ffff:')) return 'private_ip'

  return null
}

// ---------------------------------------------------------------------------
// Helpers — validação de IP por URL
// ---------------------------------------------------------------------------

/**
 * Resolve o hostname de uma URL e verifica se o IP é bloqueado.
 * Reutilizado tanto na validação inicial quanto em cada hop de redirect.
 */
async function validateUrlIp(url: URL): Promise<SsrfCheckResult['reason'] | null> {
  let resolvedIp: string
  try {
    const result = await dns.lookup(url.hostname)
    resolvedIp = result.address
  } catch {
    return 'dns_failed'
  }

  const ipv4Block = isBlockedIpv4(resolvedIp)
  if (ipv4Block) return ipv4Block

  const ipv6Block = isBlockedIpv6(resolvedIp)
  if (ipv6Block) return ipv6Block

  return null
}

// ---------------------------------------------------------------------------
// Helpers — mediaType
// ---------------------------------------------------------------------------

function resolveMediaType(contentType: string): 'image' | 'video' | 'audio' | 'document' | null {
  const normalized = contentType.split(';')[0].trim().toLowerCase()

  if (normalized.startsWith('image/')) return 'image'
  if (normalized.startsWith('video/')) return 'video'
  if (normalized.startsWith('audio/')) return 'audio'
  if (normalized === 'application/pdf') return 'document'

  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Valida uma URL contra um conjunto de regras de segurança SSRF antes de
 * qualquer requisição de rede ativa.
 *
 * A validação é feita em camadas ordenadas:
 *   1. Scheme (apenas http/https)
 *   2. DNS resolve server-side (bloqueia IPs privados/loopback/link-local)
 *   3. HEAD request com redirect: 'manual' + loop manual de até MAX_REDIRECT_HOPS
 *      — cada Location é revalidado via DNS antes de seguir, eliminando o bypass
 *      onde um servidor legítimo retorna 302 para http://169.254.169.254/.
 *   4. Content-Type e Content-Length verificados apenas na resposta terminal.
 *
 * Qualquer camada que falhe retorna imediatamente com { allowed: false, reason }.
 * Em caso de sucesso, `result.headers` é populado para evitar um segundo HEAD
 * no caller.
 */
export async function ssrfSafeValidateUrl(
  url: string,
  options: SsrfValidateOptions,
): Promise<SsrfCheckResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes, acceptedMimePrefixes } = options

  // ------------------------------------------------------------------
  // 1. Scheme — rejeitar tudo que não seja http(s)
  // ------------------------------------------------------------------
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { allowed: false, reason: 'invalid_scheme' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { allowed: false, reason: 'invalid_scheme' }
  }

  // ------------------------------------------------------------------
  // 2. DNS resolve + verificação do IP inicial
  // ------------------------------------------------------------------
  const initialIpBlock = await validateUrlIp(parsed)
  if (initialIpBlock) return { allowed: false, reason: initialIpBlock }

  // ------------------------------------------------------------------
  // 3. HEAD request com redirect manual — revalida IP a cada hop
  // ------------------------------------------------------------------
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  let currentUrl = url
  let hops = 0

  try {
    while (true) {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual',
      })

      // Resposta de redirect (3xx) — seguir manualmente com revalidação de IP
      if (response.status >= 300 && response.status < 400) {
        if (hops >= MAX_REDIRECT_HOPS) {
          return { allowed: false, reason: 'too_many_redirects' }
        }

        const location = response.headers.get('location')
        if (!location) {
          return { allowed: false, reason: 'head_failed' }
        }

        // Resolve URL relativa contra a URL atual antes de validar
        let nextUrl: URL
        try {
          nextUrl = new URL(location, currentUrl)
        } catch {
          return { allowed: false, reason: 'head_failed' }
        }

        if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
          return { allowed: false, reason: 'invalid_scheme' }
        }

        // Revalidar IP do destino do redirect — aqui está o bypass que estamos fechando
        const redirectIpBlock = await validateUrlIp(nextUrl)
        if (redirectIpBlock) return { allowed: false, reason: redirectIpBlock }

        currentUrl = nextUrl.toString()
        hops++
        continue
      }

      // Resposta terminal (não-3xx) — verificar Content-Type e Content-Length
      if (!response.ok) {
        return { allowed: false, reason: 'head_failed' }
      }

      const contentType = response.headers.get('content-type') ?? ''
      const normalizedContentType = contentType.split(';')[0].trim().toLowerCase()

      const contentTypeAllowed = acceptedMimePrefixes.some((prefix) =>
        normalizedContentType.startsWith(prefix.toLowerCase()),
      )

      if (!contentTypeAllowed) {
        return { allowed: false, reason: 'unsupported_content_type' }
      }

      const rawContentLength = response.headers.get('content-length')
      const contentLength = rawContentLength !== null ? parseInt(rawContentLength, 10) : null
      const resolvedContentLength = contentLength !== null && !isNaN(contentLength) ? contentLength : null

      if (maxBytes !== undefined && resolvedContentLength !== null && resolvedContentLength > maxBytes) {
        return { allowed: false, reason: 'too_large' }
      }

      return {
        allowed: true,
        headers: {
          contentType: normalizedContentType,
          contentLength: resolvedContentLength,
          mediaType: resolveMediaType(contentType),
        },
      }
    }
  } catch (error) {
    // AbortController disparou timeout, ou fetch falhou por outro motivo de rede.
    if (error instanceof Error && error.name === 'AbortError') {
      return { allowed: false, reason: 'head_failed' }
    }
    return { allowed: false, reason: 'head_failed' }
  } finally {
    clearTimeout(timeoutHandle)
  }
}

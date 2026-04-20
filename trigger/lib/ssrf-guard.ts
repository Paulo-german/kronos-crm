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
// Public API
// ---------------------------------------------------------------------------

/**
 * Valida uma URL contra um conjunto de regras de segurança SSRF antes de
 * qualquer requisição de rede ativa.
 *
 * A validação é feita em camadas ordenadas:
 *   1. Scheme (apenas http/https)
 *   2. DNS resolve server-side (bloqueia IPs privados/loopback/link-local)
 *   3. HEAD request com timeout (verifica Content-Type e Content-Length)
 *
 * Qualquer camada que falhe retorna imediatamente com { allowed: false, reason }.
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

  const hostname = parsed.hostname

  // ------------------------------------------------------------------
  // 2. DNS resolve + verificação do IP resolvido
  // ------------------------------------------------------------------
  let resolvedIp: string
  try {
    const result = await dns.lookup(hostname)
    resolvedIp = result.address
  } catch {
    return { allowed: false, reason: 'dns_failed' }
  }

  const ipv4Block = isBlockedIpv4(resolvedIp)
  if (ipv4Block) return { allowed: false, reason: ipv4Block }

  const ipv6Block = isBlockedIpv6(resolvedIp)
  if (ipv6Block) return { allowed: false, reason: ipv6Block }

  // ------------------------------------------------------------------
  // 3. HEAD request — verificar Content-Type e Content-Length sem baixar o corpo
  // ------------------------------------------------------------------
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) {
      return { allowed: false, reason: 'head_failed' }
    }

    // Content-Type — deve ter um dos prefixos aceitos pelo caller
    const contentType = response.headers.get('content-type') ?? ''
    const normalizedContentType = contentType.split(';')[0].trim().toLowerCase()

    const contentTypeAllowed = acceptedMimePrefixes.some((prefix) =>
      normalizedContentType.startsWith(prefix.toLowerCase()),
    )

    if (!contentTypeAllowed) {
      return { allowed: false, reason: 'unsupported_content_type' }
    }

    // Content-Length — opcional; se presente e `maxBytes` informado, verificar
    if (maxBytes !== undefined) {
      const contentLengthHeader = response.headers.get('content-length')
      if (contentLengthHeader !== null) {
        const contentLength = parseInt(contentLengthHeader, 10)
        if (!isNaN(contentLength) && contentLength > maxBytes) {
          return { allowed: false, reason: 'too_large' }
        }
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

  return { allowed: true }
}

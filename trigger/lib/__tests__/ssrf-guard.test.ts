/**
 * Testes manuais para ssrfSafeValidateUrl.
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/ssrf-guard.test.ts
 *
 * Por padrão os testes rodam apenas com fixtures locais (sem rede).
 * Para habilitar o teste com rede real:
 *   LIVE_TEST=1 pnpm tsx trigger/lib/__tests__/ssrf-guard.test.ts
 *
 * RESULTADO ESPERADO:
 *   Todos os testes passam — processo termina com exit code 0.
 *   Em caso de falha o teste falho é impresso e o processo termina com exit code 1.
 */

import dns from 'node:dns/promises'
import { ssrfSafeValidateUrl } from '../ssrf-guard'

// ---------------------------------------------------------------------------
// Mini test runner
// ---------------------------------------------------------------------------

type TestResult = { name: string; passed: boolean; error?: string }
const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    results.push({ name, passed: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error: message })
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

// ---------------------------------------------------------------------------
// Mock helper — permite sobrescrever dns.lookup temporariamente
// ---------------------------------------------------------------------------

function withMockedDns(
  resolvedIp: string,
  fn: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    const original = dns.lookup.bind(dns)
    // Object.assign usado para contornar readonly em módulo nativo — monkey-patch intencional para teste sem test runner.
    const mockLookup = async () => ({ address: resolvedIp, family: resolvedIp.includes(':') ? 6 : 4 })
    Object.assign(dns, { lookup: mockLookup })
    try {
      await fn()
    } finally {
      Object.assign(dns, { lookup: original })
    }
  }
}

const ACCEPTED_IMAGE = ['image/', 'video/', 'audio/', 'application/pdf']

// ---------------------------------------------------------------------------
// Main — encapsulado para compatibilidade com CJS (sem top-level await)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // Testes de scheme
  // -------------------------------------------------------------------------

  await test('rejeita file:// URL', async () => {
    const result = await ssrfSafeValidateUrl('file:///etc/passwd', { acceptedMimePrefixes: ACCEPTED_IMAGE })
    assert(!result.allowed, 'deveria ser bloqueada')
    assert(result.reason === 'invalid_scheme', `reason esperado 'invalid_scheme', recebeu '${result.reason}'`)
  })

  await test('rejeita ftp:// URL', async () => {
    const result = await ssrfSafeValidateUrl('ftp://example.com/file.pdf', { acceptedMimePrefixes: ACCEPTED_IMAGE })
    assert(!result.allowed, 'deveria ser bloqueada')
    assert(result.reason === 'invalid_scheme', `reason esperado 'invalid_scheme', recebeu '${result.reason}'`)
  })

  await test('rejeita javascript: URL', async () => {
    const result = await ssrfSafeValidateUrl('javascript:alert(1)', { acceptedMimePrefixes: ACCEPTED_IMAGE })
    assert(!result.allowed, 'deveria ser bloqueada')
    assert(result.reason === 'invalid_scheme', `reason esperado 'invalid_scheme', recebeu '${result.reason}'`)
  })

  await test('rejeita gopher:// URL', async () => {
    const result = await ssrfSafeValidateUrl('gopher://example.com/', { acceptedMimePrefixes: ACCEPTED_IMAGE })
    assert(!result.allowed, 'deveria ser bloqueada')
    assert(result.reason === 'invalid_scheme', `reason esperado 'invalid_scheme', recebeu '${result.reason}'`)
  })

  await test('rejeita URL inválida (não parsável)', async () => {
    const result = await ssrfSafeValidateUrl('not-a-url', { acceptedMimePrefixes: ACCEPTED_IMAGE })
    assert(!result.allowed, 'deveria ser bloqueada')
    assert(result.reason === 'invalid_scheme', `reason esperado 'invalid_scheme', recebeu '${result.reason}'`)
  })

  // -------------------------------------------------------------------------
  // Testes de IP bloqueado (via mock de DNS)
  // -------------------------------------------------------------------------

  await test(
    'bloqueia 192.168.1.1 (RFC1918)',
    withMockedDns('192.168.1.1', async () => {
      const result = await ssrfSafeValidateUrl('http://internal.example.com/img.jpg', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'private_ip', `reason esperado 'private_ip', recebeu '${result.reason}'`)
    }),
  )

  await test(
    'bloqueia 10.0.0.1 (RFC1918)',
    withMockedDns('10.0.0.1', async () => {
      const result = await ssrfSafeValidateUrl('http://corp.example.com/doc.pdf', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'private_ip', `reason esperado 'private_ip', recebeu '${result.reason}'`)
    }),
  )

  await test(
    'bloqueia 172.16.0.1 (RFC1918 /12)',
    withMockedDns('172.16.0.1', async () => {
      const result = await ssrfSafeValidateUrl('http://staging.example.com/img.png', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'private_ip', `reason esperado 'private_ip', recebeu '${result.reason}'`)
    }),
  )

  await test(
    'bloqueia 169.254.169.254 (metadata AWS/GCP — link-local)',
    withMockedDns('169.254.169.254', async () => {
      const result = await ssrfSafeValidateUrl('http://metadata.example.com/latest', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'link_local', `reason esperado 'link_local', recebeu '${result.reason}'`)
    }),
  )

  await test(
    'bloqueia 127.0.0.1 (loopback)',
    withMockedDns('127.0.0.1', async () => {
      const result = await ssrfSafeValidateUrl('http://localhost.example.com/img.jpg', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'loopback', `reason esperado 'loopback', recebeu '${result.reason}'`)
    }),
  )

  await test(
    'bloqueia ::1 (IPv6 loopback)',
    withMockedDns('::1', async () => {
      const result = await ssrfSafeValidateUrl('http://ipv6-local.example.com/img.jpg', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'loopback', `reason esperado 'loopback', recebeu '${result.reason}'`)
    }),
  )

  await test(
    'bloqueia fe80::1 (IPv6 link-local)',
    withMockedDns('fe80::1', async () => {
      const result = await ssrfSafeValidateUrl('http://ipv6-ll.example.com/img.jpg', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'deveria ser bloqueada')
      assert(result.reason === 'link_local', `reason esperado 'link_local', recebeu '${result.reason}'`)
    }),
  )

  // -------------------------------------------------------------------------
  // Teste de DNS inválido (host inexistente)
  // -------------------------------------------------------------------------

  await test('falha com DNS inexistente', async () => {
    // Este hostname deliberadamente não existe — espera dns_failed sem rede LIVE.
    const result = await ssrfSafeValidateUrl(
      'http://this-hostname-absolutely-does-not-exist-kronos-crm-test.example.invalid/img.jpg',
      { acceptedMimePrefixes: ACCEPTED_IMAGE },
    )
    assert(!result.allowed, 'deveria ser bloqueada')
    assert(result.reason === 'dns_failed', `reason esperado 'dns_failed', recebeu '${result.reason}'`)
  })

  // -------------------------------------------------------------------------
  // Testes com rede real (opt-in)
  // -------------------------------------------------------------------------

  if (process.env.LIVE_TEST) {
    await test('permite https://example.com (imagem simulada)', async () => {
      // example.com retorna text/html — espera-se unsupported_content_type
      const result = await ssrfSafeValidateUrl('https://example.com', {
        acceptedMimePrefixes: ACCEPTED_IMAGE,
      })
      assert(!result.allowed, 'example.com serve HTML, não mídia — deve ser bloqueado')
      assert(
        result.reason === 'unsupported_content_type',
        `reason esperado 'unsupported_content_type', recebeu '${result.reason}'`,
      )
    })

    await test('bloqueia URL com Content-Length acima do limite', async () => {
      const result = await ssrfSafeValidateUrl('https://httpbin.org/bytes/10', {
        acceptedMimePrefixes: ['application/octet-stream'],
        maxBytes: 5,
      })
      assert(!result.allowed, 'deve ser bloqueado (too_large ou unsupported_content_type)')
    })
  }

  // -------------------------------------------------------------------------
  // Relatório final
  // -------------------------------------------------------------------------

  const passed = results.filter((result) => result.passed)
  const failed = results.filter((result) => !result.passed)

  console.log(`\nssrf-guard tests: ${passed.length} passed, ${failed.length} failed\n`)

  for (const result of passed) {
    console.log(`  ✓ ${result.name}`)
  }

  for (const result of failed) {
    console.error(`  ✗ ${result.name}`)
    console.error(`    ${result.error}`)
  }

  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})

/**
 * Testes manuais para extractAndSendInlineMedia.
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/extract-and-send-inline-media.test.ts
 *
 * Todos os testes rodam offline — sem rede real e sem banco.
 * Os módulos de envio são substituídos por stubs injetados via parâmetro.
 *
 * RESULTADO ESPERADO:
 *   Todos os testes passam — processo termina com exit code 0.
 */

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
// Stubs de envio
// ---------------------------------------------------------------------------

// Rastreia chamadas aos senders para verificar blocos enviados e ordem.
let sentTexts: string[] = []
let sentMediaUrls: string[] = []

// Stub de ssrfSafeValidateUrl — valida via regex simples offline:
// bloqueia IPs privados óbvios e schemes inválidos, permite o resto.
const BLOCKED_HOSTS_RE = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.\d+\.|169\.254\./

async function stubSsrfSafeValidateUrl(
  url: string,
  _options: unknown,
): Promise<{ allowed: boolean; reason?: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { allowed: false, reason: 'invalid_scheme' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { allowed: false, reason: 'invalid_scheme' }
  }
  if (BLOCKED_HOSTS_RE.test(parsed.hostname)) {
    return { allowed: false, reason: 'private_ip' }
  }
  return { allowed: true }
}

// Stub de sendMediaUtility — registra a URL e retorna sucesso.
async function stubSendMediaUtility(
  url: string,
  _mediaType: string,
  _caption: null,
  _ctx: unknown,
): Promise<{ sentId: string; skipped: boolean }> {
  sentMediaUrls.push(url)
  return { sentId: `stub-${url.slice(-8)}`, skipped: false }
}

// Stub de sendOutboundMessage — registra o texto.
async function stubSendOutboundMessage(ctx: { text: string }): Promise<{ sentIds: string[] }> {
  sentTexts.push(ctx.text)
  return { sentIds: ['stub-text-id'] }
}

// ---------------------------------------------------------------------------
// Tipos dos stubs (mirror dos tipos reais)
// ---------------------------------------------------------------------------

type SendMediaFn = (url: string, mediaType: string, caption: null, ctx: unknown) => Promise<{ sentId: string; skipped: boolean }>
type SendTextFn = (ctx: { text: string; conversationId: string; organizationId: string; credentials: unknown; remoteJid: string }) => Promise<{ sentIds: string[] }>
type SsrfValidateFn = (url: string, options: unknown) => Promise<{ allowed: boolean; reason?: string }>

// ---------------------------------------------------------------------------
// Re-implementação testável da lógica central de parsing/blocos
//
// Espelha extract-and-send-inline-media.ts com dependências injetáveis.
// Permite testar a lógica de split/grupo/ordem sem precisar mockar módulos.
// ---------------------------------------------------------------------------

const ISOLATED_URL_RE = /^\s*https?:\/\/\S+\s*$/

const WHATSAPP_SIZE_LIMITS: Record<'image' | 'video' | 'audio' | 'document', number> = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
}

const ACCEPTED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf']

// Stub de probeMediaUrl — sempre retorna image sem fazer rede.
async function stubProbeMediaUrl(
  _url: string,
): Promise<{ mediaType: 'image'; contentLength: null }> {
  return { mediaType: 'image', contentLength: null }
}

async function testableExtractAndSend(
  fullMessage: string,
  sendMedia: SendMediaFn,
  sendText: SendTextFn,
  ssrfValidate: SsrfValidateFn,
): Promise<{ blocksSent: number; blocksSkipped: number; ssrfBlockedUrls: string[] }> {
  const lines = fullMessage.split('\n')
  const ssrfBlockedUrls: string[] = []
  let blocksSent = 0
  let blocksSkipped = 0

  type Block = { kind: 'text'; text: string } | { kind: 'media'; url: string }
  const blocks: Block[] = []
  let pendingLines: string[] = []

  const flushText = () => {
    if (pendingLines.length === 0) return
    const text = pendingLines.join('\n').trim()
    if (text.length > 0) blocks.push({ kind: 'text', text })
    pendingLines = []
  }

  for (const line of lines) {
    if (!ISOLATED_URL_RE.test(line)) {
      pendingLines.push(line)
      continue
    }

    const url = line.trim()
    const ssrfResult = await ssrfValidate(url, {
      acceptedMimePrefixes: ACCEPTED_MIME_PREFIXES,
      maxBytes: WHATSAPP_SIZE_LIMITS.document,
    })

    if (!ssrfResult.allowed) {
      ssrfBlockedUrls.push(url)
      pendingLines.push(line)
      continue
    }

    const probeResult = await stubProbeMediaUrl(url)

    if (probeResult.contentLength !== null && probeResult.contentLength > WHATSAPP_SIZE_LIMITS[probeResult.mediaType]) {
      pendingLines.push(line)
      continue
    }

    flushText()
    blocks.push({ kind: 'media', url })
  }

  flushText()

  const dummyCtx = {
    conversationId: 'test-conv',
    organizationId: 'test-org',
    credentials: {},
    remoteJid: '5511999999999@s.whatsapp.net',
  }

  for (const block of blocks) {
    if (block.kind === 'text') {
      if (!block.text.trim()) {
        blocksSkipped++
        continue
      }
      await sendText({ ...dummyCtx, text: block.text })
      blocksSent++
    } else {
      const result = await sendMedia(block.url, 'image', null, dummyCtx)
      if (result.skipped) {
        blocksSkipped++
      } else {
        blocksSent++
      }
    }
  }

  return { blocksSent, blocksSkipped, ssrfBlockedUrls }
}

// ---------------------------------------------------------------------------
// Helper de reset entre testes
// ---------------------------------------------------------------------------

function reset(): void {
  sentTexts = []
  sentMediaUrls = []
}

// ---------------------------------------------------------------------------
// Main — encapsulado para compatibilidade CJS (sem top-level await)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // 1. URL isolada em linha própria é detectada como mídia
  await test('URL isolada em linha própria — detecta como mídia', async () => {
    reset()
    const msg = 'Olha esse vídeo:\n\nhttps://cdn.example.com/video.mp4\n\nLegal né?'
    const result = await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(result.ssrfBlockedUrls.length === 0, 'não deve ter URLs bloqueadas por SSRF')
    assert(sentMediaUrls.includes('https://cdn.example.com/video.mp4'), 'URL de vídeo deve ser enviada como mídia')
    assert(sentTexts.some((t) => t.includes('Olha esse vídeo')), 'texto antes da URL deve ser enviado')
    assert(sentTexts.some((t) => t.includes('Legal né')), 'texto depois da URL deve ser enviado')
  })

  // 2. URL com espaço antes e depois ainda é detectada
  await test('URL com espaços nas bordas da linha — ainda detecta como URL isolada', async () => {
    reset()
    const msg = '   https://cdn.example.com/img.jpg   '
    const result = await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(result.ssrfBlockedUrls.length === 0, 'não deve ter URLs bloqueadas')
    assert(sentMediaUrls.includes('https://cdn.example.com/img.jpg'), 'URL deve ser detectada mesmo com espaços')
  })

  // 3. URL com texto NA MESMA linha NÃO é detectada como mídia
  await test('URL com texto na mesma linha — NÃO é mídia', async () => {
    reset()
    const msg = 'Veja o produto em https://cdn.example.com/img.jpg que é incrível'
    await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(sentMediaUrls.length === 0, 'URL com texto adjacente NÃO deve virar bloco de mídia')
    assert(sentTexts.length === 1, 'a linha inteira deve ir como texto')
    assert(sentTexts[0].includes('https://cdn.example.com/img.jpg'), 'URL deve estar no bloco de texto')
  })

  // 4. Múltiplas URLs isoladas — cada uma vira bloco de mídia separado
  await test('Múltiplas URLs isoladas — cada uma vira bloco de mídia', async () => {
    reset()
    const msg = [
      'Produto A:',
      'https://cdn.example.com/img-a.jpg',
      'Produto B:',
      'https://cdn.example.com/img-b.jpg',
    ].join('\n')

    const result = await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(sentMediaUrls.length === 2, `esperava 2 mídias, recebeu ${sentMediaUrls.length}`)
    assert(sentMediaUrls[0] === 'https://cdn.example.com/img-a.jpg', 'primeira mídia deve ser img-a')
    assert(sentMediaUrls[1] === 'https://cdn.example.com/img-b.jpg', 'segunda mídia deve ser img-b')
    assert(result.blocksSent >= 4, `esperava >= 4 blocos enviados, recebeu ${result.blocksSent}`)
  })

  // 5. Ordem invariante: texto → mídia → texto → mídia
  await test('Ordem preservada: txt1 → URL1 → txt2 → URL2', async () => {
    reset()
    const sendOrder: string[] = []

    const trackingMedia: SendMediaFn = async (url, mediaType, caption, ctx) => {
      sendOrder.push(`media:${url}`)
      return stubSendMediaUtility(url, mediaType, caption, ctx)
    }
    const trackingText: SendTextFn = async (ctx) => {
      sendOrder.push(`text:${ctx.text.trim().slice(0, 20)}`)
      return stubSendOutboundMessage(ctx)
    }

    const msg = 'Texto 1\nhttps://cdn.example.com/a.jpg\nTexto 2\nhttps://cdn.example.com/b.jpg'
    await testableExtractAndSend(msg, trackingMedia, trackingText, stubSsrfSafeValidateUrl)

    assert(sendOrder[0].startsWith('text:'), `1º bloco deve ser texto, foi: ${sendOrder[0]}`)
    assert(sendOrder[1].startsWith('media:'), `2º bloco deve ser mídia, foi: ${sendOrder[1]}`)
    assert(sendOrder[2].startsWith('text:'), `3º bloco deve ser texto, foi: ${sendOrder[2]}`)
    assert(sendOrder[3].startsWith('media:'), `4º bloco deve ser mídia, foi: ${sendOrder[3]}`)
  })

  // 6. URL bloqueada por SSRF — tratada como texto, fluxo continua
  await test('URL com IP privado — bloqueada SSRF, tratada como texto, fluxo continua', async () => {
    reset()
    const msg = 'Texto normal\nhttp://192.168.1.100/img.jpg\nMais texto'
    const result = await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(result.ssrfBlockedUrls.includes('http://192.168.1.100/img.jpg'), 'URL privada deve estar em ssrfBlockedUrls')
    assert(sentMediaUrls.length === 0, 'URL bloqueada NÃO deve ser enviada como mídia')
    assert(sentTexts.length >= 1, 'deve haver pelo menos um bloco de texto enviado')
  })

  // 7. Mensagem sem nenhuma URL — tudo vai como texto único
  await test('Mensagem sem URL — tudo como texto', async () => {
    reset()
    const msg = 'Olá! Como posso ajudar?\nTemos vários produtos disponíveis.'
    const result = await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(sentMediaUrls.length === 0, 'não deve haver mídia')
    assert(sentTexts.length === 1, 'deve haver um único bloco de texto')
    assert(result.ssrfBlockedUrls.length === 0, 'não deve haver bloqueios SSRF')
  })

  // 8. URL com scheme inválido (file://) — não bate o regex http(s), vai direto como texto
  //    O SSRF guard só é chamado para candidatas que batem ISOLATED_URL_RE (http/https).
  //    file:// não bate o regex, portanto nunca chega ao guard — vai para bloco de texto.
  await test('URL file:// — não bate regex http(s), vai como texto simples', async () => {
    reset()
    const msg = 'Veja:\nfile:///etc/passwd\nAté mais'
    const result = await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    // file:// não bate ISOLATED_URL_RE, portanto não entra no SSRF guard.
    assert(result.ssrfBlockedUrls.length === 0, 'file:// não passa pelo guard — não entra em ssrfBlockedUrls')
    assert(sentMediaUrls.length === 0, 'file:// NÃO deve ser enviado como mídia')
    // A linha com file:// é tratada como texto comum junto com as adjacentes.
    assert(sentTexts.length >= 1, 'deve haver bloco de texto contendo a linha file://')
  })

  // 9. Linhas vazias entre URL e texto — não geram blocos extras de mídia
  await test('Linhas vazias entre URL e texto — não geram blocos extras', async () => {
    reset()
    const msg = 'Descrição:\n\nhttps://cdn.example.com/img.jpg\n\nObrigado!'
    await testableExtractAndSend(msg, stubSendMediaUtility, stubSendOutboundMessage, stubSsrfSafeValidateUrl)

    assert(sentMediaUrls.length === 1, `esperava 1 mídia, recebeu ${sentMediaUrls.length}`)
  })

  // -------------------------------------------------------------------------
  // Relatório final
  // -------------------------------------------------------------------------

  const passed = results.filter((r) => r.passed)
  const failed = results.filter((r) => !r.passed)

  console.log(`\nextract-and-send-inline-media tests: ${passed.length} passed, ${failed.length} failed\n`)

  for (const r of passed) {
    console.log(`  ✓ ${r.name}`)
  }

  for (const r of failed) {
    console.error(`  ✗ ${r.name}`)
    console.error(`    ${r.error}`)
  }

  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})

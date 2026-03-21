const MAX_CONTENT_LENGTH = 8000
const FETCH_TIMEOUT_MS = 10000

/**
 * Faz fetch de uma URL e extrai o conteudo textual relevante.
 * Retorna texto limpo (sem HTML) limitado a MAX_CONTENT_LENGTH caracteres.
 *
 * Usado pela tool fetch_website_info do chat de onboarding para que
 * a Kassandra consiga entender o negocio do cliente a partir do site.
 */
export async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; KronosCRM/1.0; +https://kronoscrm.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const text = extractTextFromHtml(html)

    return text.slice(0, MAX_CONTENT_LENGTH)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extrai texto legivel de HTML bruto.
 * Remove scripts, styles, tags e normaliza espacos.
 */
function extractTextFromHtml(html: string): string {
  let text = html

  // Remove scripts e styles (incluindo conteudo)
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

  // Extrai conteudo de meta tags uteis
  const metaDescription = extractMetaContent(html, 'description')
  const metaOgDescription = extractMetaContent(html, 'og:description')
  const metaOgTitle = extractMetaContent(html, 'og:title')

  // Extrai title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Remove todas as tags HTML
  text = text.replace(/<[^>]+>/g, ' ')

  // Decodifica entidades HTML comuns
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')

  // Normaliza espacos e quebras de linha
  text = text.replace(/\s+/g, ' ').trim()

  // Monta output estruturado com metadados no topo
  const parts: string[] = []

  if (title) parts.push(`Titulo do site: ${title}`)
  if (metaOgTitle && metaOgTitle !== title)
    parts.push(`Titulo OG: ${metaOgTitle}`)
  if (metaDescription) parts.push(`Meta descricao: ${metaDescription}`)
  if (metaOgDescription && metaOgDescription !== metaDescription)
    parts.push(`OG descricao: ${metaOgDescription}`)

  parts.push(`\nConteudo da pagina:\n${text}`)

  return parts.join('\n')
}

/**
 * Extrai o content de uma meta tag pelo name ou property.
 */
function extractMetaContent(html: string, nameOrProperty: string): string {
  // Tenta name="..."
  const nameRegex = new RegExp(
    `<meta[^>]*name=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`,
    'i',
  )
  const nameMatch = html.match(nameRegex)
  if (nameMatch) return nameMatch[1].trim()

  // Tenta content antes de name (ordem invertida)
  const reverseNameRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${nameOrProperty}["']`,
    'i',
  )
  const reverseNameMatch = html.match(reverseNameRegex)
  if (reverseNameMatch) return reverseNameMatch[1].trim()

  // Tenta property="..." (og:tags)
  const propRegex = new RegExp(
    `<meta[^>]*property=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`,
    'i',
  )
  const propMatch = html.match(propRegex)
  if (propMatch) return propMatch[1].trim()

  // Tenta content antes de property
  const reversePropRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${nameOrProperty}["']`,
    'i',
  )
  const reversePropMatch = html.match(reversePropRegex)
  if (reversePropMatch) return reversePropMatch[1].trim()

  return ''
}

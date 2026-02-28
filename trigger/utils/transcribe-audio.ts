import OpenAI, { toFile } from 'openai'
import { observe } from '@langfuse/tracing'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MIME_TO_EXT: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'audio/x-m4a': 'm4a',
  'audio/ogg; codecs=opus': 'ogg',
}

interface EvolutionBase64Response {
  mediaType: string
  mimetype: string
  base64: string
}

/**
 * Busca o áudio via Evolution API (getBase64FromMediaMessage) e transcreve com Whisper.
 *
 * A URL no audioMessage do webhook é interna do WhatsApp CDN e não é acessível diretamente.
 * Precisamos pedir ao servidor Evolution para fazer o download e retornar em base64.
 */
export async function transcribeAudio(
  instanceName: string,
  messageId: string,
): Promise<string> {
  return observe(async () => {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be configured')
  }

  // 1. Buscar áudio em base64 via Evolution API
  const response = await fetch(
    `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        message: {
          key: { id: messageId },
        },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(
      `Evolution getBase64FromMediaMessage failed (${response.status}): ${errorBody}`,
    )
  }

  const data: EvolutionBase64Response = await response.json()

  if (!data.base64) {
    throw new Error('Evolution returned empty base64 for audio message')
  }

  // 2. Converter base64 para Buffer
  const audioBuffer = Buffer.from(data.base64, 'base64')
  const mimetype = data.mimetype ?? 'audio/ogg'
  const ext = MIME_TO_EXT[mimetype] ?? 'ogg'

  // 3. Converter para File que o SDK OpenAI reconhece
  const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimetype })

  // 4. Enviar para Whisper
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
  })

  return transcription.text
  }, { name: 'audio-transcription' })() // observe
}

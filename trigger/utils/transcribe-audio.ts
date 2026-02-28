import OpenAI, { toFile } from 'openai'

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

export async function transcribeAudio(audioUrl: string): Promise<string> {
  // 1. Download do áudio da URL temporária da Evolution
  const response = await fetch(audioUrl)
  const contentType = response.headers.get('content-type') ?? 'audio/ogg'
  const ext = MIME_TO_EXT[contentType] ?? 'ogg'

  const audioBuffer = Buffer.from(await response.arrayBuffer())

  // 2. Converter para File que o SDK OpenAI reconhece (com extensão correta)
  const file = await toFile(audioBuffer, `audio.${ext}`, { type: contentType })

  // 3. Enviar para Whisper
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
  })

  return transcription.text
}

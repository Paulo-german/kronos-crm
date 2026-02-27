import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function transcribeAudio(audioUrl: string): Promise<string> {
  // 1. Download do áudio da URL temporária da Evolution
  const response = await fetch(audioUrl)
  const audioBuffer = Buffer.from(await response.arrayBuffer())
  const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' })

  // 2. Enviar para Whisper
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
  })

  return transcription.text
}

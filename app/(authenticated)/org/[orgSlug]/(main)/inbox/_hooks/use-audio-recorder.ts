'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

const OGG_OPUS_MIME = 'audio/ogg;codecs=opus'

interface UseAudioRecorderOptions {
  conversationId: string
  onAudioReady: (base64: string, duration: number) => void
}

/**
 * Cria um MediaRecorder que grava em OGG/Opus (formato aceito pelo Meta WhatsApp Cloud API).
 * Firefox suporta nativamente. Chrome/Safari usam o polyfill opus-media-recorder via WASM.
 */
async function createOggRecorder(stream: MediaStream): Promise<MediaRecorder> {
  // Firefox suporta OGG/Opus nativamente
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(OGG_OPUS_MIME)) {
    return new MediaRecorder(stream, { mimeType: OGG_OPUS_MIME })
  }

  // Chrome/Safari: usar polyfill WASM
  const { default: OpusMediaRecorder } = await import('opus-media-recorder')

  const workerOptions = {
    encoderWorkerFactory: () => new Worker('/opus-media-recorder/encoderWorker.umd.js'),
    OggOpusEncoderWasmPath: '/opus-media-recorder/OggOpusEncoder.wasm',
  }

  return new OpusMediaRecorder(
    stream,
    { mimeType: OGG_OPUS_MIME },
    workerOptions,
  ) as unknown as MediaRecorder
}

export function useAudioRecorder({
  conversationId,
  onAudioReady,
}: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelledRef = useRef(false)
  // Guardar callback em ref para evitar stale closure no recorder.onstop
  const onAudioReadyRef = useRef(onAudioReady)
  onAudioReadyRef.current = onAudioReady

  const clearRecordingTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = await createOggRecorder(stream)

      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())

        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }

        const blob = new Blob(chunksRef.current, { type: OGG_OPUS_MIME })
        const duration = (Date.now() - recordingStartRef.current) / 1000

        if (blob.size === 0) return

        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          onAudioReadyRef.current(base64, duration)
        }
        reader.readAsDataURL(blob)
      }

      cancelledRef.current = false
      recordingStartRef.current = Date.now()
      setRecordingDuration(0)
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000))
      }, 1000)

      recorder.start()
      setIsRecording(true)
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast.error(
            'Permissão de microfone negada. Clique no ícone de cadeado na barra de endereço para habilitar.',
          )
          return
        }
        if (error.name === 'NotFoundError') {
          toast.error(
            'Nenhum microfone encontrado. Conecte um microfone e tente novamente.',
          )
          return
        }
      }
      toast.error(
        'Não foi possível acessar o microfone. Verifique as permissões do navegador.',
      )
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    clearRecordingTimer()
    setIsRecording(false)
    setRecordingDuration(0)
  }, [clearRecordingTimer])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    stopRecording()
  }, [stopRecording])

  // Cancelar gravacao ao trocar de conversa
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        cancelledRef.current = true
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current.stop()
      }
      clearRecordingTimer()
    }
  }, [conversationId, clearRecordingTimer])

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}

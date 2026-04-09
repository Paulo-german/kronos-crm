declare module 'opus-media-recorder' {
  interface WorkerOptions {
    encoderWorkerFactory?: () => Worker
    OggOpusEncoderWasmPath?: string
    WebMOpusEncoderWasmPath?: string
  }

  class OpusMediaRecorder extends EventTarget {
    constructor(
      stream: MediaStream,
      options?: MediaRecorderOptions,
      workerOptions?: WorkerOptions,
    )

    readonly stream: MediaStream
    readonly mimeType: string
    readonly state: RecordingState

    start(timeslice?: number): void
    stop(): void
    pause(): void
    resume(): void

    ondataavailable: ((event: BlobEvent) => void) | null
    onstop: (() => void) | null
    onstart: (() => void) | null
    onerror: ((event: Event) => void) | null

    static isTypeSupported(mimeType: string): boolean
  }

  export default OpusMediaRecorder
}

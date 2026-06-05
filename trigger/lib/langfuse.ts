import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { setLangfuseTracerProvider } from '@langfuse/tracing'
import type { Tracer } from '@opentelemetry/api'

const langfuseSpanProcessor = new LangfuseSpanProcessor()

const langfuseProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
})

setLangfuseTracerProvider(langfuseProvider)

export const langfuseTracer: Tracer = langfuseProvider.getTracer('ai')

export async function flushLangfuse(): Promise<void> {
  await langfuseSpanProcessor.forceFlush()
}

/**
 * Versão do deploy — usada como tag em todos os traces do Langfuse.
 * Em produção (Vercel/Trigger.dev), VERCEL_GIT_COMMIT_SHA é injetado
 * automaticamente. Localmente fica "local".
 */
export const DEPLOY_VERSION: string =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'

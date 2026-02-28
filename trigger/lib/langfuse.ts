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

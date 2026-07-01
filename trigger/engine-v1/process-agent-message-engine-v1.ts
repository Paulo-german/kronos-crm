import { observe } from '@langfuse/tracing'
import { task } from '@trigger.dev/sdk/v3'
import type { ProcessAgentMessagePayload } from '../lib/build-dispatcher-ctx'
import { buildDispatcherCtx } from '../lib/build-dispatcher-ctx'
import { emitAgentStatus } from '../lib/emit-agent-status'
import { handleAgentTaskFailure } from '../lib/handle-task-failure'
import { flushLangfuse } from '../lib/langfuse'
import { runEngineV1 } from './run-turn'

// Task isolada do motor reconstruído. Roteada pelo dispatcher quando
// Agent.agentVersion === 'engine-v1' (ver app/_lib/agent/agent-version.ts).
// Invólucro idêntico ao v1/v2 (observe + buildDispatcherCtx + emit failed só no
// erro real + flushLangfuse); a lógica do turno vive no stage runner (run-turn.ts).
export const processAgentMessageEngineV1 = task({
  id: 'process-agent-message-engine-v1',
  retry: { maxAttempts: 3 },
  run: async (payload: ProcessAgentMessagePayload, { ctx: triggerCtx }) => {
    return observe(
      async () => {
        const dispatchResult = await buildDispatcherCtx(payload, triggerCtx)
        try {
          if ('skipped' in dispatchResult) return dispatchResult
          return await runEngineV1(dispatchResult.ctx)
        } catch (runError) {
          // failed só no erro real; sucesso/skip já emitiram seu terminalReason.
          if (!('skipped' in dispatchResult)) {
            await emitAgentStatus({
              conversationId: dispatchResult.ctx.conversationId,
              organizationId: dispatchResult.ctx.organizationId,
              state: 'idle',
              agentName: 'Agente',
              terminalReason: 'failed',
            })
          }
          throw runError
        } finally {
          await flushLangfuse()
        }
      },
      { name: 'process-agent-message-engine-v1' },
    )()
  },
  onFailure: async ({ payload, error }) =>
    handleAgentTaskFailure('process-agent-message-engine-v1', {
      payload,
      error,
    }),
})

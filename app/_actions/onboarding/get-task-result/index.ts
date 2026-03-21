'use server'

import { runs } from '@trigger.dev/sdk/v3'
import { orgActionClient } from '@/_lib/safe-action'
import { getTaskResultSchema } from './schema'

export const getTaskResult = orgActionClient
  .schema(getTaskResultSchema)
  .action(async ({ parsedInput }) => {
    const run = await runs.retrieve(parsedInput.taskId)

    return {
      status: run.status,
      output: run.output,
    }
  })

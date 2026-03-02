import { defineConfig } from '@trigger.dev/sdk/v3'
import { additionalPackages } from '@trigger.dev/build/extensions/core'
import { prismaExtension } from '@trigger.dev/build/extensions/prisma'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ['./trigger'],
  build: {
    extensions: [
      prismaExtension({
        mode: 'legacy',
        schema: 'prisma/schema.prisma',
      }),
      additionalPackages({
        packages: [
          '@langfuse/otel',
          '@langfuse/tracing',
          '@opentelemetry/sdk-trace-node',
        ],
      }),
    ],
  },
})

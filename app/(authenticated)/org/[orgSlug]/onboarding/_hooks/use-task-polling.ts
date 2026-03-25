'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { getTaskResult } from '@/_actions/onboarding/get-task-result'

const POLLING_INTERVAL_MS = 2000
const POLLING_TIMEOUT_MS = 120_000 // 2 minutos

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELED', 'CRASHED', 'SYSTEM_FAILURE', 'INTERRUPTED', 'TIMED_OUT'])

interface UseTaskPollingResult {
  status: string | null
  output: unknown
  isPolling: boolean
  error: string | null
  startPolling: (taskId: string) => void
  stopPolling: () => void
}

export function useTaskPolling(): UseTaskPollingResult {
  const [status, setStatus] = useState<string | null>(null)
  const [output, setOutput] = useState<unknown>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const taskIdRef = useRef<string | null>(null)

  const { execute } = useAction(getTaskResult, {
    onSuccess: ({ data }) => {
      if (!data) return
      setStatus(data.status)

      if (TERMINAL_STATUSES.has(data.status)) {
        clearPollingInterval()
        setIsPolling(false)

        if (data.status === 'COMPLETED') {
          setOutput(data.output)
        } else {
          setError(`A geração falhou com status: ${data.status}. Tente novamente.`)
        }
      }
    },
    onError: ({ error: actionError }) => {
      clearPollingInterval()
      setIsPolling(false)
      setError(actionError.serverError ?? 'Erro ao verificar status da geração.')
    },
  })

  const clearPollingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const stopPolling = useCallback(() => {
    clearPollingInterval()
    setIsPolling(false)
    taskIdRef.current = null
  }, [clearPollingInterval])

  const startPolling = useCallback(
    (taskId: string) => {
      // Limpa polling anterior se houver
      clearPollingInterval()
      setStatus(null)
      setOutput(null)
      setError(null)
      taskIdRef.current = taskId
      setIsPolling(true)

      // Chama imediatamente e depois a cada 2s
      execute({ taskId })

      intervalRef.current = setInterval(() => {
        if (!taskIdRef.current) return
        execute({ taskId: taskIdRef.current })
      }, POLLING_INTERVAL_MS)

      // Timeout de segurança para não ficar em polling infinito
      timeoutRef.current = setTimeout(() => {
        clearPollingInterval()
        setIsPolling(false)
        setError('A geração demorou demais. Tente novamente.')
      }, POLLING_TIMEOUT_MS)
    },
    [execute, clearPollingInterval],
  )

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      clearPollingInterval()
    }
  }, [clearPollingInterval])

  return { status, output, isPolling, error, startPolling, stopPolling }
}

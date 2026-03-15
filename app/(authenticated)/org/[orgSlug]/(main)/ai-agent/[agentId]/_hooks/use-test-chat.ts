'use client'

import { useRef, useState, useCallback, useReducer } from 'react'
import {
  AbstractChat,
  DefaultChatTransport,
  type ChatInit,
  type ChatStatus,
  type UIMessage,
  type ChatState,
} from 'ai'

// ---------------------------------------------------------------------------
// Cria um ChatState usando Proxy para interceptar TODAS as mutações de
// propriedades e notificar o React (incluindo as que AbstractChat.setStatus
// faz diretamente em `state.status` e `state.error`).
// O callback `onChange` é passado por referência (ref) para nunca ser stale.
// ---------------------------------------------------------------------------
function createProxiedChatState<UI_MESSAGE extends UIMessage>(
  onChangeRef: React.RefObject<() => void>,
): ChatState<UI_MESSAGE> {
  const raw: ChatState<UI_MESSAGE> = {
    status: 'ready' as ChatStatus,
    error: undefined,
    messages: [] as UI_MESSAGE[],

    pushMessage(message: UI_MESSAGE) {
      raw.messages = [...raw.messages, message]
      onChangeRef.current?.()
    },

    popMessage() {
      raw.messages = raw.messages.slice(0, -1)
      onChangeRef.current?.()
    },

    replaceMessage(index: number, message: UI_MESSAGE) {
      const updated = [...raw.messages]
      updated[index] = message
      raw.messages = updated
      onChangeRef.current?.()
    },

    // snapshot: estabilidade de referência sem clonagem
    snapshot<T>(thing: T): T {
      return thing
    },
  }

  // Proxy captura assigns diretos a `status`, `error`, `messages`
  // feitos pelo AbstractChat.setStatus internamente
  return new Proxy(raw, {
    set(target, prop, value) {
      // @ts-expect-error — prop é symbol|string genérico, acesso é seguro aqui
      target[prop] = value
      // Notifica React quando campos reativos mudam
      if (prop === 'status' || prop === 'error' || prop === 'messages') {
        onChangeRef.current?.()
      }
      return true
    },
  })
}

// ---------------------------------------------------------------------------
// Subclasse concreta de AbstractChat para uso no React
// ---------------------------------------------------------------------------
class ReactChat extends AbstractChat<UIMessage> {
  private readonly proxiedState: ChatState<UIMessage>

  constructor(
    init: Omit<ChatInit<UIMessage>, 'messages'> & {
      state: ChatState<UIMessage>
    },
  ) {
    super(init)
    this.proxiedState = init.state
  }

  /**
   * Reseta o estado do chat limpando mensagens e voltando ao status 'ready'.
   * Não faz chamada ao servidor — apenas limpa o state local.
   */
  resetLocal() {
    this.proxiedState.messages = []
    this.proxiedState.status = 'ready'
    this.proxiedState.error = undefined
  }

  getMessages(): UIMessage[] {
    return this.proxiedState.messages
  }

  getStatus(): ChatStatus {
    return this.proxiedState.status
  }

  getError(): Error | undefined {
    return this.proxiedState.error
  }
}

// ---------------------------------------------------------------------------
// Hook público: useTestChat
// ---------------------------------------------------------------------------

interface UseTestChatOptions {
  agentId: string
  onError?: (error: Error) => void
}

interface UseTestChatReturn {
  messages: UIMessage[]
  status: ChatStatus
  isLoading: boolean
  error: Error | undefined
  input: string
  setInput: (value: string) => void
  sendMessage: (text: string) => Promise<void>
  clearMessages: () => void
}

export function useTestChat({ agentId, onError }: UseTestChatOptions): UseTestChatReturn {
  const [input, setInput] = useState('')

  // useReducer como mecanismo de re-render: incrementa a cada mudança de estado
  const [, forceUpdate] = useReducer((count: number) => count + 1, 0)

  // Ref para forceUpdate — garante que o Proxy sempre chama a versão atual
  const forceUpdateRef = useRef(forceUpdate)
  forceUpdateRef.current = forceUpdate

  // Instância persistente do chat — criada uma única vez por agentId
  const chatRef = useRef<ReactChat | null>(null)
  const agentIdRef = useRef(agentId)

  // Recria o chat se o agentId mudar (ex: navegar de um agente para outro)
  if (chatRef.current === null || agentIdRef.current !== agentId) {
    agentIdRef.current = agentId

    const state = createProxiedChatState<UIMessage>(forceUpdateRef)

    chatRef.current = new ReactChat({
      id: `test-chat-${agentId}`,
      transport: new DefaultChatTransport({
        api: `/api/agent/${agentId}/test-chat`,
      }),
      state,
      onError,
    })
  }

  const chat = chatRef.current

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      try {
        await chat.sendMessage({ text })
      } catch {
        // onError já é chamado internamente pelo AbstractChat
      }
    },
    [chat],
  )

  const clearMessages = useCallback(() => {
    chat.resetLocal()
  }, [chat])

  return {
    messages: chat.getMessages(),
    status: chat.getStatus(),
    isLoading: chat.getStatus() === 'submitted' || chat.getStatus() === 'streaming',
    error: chat.getError(),
    input,
    setInput,
    sendMessage,
    clearMessages,
  }
}

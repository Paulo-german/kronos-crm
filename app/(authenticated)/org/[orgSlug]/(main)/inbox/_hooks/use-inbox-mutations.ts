'use client'

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ConversationListDto, ConversationLabelDto } from '@/_data-access/conversation/get-conversations'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { inboxKeys } from '../_lib/inbox-query-keys'
import type { MessagesApiResponse } from './use-inbox-messages'
import { markAsRead } from '@/_actions/inbox/mark-as-read'
import { toggleReadStatus } from '@/_actions/inbox/toggle-read-status'
import { sendMessage } from '@/_actions/inbox/send-message'
import { sendAudio } from '@/_actions/inbox/send-audio'
import { sendMedia } from '@/_actions/inbox/send-media'
import { resolveConversation } from '@/_actions/inbox/resolve-conversation'
import { reopenConversation } from '@/_actions/inbox/reopen-conversation'
import { toggleAiPause } from '@/_actions/inbox/toggle-ai-pause'
import { toggleConversationLabel } from '@/_actions/inbox/toggle-conversation-label'
import { updateConversation } from '@/_actions/inbox/update-conversation'
import { retryFailedMessage } from '@/_actions/inbox/retry-failed-message'
import { sendSimulatorMessage } from '@/_actions/inbox/send-simulator-message'

interface ConversationsPage {
  conversations: ConversationListDto[]
  hasMore: boolean
  totalCount: number
  totalUnread: number
  totalUnanswered: number
}

interface UseInboxMutationsOptions {
  availableLabels: ConversationLabelDto[]
  members: AcceptedMemberDto[]
  statusFilter: 'OPEN' | 'RESOLVED'
}

export function useInboxMutations({ availableLabels, members, statusFilter }: UseInboxMutationsOptions) {
  const queryClient = useQueryClient()

  // Captura snapshot de todas as queries de conversas para rollback em caso de erro
  const captureSnapshot = () =>
    queryClient.getQueriesData<InfiniteData<ConversationsPage>>({ queryKey: inboxKeys.conversations.all() })

  const restoreSnapshot = (snapshot: ReturnType<typeof captureSnapshot> | undefined) => {
    if (!snapshot) return
    for (const [key, data] of snapshot) {
      queryClient.setQueryData(key, data)
    }
  }

  const invalidateConversationList = () => {
    queryClient.invalidateQueries({ queryKey: inboxKeys.conversations.all() })
  }

  const updateConversationInCache = (
    conversationId: string,
    updater: (conv: ConversationListDto) => ConversationListDto,
  ) => {
    queryClient.setQueriesData<InfiniteData<ConversationsPage>>(
      { queryKey: inboxKeys.conversations.all() },
      (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            conversations: page.conversations.map((conv) =>
              conv.id === conversationId ? updater(conv) : conv,
            ),
          })),
        }
      },
    )
  }

  const removeConversationFromCache = (conversationId: string) => {
    queryClient.setQueriesData<InfiniteData<ConversationsPage>>(
      { queryKey: inboxKeys.conversations.all() },
      (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            conversations: page.conversations.filter((conv) => conv.id !== conversationId),
          })),
        }
      },
    )
  }

  const markAsReadMutation = useMutation({
    mutationFn: (conversationId: string) => markAsRead({ conversationId }),
    onMutate: (conversationId) => {
      const snapshot = captureSnapshot()
      updateConversationInCache(conversationId, (conv) => ({ ...conv, unreadCount: 0 }))
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: () => invalidateConversationList(),
  })

  const toggleReadStatusMutation = useMutation({
    mutationFn: (conversationId: string) => toggleReadStatus({ conversationId }),
    onMutate: (conversationId) => {
      const snapshot = captureSnapshot()
      updateConversationInCache(conversationId, (conv) => ({
        ...conv,
        unreadCount: conv.unreadCount > 0 ? 0 : 1,
      }))
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: () => invalidateConversationList(),
  })

  // Sem optimistic update — o resultado depende de confirmação do provedor de mensagens
  const sendMessageMutation = useMutation({
    mutationFn: (input: { conversationId: string; text: string }) => sendMessage(input),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(variables.conversationId) })
      invalidateConversationList()
    },
  })

  const resolveConversationMutation = useMutation({
    mutationFn: (conversationId: string) => resolveConversation({ conversationId }),
    onMutate: (conversationId) => {
      const snapshot = captureSnapshot()
      if (statusFilter !== 'RESOLVED') {
        // Na visão OPEN, a conversa some imediatamente ao ser resolvida
        removeConversationFromCache(conversationId)
        return { snapshot }
      }
      updateConversationInCache(conversationId, (conv) => ({
        ...conv,
        status: 'RESOLVED' as const,
        resolvedAt: new Date(),
      }))
      return { snapshot }
    },
    onSuccess: (result) => {
      if (result?.serverError) {
        toast.error('Erro ao resolver conversa.')
        return
      }
      toast.success('Conversa resolvida.')
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: () => invalidateConversationList(),
  })

  const reopenConversationMutation = useMutation({
    mutationFn: (conversationId: string) => reopenConversation({ conversationId }),
    onMutate: (conversationId) => {
      const snapshot = captureSnapshot()
      if (statusFilter !== 'OPEN') {
        // Na visão RESOLVED, a conversa some imediatamente ao ser reaberta
        removeConversationFromCache(conversationId)
        return { snapshot }
      }
      updateConversationInCache(conversationId, (conv) => ({
        ...conv,
        status: 'OPEN' as const,
        resolvedAt: null,
      }))
      return { snapshot }
    },
    onSuccess: (result) => {
      if (result?.serverError) {
        toast.error('Erro ao reabrir conversa.')
        return
      }
      toast.success('Conversa reaberta.')
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: () => invalidateConversationList(),
  })

  const toggleAiPauseMutation = useMutation({
    mutationFn: (input: { conversationId: string; aiPaused: boolean }) => toggleAiPause(input),
    onMutate: ({ conversationId, aiPaused }) => {
      const snapshot = captureSnapshot()
      updateConversationInCache(conversationId, (conv) => ({ ...conv, aiPaused }))
      // Atualiza também a query de mensagens para refletir o estado de pausa em tempo real
      queryClient.setQueryData<MessagesApiResponse>(
        inboxKeys.messages.byConversation(conversationId),
        (old) => old ? { ...old, aiPaused, pausedAt: aiPaused ? new Date().toISOString() : null } : old,
      )
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: (_data, _err, variables) => {
      invalidateConversationList()
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(variables.conversationId) })
    },
  })

  const toggleLabelMutation = useMutation({
    mutationFn: (input: { conversationId: string; labelId: string }) =>
      toggleConversationLabel(input),
    onMutate: ({ conversationId, labelId }) => {
      const snapshot = captureSnapshot()
      updateConversationInCache(conversationId, (conv) => {
        const hasLabel = conv.labels.some((label) => label.id === labelId)
        const matchingLabel = availableLabels.find((label) => label.id === labelId)
        if (!matchingLabel) return conv
        const newLabels = hasLabel
          ? conv.labels.filter((label) => label.id !== labelId)
          : [...conv.labels, matchingLabel]
        return { ...conv, labels: newLabels }
      })
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: () => invalidateConversationList(),
  })

  const assignConversationMutation = useMutation({
    mutationFn: (input: { conversationId: string; assignedTo: string }) =>
      updateConversation({ conversationId: input.conversationId, assignedTo: input.assignedTo }),
    onMutate: ({ conversationId, assignedTo }) => {
      const snapshot = captureSnapshot()
      const targetMember = members.find((member) => member.userId === assignedTo)
      updateConversationInCache(conversationId, (conv) => ({
        ...conv,
        assignedTo,
        assigneeName: targetMember?.user?.fullName ?? null,
      }))
      return { snapshot }
    },
    onSuccess: (result, variables) => {
      if (result?.serverError) {
        toast.error('Erro ao atribuir conversa.')
        return
      }
      const targetMember = members.find((member) => member.userId === variables.assignedTo)
      const name = targetMember?.user?.fullName
      toast.success(name ? `Conversa atribuída para ${name}` : 'Conversa atribuída com sucesso.')
    },
    onError: (_err, _vars, context) => restoreSnapshot(context?.snapshot),
    onSettled: () => invalidateConversationList(),
  })

  // Sem optimistic update — depende de upload e processamento no servidor
  const sendAudioMutation = useMutation({
    mutationFn: (input: { conversationId: string; audioBase64: string; duration: number }) =>
      sendAudio(input),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(variables.conversationId) })
      invalidateConversationList()
    },
  })

  // Sem optimistic update — depende de upload e processamento no servidor
  const sendMediaMutation = useMutation({
    mutationFn: (input: { conversationId: string; mediaBase64: string; mimetype: string; fileName: string; caption?: string }) =>
      sendMedia(input),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(variables.conversationId) })
      invalidateConversationList()
    },
  })

  const retryFailedMessageMutation = useMutation({
    // conversationId é passado junto apenas para saber qual query de mensagens invalidar
    mutationFn: (input: { messageId: string; conversationId: string }) =>
      retryFailedMessage({ messageId: input.messageId }),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(variables.conversationId) })
    },
  })

  // Sem optimistic update — aguarda o pipeline do agente processar a mensagem simulada
  const sendSimulatorMessageMutation = useMutation({
    mutationFn: (input: { conversationId: string; text: string }) =>
      sendSimulatorMessage(input),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.messages.byConversation(variables.conversationId) })
      invalidateConversationList()
    },
  })

  return {
    markAsRead: markAsReadMutation,
    toggleReadStatus: toggleReadStatusMutation,
    sendMessage: sendMessageMutation,
    sendAudio: sendAudioMutation,
    sendMedia: sendMediaMutation,
    resolveConversation: resolveConversationMutation,
    reopenConversation: reopenConversationMutation,
    toggleAiPause: toggleAiPauseMutation,
    toggleLabel: toggleLabelMutation,
    assignConversation: assignConversationMutation,
    retryFailedMessage: retryFailedMessageMutation,
    sendSimulatorMessage: sendSimulatorMessageMutation,
  }
}

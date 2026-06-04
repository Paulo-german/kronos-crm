interface ConversationsFilters {
  inboxId: string | null
  unreadOnly: boolean
  unansweredOnly: boolean
  search: string
  contactId: string | null
  status: 'OPEN' | 'RESOLVED'
  labelIds: string[]
  assigneeIds: string[]
}

export const inboxKeys = {
  all: ['inbox'] as const,

  conversations: {
    all: () => [...inboxKeys.all, 'conversations'] as const,
    list: (filters: ConversationsFilters) =>
      [...inboxKeys.conversations.all(), 'list', filters] as const,
  },

  messages: {
    all: () => [...inboxKeys.all, 'messages'] as const,
    byConversation: (conversationId: string) =>
      [...inboxKeys.messages.all(), conversationId] as const,
  },
} as const

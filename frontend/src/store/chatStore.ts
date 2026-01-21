import { create } from 'zustand'

import { api } from '../services/api'
import type { Conversation, Message, User } from '../types'
import { useAuthStore } from './authStore'

type ChatState = {
  users: User[]
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Record<string, Message[]> // conversationId -> messages

  isLoading: boolean
  error: string | null

  // Actions
  fetchUsers: () => Promise<void>
  fetchConversations: () => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  selectConversation: (conversationId: string) => Promise<void>
  startNewConversation: (userId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  markAsUnread: (conversationId: string) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  archiveConversation: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  updateUserOnlineStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void
  addMessage: (message: Message) => void
  updateMessageReadStatus: (conversationId: string, readBy: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  users: [],
  conversations: [],
  currentConversationId: null,
  messages: {},
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    try {
      const res = await api.get('/api/users')
      if (res.data.success) {
        set({ users: res.data.users })
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      set({ error: error.response?.data?.error || 'Failed to fetch users' })
    }
  },

  fetchConversations: async () => {
    try {
      set({ isLoading: true })
      const res = await api.get('/api/conversations')
      if (res.data.success) {
        set({ conversations: res.data.conversations, isLoading: false })
      }
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error)
      set({ error: error.response?.data?.error || 'Failed to fetch conversations', isLoading: false })
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      const res = await api.get(`/api/conversations/${conversationId}/messages`)
      if (res.data.success) {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: res.data.messages,
          },
        }))
      }
    } catch (error: any) {
      console.error('Failed to fetch messages:', error)
      set({ error: error.response?.data?.error || 'Failed to fetch messages' })
    }
  },

  selectConversation: async (conversationId: string) => {
    set({ currentConversationId: conversationId })
    const existing = get().messages[conversationId]
    if (!existing || existing.length === 0) {
      await get().fetchMessages(conversationId)
    }
    // Mark as read when selecting
    await get().markAsRead(conversationId)
  },

  startNewConversation: async (userId: string) => {
    try {
      const res = await api.post('/api/conversations', { userId })
      if (res.data.success) {
        const conv = res.data.conversation
        // Refresh conversations list
        await get().fetchConversations()
        // Select the conversation
        await get().selectConversation(conv.id)
      }
    } catch (error: any) {
      console.error('Failed to create conversation:', error)
      set({ error: error.response?.data?.error || 'Failed to create conversation' })
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      const res = await api.post(`/api/conversations/${conversationId}/messages`, { content })
      if (res.data.success) {
        const message = res.data.message
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
          },
        }))
        // Refresh conversations to update lastMessage
        await get().fetchConversations()
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      set({ error: error.response?.data?.error || 'Failed to send message' })
      throw error
    }
  },

  markAsUnread: async (conversationId: string) => {
    try {
      await api.patch(`/api/conversations/${conversationId}`, { markAsUnread: true })
      // Optimistically update local state
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        ),
      }))
    } catch (error: any) {
      console.error('Failed to mark as unread:', error)
      // Revert on error
      await get().fetchConversations()
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      await api.patch(`/api/conversations/${conversationId}`, { markAsRead: true })
      // Update local state optimistically
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) => ({
            ...m,
            isRead: true,
          })),
        },
      }))
    } catch (error: any) {
      console.error('Failed to mark as read:', error)
      // Revert on error
      await get().fetchConversations()
    }
  },

  archiveConversation: async (conversationId: string) => {
    try {
      await api.patch(`/api/conversations/${conversationId}`, { isArchived: true })
      // Optimistically update local state instead of refetching
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, isArchived: true } : c
        ),
      }))
    } catch (error: any) {
      console.error('Failed to archive conversation:', error)
      // Revert on error
      await get().fetchConversations()
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await api.delete(`/api/conversations/${conversationId}`)
      set((state) => {
        const { [conversationId]: _, ...restMessages } = state.messages
        return {
          conversations: state.conversations.filter((c) => c.id !== conversationId),
          messages: restMessages,
          currentConversationId: state.currentConversationId === conversationId ? null : state.currentConversationId,
        }
      })
    } catch (error: any) {
      console.error('Failed to delete conversation:', error)
    }
  },

  updateUserOnlineStatus: (userId: string, isOnline: boolean, lastSeen?: string) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, isOnline, lastSeen } : u)),
      conversations: state.conversations.map((c) =>
        c.otherUser.id === userId ? { ...c, otherUser: { ...c.otherUser, isOnline, lastSeen } } : c,
      ),
    }))
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.conversationId]: [...(state.messages[message.conversationId] || []), message],
      },
    }))
    // Refresh conversations to update lastMessage
    get().fetchConversations()
  },

  updateMessageReadStatus: (conversationId: string, readBy: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.senderId === readBy ? { ...m, isRead: true } : m,
        ),
      },
    }))
  },
}))

export type User = {
  id: string
  name: string
  email: string
  picture?: string | null
  isOnline?: boolean
  lastSeen?: string
}

export type Conversation = {
  id: string
  otherUser: User
  lastMessage: {
    id: string
    content: string
    senderId: string
    receiverId: string
    conversationId: string
    isRead: boolean
    createdAt: string
  } | null
  unreadCount: number
  isArchived: boolean
  isMuted: boolean
  updatedAt: string
}

export type Message = {
  id: string
  content: string
  senderId: string
  receiverId: string
  conversationId: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export type ContactTab = 'media' | 'link' | 'docs'


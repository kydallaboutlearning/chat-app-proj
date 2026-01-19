import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

import type { Message } from '../types'

export type GroupedMessage = {
  id: string
  senderId: string
  messages: string[]
  time: string
  isMe: boolean
  read: boolean
  createdAt: string
}

export function groupMessages(messages: Message[], currentUserId: string): GroupedMessage[] {
  if (messages.length === 0) return []

  const grouped: GroupedMessage[] = []
  let currentGroup: GroupedMessage | null = null

  for (const msg of messages) {
    const isMe = msg.senderId === currentUserId
    const timeDiff = currentGroup
      ? new Date(msg.createdAt).getTime() - new Date(currentGroup.createdAt).getTime()
      : Infinity

    // Group if same sender and within 2 minutes and same read status
    if (
      currentGroup &&
      currentGroup.senderId === msg.senderId &&
      timeDiff < 2 * 60 * 1000 &&
      currentGroup.read === msg.isRead
    ) {
      currentGroup.messages.push(msg.content)
    } else {
      currentGroup = {
        id: msg.id,
        senderId: msg.senderId,
        messages: [msg.content],
        time: formatTime(msg.createdAt),
        isMe,
        read: msg.isRead,
        createdAt: msg.createdAt,
      }
      grouped.push(currentGroup)
    }
  }

  return grouped
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  if (isToday(date)) {
    return format(date, 'h:mm a')
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatConversationTime(dateString: string): string {
  const date = new Date(dateString)
  if (isToday(date)) {
    return format(date, 'h:mm a')
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  return formatDistanceToNow(date, { addSuffix: true })
}

export function getUserAvatarUrl(user: { picture?: string | null; email?: string; name?: string }): string {
  if (user.picture) return user.picture
  const seed = user.email || user.name || 'default'
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

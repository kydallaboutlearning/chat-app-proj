import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useUIStore } from '../store/uiStore'
import { useSocket } from '../hooks/useSocket'
import { formatConversationTime, getUserAvatarUrl, groupMessages } from '../utils/messageHelpers'

const CONTEXT_MENU_WIDTH = 200
const CONTEXT_MENU_ESTIMATED_HEIGHT = 260

export default function ChatPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const logout = useAuthStore((s) => s.logout)
  const users = useChatStore((s) => s.users)
  const conversations = useChatStore((s) => s.conversations)
  const currentConversationId = useChatStore((s) => s.currentConversationId)
  const messagesByConv = useChatStore((s) => s.messages)

  const fetchUsers = useChatStore((s) => s.fetchUsers)
  const fetchConversations = useChatStore((s) => s.fetchConversations)
  const selectConversation = useChatStore((s) => s.selectConversation)
  const startNewConversation = useChatStore((s) => s.startNewConversation)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const markAsUnread = useChatStore((s) => s.markAsUnread)
  const archiveConversation = useChatStore((s) => s.archiveConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const updateUserOnlineStatus = useChatStore((s) => s.updateUserOnlineStatus)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateMessageReadStatus = useChatStore((s) => s.updateMessageReadStatus)

  const socket = useSocket()

  function handleLogout() {
    logout()
    navigate('/auth')
  }

  const isUserDropdownOpen = useUIStore((s) => s.isUserDropdownOpen)
  const toggleUserDropdown = useUIStore((s) => s.toggleUserDropdown)
  const closeUserDropdown = useUIStore((s) => s.closeUserDropdown)

  const isNewMessageModalOpen = useUIStore((s) => s.isNewMessageModalOpen)
  const openNewMessageModal = useUIStore((s) => s.openNewMessageModal)
  const closeNewMessageModal = useUIStore((s) => s.closeNewMessageModal)
  const userSearch = useUIStore((s) => s.userSearch)
  const setUserSearch = useUIStore((s) => s.setUserSearch)

  const contextMenu = useUIStore((s) => s.contextMenu)
  const openContextMenu = useUIStore((s) => s.openContextMenu)
  const closeContextMenu = useUIStore((s) => s.closeContextMenu)

  const isContactInfoOpen = useUIStore((s) => s.isContactInfoOpen)
  const contactInfoUserId = useUIStore((s) => s.contactInfoUserId)
  const activeContactTab = useUIStore((s) => s.activeContactTab)
  const openContactInfo = useUIStore((s) => s.openContactInfo)
  const closeContactInfo = useUIStore((s) => s.closeContactInfo)
  const setActiveContactTab = useUIStore((s) => s.setActiveContactTab)

  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays)

  const [messageText, setMessageText] = useState('')

  const logoRef = useRef<HTMLDivElement | null>(null)
  const userDropdownRef = useRef<HTMLDivElement | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const modalInputRef = useRef<HTMLInputElement | null>(null)
  const chatMessagesRef = useRef<HTMLDivElement | null>(null)

  const swipeRef = useRef<{ convId: string | null; startX: number; translateX: number; isSwiping: boolean }>({
    convId: null,
    startX: 0,
    translateX: 0,
    isSwiping: false,
  })
  const [, forceRerender] = useState(0)

  const currentConversation = useMemo(() => {
    return conversations.find((c) => c.id === currentConversationId) ?? null
  }, [conversations, currentConversationId])

  const currentChatUser = useMemo(() => {
    return currentConversation?.otherUser ?? null
  }, [currentConversation])

  const contactUser = useMemo(() => {
    if (contactInfoUserId) {
      const conv = conversations.find((c) => c.otherUser.id === contactInfoUserId)
      return conv?.otherUser ?? null
    }
    return currentChatUser
  }, [conversations, contactInfoUserId, currentChatUser])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, userSearch])

  const groupedMessages = useMemo(() => {
    if (!currentConversationId || !currentUser) return []
    const msgs = messagesByConv[currentConversationId] || []
    return groupMessages(msgs, currentUser.id)
  }, [messagesByConv, currentConversationId, currentUser])

  // Fetch data on mount
  useEffect(() => {
    if (!currentUser) {
      checkAuth().catch(() => handleLogout())
      return
    }
    fetchUsers()
    fetchConversations()
  }, [fetchUsers, fetchConversations, currentUser, checkAuth])

  // Socket.io real-time updates
  useEffect(() => {
    if (!socket || !currentUser) return

    socket.on('message:new', (message: any) => {
      addMessage(message)
    })

    socket.on('message:read', (data: { conversationId: string; readBy: string }) => {
      updateMessageReadStatus(data.conversationId, data.readBy)
    })

    socket.on('user:online', (data: { userId: string }) => {
      updateUserOnlineStatus(data.userId, true)
    })

    socket.on('user:offline', (data: { userId: string; lastSeen: string }) => {
      updateUserOnlineStatus(data.userId, false, data.lastSeen)
    })

    return () => {
      socket.off('message:new')
      socket.off('message:read')
      socket.off('user:online')
      socket.off('user:offline')
    }
  }, [socket, currentUser, addMessage, updateMessageReadStatus, updateUserOnlineStatus])

  // Close dropdown/context menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node

      if (isUserDropdownOpen) {
        const inDropdown = !!userDropdownRef.current?.contains(target)
        const inLogo = !!logoRef.current?.contains(target)
        if (!inDropdown && !inLogo) closeUserDropdown()
      }

      if (contextMenu.isOpen) {
        const inMenu = !!contextMenuRef.current?.contains(target)
        if (!inMenu) closeContextMenu()
      }
    }

    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [closeContextMenu, closeUserDropdown, contextMenu.isOpen, isUserDropdownOpen])

  // Close overlays on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAllOverlays()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeAllOverlays])

  // Focus search input when modal opens
  useEffect(() => {
    if (!isNewMessageModalOpen) return
    window.setTimeout(() => modalInputRef.current?.focus(), 0)
  }, [isNewMessageModalOpen])

  // Auto-scroll to bottom when messages change (matches `app.js`)
  useEffect(() => {
    const el = chatMessagesRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  // Swipe handlers (ported from `app.js`)
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const s = swipeRef.current
      if (!s.convId) return

      const diff = s.startX - e.clientX
      s.isSwiping = true

      // Right swipe -> positive translateX
      if (diff < 0) {
        s.translateX = Math.min(Math.abs(diff), 70)
      } else if (diff > 0) {
        s.translateX = -Math.min(diff, 70)
      } else {
        s.translateX = 0
      }

      forceRerender((n) => n + 1)
    }

    function onEnd() {
      const s = swipeRef.current
      if (!s.convId) return

      const translateX = s.translateX
      const conv = conversations.find((c) => c.id === s.convId)
      if (conv) {
        if (translateX >= 50) markAsUnread(conv.id)
        if (translateX <= -50) archiveConversation(conv.id)
      }

      s.translateX = 0

      // Reset state after a small delay to prevent click
      window.setTimeout(() => {
        swipeRef.current.isSwiping = false
      }, 100)

      swipeRef.current.convId = null
      forceRerender((n) => n + 1)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [archiveConversation, conversations, markAsUnread])

  function handleContextMenu(e: React.MouseEvent, conversationId: string) {
    e.preventDefault()
    const x = e.clientX
    const y = e.clientY
    const vw = window.innerWidth
    const vh = window.innerHeight

    const adjustedX = x + CONTEXT_MENU_WIDTH > vw ? x - CONTEXT_MENU_WIDTH : x
    const adjustedY = y + CONTEXT_MENU_ESTIMATED_HEIGHT > vh ? y - CONTEXT_MENU_ESTIMATED_HEIGHT : y

    openContextMenu(adjustedX, adjustedY, conversationId)
  }

  function handleContextAction(action: string) {
    if (!contextMenu.isOpen || contextMenu.targetConversationId === null) return
    const conversationId = contextMenu.targetConversationId

    switch (action) {
      case 'unread':
        markAsUnread(conversationId)
        break
      case 'archive':
        archiveConversation(conversationId)
        break
      case 'mute':
        // no-op for now
        break
      case 'contact':
        const conv = conversations.find((c) => c.id === conversationId)
        if (conv) openContactInfo(conv.otherUser.id)
        break
      case 'export':
        // no-op for now
        break
      case 'clear':
        // no-op for now
        break
      case 'delete':
        deleteConversation(conversationId)
        break
    }

    closeContextMenu()
  }

  function handleSelectConversation(conversationId: string) {
    if (swipeRef.current.isSwiping) return
    selectConversation(conversationId)
  }

  async function onSend() {
    if (!currentConversationId || !messageText.trim()) return
    try {
      await sendMessage(currentConversationId, messageText.trim())
      setMessageText('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // If auth is missing, show a friendly fallback instead of a blank screen
  if (!currentUser) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p>Session expired or invalid. Please log in again.</p>
          <button className="submit-btn" type="button" onClick={handleLogout}>
            Go to login
          </button>
        </div>
      </div>
    )
  }

  const appContainerClass = clsx('app-container', isContactInfoOpen && 'contact-open')

  return (
    <div className={appContainerClass}>
      {/* Left Icon Sidebar */}
      <aside className="icon-sidebar">
        <div
          className="logo"
          id="logoMenuTrigger"
          ref={logoRef}
          onClick={(e) => {
            e.stopPropagation()
            toggleUserDropdown()
          }}
        >
          <img
            src="https://api.dicebear.com/7.x/shapes/svg?seed=logo&backgroundColor=10b981"
            alt="Logo"
            className="logo-icon"
          />
        </div>

        <nav className="icon-nav">
          <a href="#" className="nav-icon-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </a>
          <a href="#" className="nav-icon-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </a>
          <a href="#" className="nav-icon-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </a>
          <a href="#" className="nav-icon-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </a>
          <a href="#" className="nav-icon-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <button className="ai-button" title="AI Assistant" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
          <div className="user-avatar-small">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=testing2" alt="User" />
          </div>
        </div>
      </aside>

      {/* User Dropdown Menu */}
      <div className={clsx('user-dropdown', isUserDropdownOpen && 'show')} id="userDropdown" ref={userDropdownRef}>
        <a href="#" className="dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Go back to dashboard
        </a>
        <a href="#" className="dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
          Rename file
        </a>

        <div className="dropdown-divider"></div>

        <div className="dropdown-user-info">
          <div className="dropdown-user-name">testing2</div>
          <div className="dropdown-user-email">testing2@gmail.com</div>
        </div>

        <div className="dropdown-credits">
          <div className="credits-header">
            <span className="credits-label">Credits</span>
            <span className="credits-renew">
              Renews in <strong>6h 24m</strong>
            </span>
          </div>
          <div className="credits-value">20 left</div>
          <div className="credits-bar">
            <div className="credits-bar-fill" style={{ width: '20%' }}></div>
          </div>
          <div className="credits-usage">
            <span>5 of 25 used today</span>
            <span className="credits-tomorrow">+25 tomorrow</span>
          </div>
        </div>

        <div className="dropdown-divider"></div>

        <a href="#" className="dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Win free credits
        </a>
        <a href="#" className="dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Theme Style
        </a>
        <a href="#" className="dropdown-item logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Log out
        </a>
      </div>

      {/* Conversation List Sidebar */}
      <aside className="conversation-sidebar">
        <div className="conversation-header">
          <h2>All Message</h2>
          <button className="new-message-btn" id="newMessageBtn" type="button" onClick={openNewMessageModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
            New Message
          </button>
        </div>

        <div className="conversation-search">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" placeholder="Search" className="search-input" />
          </div>
          <button className="filter-btn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
        </div>

        <div className="conversation-list" id="conversationList">
          {conversations.filter((c) => !c.isArchived).map((conv) => {
            const user = conv.otherUser
            const active = conv.id === currentConversationId
            const isSwipingThis = swipeRef.current.convId === conv.id
            const translateX = isSwipingThis ? swipeRef.current.translateX : 0
            const showLeft = isSwipingThis && translateX > 35
            const showRight = isSwipingThis && translateX < -35

            return (
              <div className="conversation-item-wrapper" data-conv-id={conv.id} key={conv.id}>
                <div className={clsx('swipe-action left', showLeft && 'visible')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Unread
                </div>
                <div className={clsx('swipe-action right', showRight && 'visible')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="21 8 21 21 3 21 3 8"></polyline>
                    <rect x="1" y="3" width="22" height="5"></rect>
                    <line x1="10" y1="12" x2="14" y2="12"></line>
                  </svg>
                  Archive
                </div>

                <div
                  className={clsx('conversation-item', active && 'active', conv.unreadCount > 0 && 'unread', isSwipingThis && 'swiping')}
                  style={{ transform: translateX ? `translateX(${translateX}px)` : undefined }}
                  onPointerDown={(e) => {
                    swipeRef.current.convId = conv.id
                    swipeRef.current.startX = e.clientX
                    swipeRef.current.translateX = 0
                    swipeRef.current.isSwiping = false
                  }}
                  onClick={() => handleSelectConversation(conv.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    openContextMenu(e.clientX, e.clientY, conv.id)
                  }}
                >
                  {conv.unreadCount > 0 ? (
                    <div className="unread-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>Unread</span>
                    </div>
                  ) : (
                    <div className="conversation-avatar">
                      <img src={getUserAvatarUrl(user)} alt={user.name} />
                      {user.isOnline ? <span className="online-dot"></span> : null}
                    </div>
                  )}

                  <div className="conversation-content">
                    <div className="conversation-top">
                      <span className="conversation-name">{user.name}</span>
                      <span className="conversation-time">
                        {conv.lastMessage ? formatConversationTime(conv.lastMessage.createdAt) : formatConversationTime(conv.updatedAt)}
                      </span>
                    </div>
                    <div className="conversation-bottom">
                      <span className="conversation-preview">{conv.lastMessage?.content || 'Start a conversation...'}</span>
                      {conv.lastMessage?.isRead && conv.unreadCount === 0 ? (
                        <span className="read-receipt">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ marginLeft: -8 }}
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Conversation Context Menu */}
      <div
        className={clsx('context-menu', contextMenu.isOpen && 'show')}
        id="contextMenu"
        ref={contextMenuRef}
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <div className="context-menu-item" data-action="unread" onClick={() => handleContextAction('unread')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
          Mark as unread
        </div>
        <div className="context-menu-item" data-action="archive" onClick={() => handleContextAction('archive')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8"></polyline>
            <rect x="1" y="3" width="22" height="5"></rect>
            <line x1="10" y1="12" x2="14" y2="12"></line>
          </svg>
          Archive
        </div>
        <div className="context-menu-item has-submenu" data-action="mute" onClick={() => handleContextAction('mute')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
          Mute
          <svg className="submenu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
        <div className="context-menu-item" data-action="contact" onClick={() => handleContextAction('contact')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Contact info
        </div>
        <div className="context-menu-item" data-action="export" onClick={() => handleContextAction('export')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Export chat
        </div>
        <div className="context-menu-item" data-action="clear" onClick={() => handleContextAction('clear')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Clear chat
        </div>
        <div className="context-menu-item danger" data-action="delete" onClick={() => handleContextAction('delete')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete chat
        </div>
      </div>

      {/* New Message Modal */}
      <div
        className={clsx('modal-overlay', isNewMessageModalOpen && 'show')}
        id="newMessageModal"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeNewMessageModal()
        }}
      >
        <div className="new-message-modal">
          <h3>New Message</h3>
          <div className="modal-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search name or email"
              id="userSearchInput"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              ref={modalInputRef}
            />
          </div>
          <div className="user-list" id="userList">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="user-list-item"
                data-user-id={u.id}
                onClick={() => {
                  startNewConversation(u.id)
                  closeNewMessageModal()
                }}
              >
                <img src={getUserAvatarUrl(u)} alt={u.name} />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <main className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            {currentChatUser && (
              <>
                <div className="chat-user-avatar" onClick={() => openContactInfo(currentChatUser.id)}>
                  <img src={getUserAvatarUrl(currentChatUser)} alt={currentChatUser.name} id="chatUserAvatar" />
                  {currentChatUser.isOnline ? <span className="online-indicator"></span> : null}
                </div>
                <div className="chat-user-info">
                  <h3 id="chatUserName">{currentChatUser.name}</h3>
                  <span
                    className="chat-user-status"
                    id="chatUserStatus"
                    style={{ color: currentChatUser.isOnline ? '#10b981' : '#6b7280' }}
                  >
                    {currentChatUser.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="chat-header-actions">
            <button className="header-action-btn" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <button className="header-action-btn" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </button>
            <button className="header-action-btn" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </button>
            <button className="header-action-btn" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-messages" id="chatMessages" ref={chatMessagesRef}>
          {groupedMessages.length > 0 && (
            <div className="message-date-divider">
              <span>Today</span>
            </div>
          )}
          {groupedMessages.map((msg) => {
            const groupClass = msg.isMe ? 'sent' : 'received'
            const lastIndex = msg.messages.length - 1
            return (
              <div className={clsx('message-group', groupClass)} key={msg.id}>
                {msg.messages.map((text, index) => (
                  <div key={`${msg.id}-${index}`} className="message-bubble">
                    {text}
                  </div>
                ))}
                <div className="message-time">
                  {msg.time}
                  {msg.isMe && msg.read ? (
                    <span className="read-status">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ marginLeft: -6 }}
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
          {groupedMessages.length === 0 && currentConversation && (
            <div className="empty-chat">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <input
              type="text"
              placeholder="Type any message..."
              className="chat-input"
              id="messageInput"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSend()
                }
              }}
            />
            <div className="chat-input-actions">
              <button className="input-action-btn" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>
              <button className="input-action-btn" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </button>
              <button className="input-action-btn" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
            </div>
            <button className="send-btn" id="sendBtn" type="button" onClick={onSend}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Contact Info Sidebar */}
      <aside className={clsx('contact-info-sidebar', isContactInfoOpen && 'show')} id="contactInfoSidebar">
        <div className="contact-info-header">
          <h3>Contact Info</h3>
          <button className="close-btn" id="closeContactInfo" type="button" onClick={closeContactInfo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="contact-info-content">
          {contactUser && (
            <>
              <div className="contact-profile">
                <div className="contact-avatar">
                  <img src={getUserAvatarUrl(contactUser)} alt={contactUser.name} id="contactAvatar" />
                </div>
                <h4 className="contact-name" id="contactName">
                  {contactUser.name}
                </h4>
                <span className="contact-email" id="contactEmail">
                  {contactUser.email}
                </span>
              </div>
            </>
          )}

          <div className="contact-actions">
            <button className="contact-action-btn" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Audio
            </button>
            <button className="contact-action-btn" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              Video
            </button>
          </div>

          <div className="contact-tabs">
            <button
              className={clsx('contact-tab', activeContactTab === 'media' && 'active')}
              data-tab="media"
              type="button"
              onClick={() => setActiveContactTab('media')}
            >
              Media
            </button>
            <button
              className={clsx('contact-tab', activeContactTab === 'link' && 'active')}
              data-tab="link"
              type="button"
              onClick={() => setActiveContactTab('link')}
            >
              Link
            </button>
            <button
              className={clsx('contact-tab', activeContactTab === 'docs' && 'active')}
              data-tab="docs"
              type="button"
              onClick={() => setActiveContactTab('docs')}
            >
              Docs
            </button>
          </div>

          <div className="contact-tab-content" id="contactTabContent">
            <div className={clsx('tab-pane', activeContactTab === 'media' && 'active')} data-pane="media">
              <div className="media-section">
                <div className="media-month">
                  <span className="month-label">May</span>
                  <div className="media-grid">
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                  </div>
                </div>
                <div className="media-month">
                  <span className="month-label">April</span>
                  <div className="media-grid">
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                  </div>
                </div>
                <div className="media-month">
                  <span className="month-label">March</span>
                  <div className="media-grid">
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1518173946687-a4c036bc6c9f?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                    <div className="media-item">
                      <img
                        src="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=100&h=100&fit=crop"
                        alt="Media"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx('tab-pane', activeContactTab === 'link' && 'active')} data-pane="link">
              <div className="links-section">
                <div className="links-month">
                  <span className="month-label">May</span>
                  <div className="links-list">
                    <a href="#" className="link-item">
                      <div className="link-icon">
                        <img src="https://www.google.com/s2/favicons?domain=basecamp.com&sz=32" alt="Basecamp" />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://basecamp.net/</span>
                        <span className="link-description">
                          Discover thousands of premium UI kits, templates, and design resources tailored for designers,
                          developers, and...
                        </span>
                      </div>
                    </a>
                    <a href="#" className="link-item">
                      <div className="link-icon">
                        <img src="https://www.google.com/s2/favicons?domain=notion.com&sz=32" alt="Notion" />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://notion.com/</span>
                        <span className="link-description">
                          A new tool that blends your everyday work apps into one. It&apos;s the all-in-one workspace for you
                          and your team.
                        </span>
                      </div>
                    </a>
                    <a href="#" className="link-item">
                      <div className="link-icon asana">
                        <img src="https://www.google.com/s2/favicons?domain=asana.com&sz=32" alt="Asana" />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://asana.com/</span>
                        <span className="link-description">
                          Work anytime, anywhere with Asana. Keep remote and distributed teams, and your entire
                          organization, focused...
                        </span>
                      </div>
                    </a>
                    <a href="#" className="link-item">
                      <div className="link-icon">
                        <img src="https://www.google.com/s2/favicons?domain=trello.com&sz=32" alt="Trello" />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://trello.com/</span>
                        <span className="link-description">
                          Make the impossible, possible with Trello. The ultimate teamwork project management tool. Start
                          up board in se ...
                        </span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx('tab-pane', activeContactTab === 'docs' && 'active')} data-pane="docs">
              <div className="docs-section">
                <div className="docs-month">
                  <span className="month-label">May</span>
                  <div className="docs-list">
                    <div className="doc-item">
                      <div className="doc-icon pdf">
                        <span>PDF</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">Document Requirement.pdf</span>
                        <span className="doc-meta">10 pages • 16 MB • pdf</span>
                      </div>
                    </div>
                    <div className="doc-item">
                      <div className="doc-icon pdf">
                        <span>PDF</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">User Flow.pdf</span>
                        <span className="doc-meta">7 pages • 32 MB • pdf</span>
                      </div>
                    </div>
                    <div className="doc-item">
                      <div className="doc-icon fig">
                        <span>FIG</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">Existing App.fig</span>
                        <span className="doc-meta">213 MB • fig</span>
                      </div>
                    </div>
                    <div className="doc-item">
                      <div className="doc-icon ai">
                        <span>AI</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">Product Illustrations.ai</span>
                        <span className="doc-meta">72 MB • ai</span>
                      </div>
                    </div>
                    <div className="doc-item">
                      <div className="doc-icon pdf">
                        <span>PDF</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">Quotation-Hikariworks-May.pdf</span>
                        <span className="doc-meta">2 pages • 329 KB • pdf</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Header Bar */}
      <header className="top-header">
        <div className="header-left">
          <div className="breadcrumb">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Message</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Search</span>
            <span className="shortcut">⌘+K</span>
          </div>
          <button className="header-icon-btn" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
          <button className="header-icon-btn" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <div className="header-user">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=testing2" alt="User" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </header>
    </div>
  )
}


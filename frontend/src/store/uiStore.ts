import { create } from 'zustand'

import type { ContactTab } from '../types'

type ContextMenuState =
  | { isOpen: false; x: number; y: number; targetConversationId: string | null }
  | { isOpen: true; x: number; y: number; targetConversationId: string }

type UIState = {
  isUserDropdownOpen: boolean
  isNewMessageModalOpen: boolean
  userSearch: string
  conversationSearch: string
  showUnreadOnly: boolean
  showArchivedOnly: boolean
  showAll: boolean
  globalSearchOpen: boolean
  chatSearchOpen: boolean

  contextMenu: ContextMenuState

  isContactInfoOpen: boolean
  contactInfoUserId: string | null
  activeContactTab: ContactTab

  openUserDropdown: () => void
  closeUserDropdown: () => void
  toggleUserDropdown: () => void

  openNewMessageModal: () => void
  closeNewMessageModal: () => void
  setUserSearch: (value: string) => void
  setConversationSearch: (value: string) => void
  toggleUnreadFilter: () => void
  toggleArchivedFilter: () => void
  setShowAll: () => void
  setGlobalSearchOpen: (open: boolean) => void
  setChatSearchOpen: (open: boolean) => void

  openContextMenu: (x: number, y: number, targetConversationId: string) => void
  closeContextMenu: () => void

  openContactInfo: (userId: string) => void
  closeContactInfo: () => void
  setActiveContactTab: (tab: ContactTab) => void

  closeAllOverlays: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isUserDropdownOpen: false,
  isNewMessageModalOpen: false,
  userSearch: '',
  conversationSearch: '',
  showUnreadOnly: false,
  showArchivedOnly: false,
  showAll: true,
  globalSearchOpen: false,
  chatSearchOpen: false,

  contextMenu: { isOpen: false, x: 0, y: 0, targetConversationId: null },

  isContactInfoOpen: false,
  contactInfoUserId: null,
  activeContactTab: 'media',

  openUserDropdown: () => set({ isUserDropdownOpen: true }),
  closeUserDropdown: () => set({ isUserDropdownOpen: false }),
  toggleUserDropdown: () => set((s) => ({ isUserDropdownOpen: !s.isUserDropdownOpen })),

  openNewMessageModal: () => set({ isNewMessageModalOpen: true, userSearch: '' }),
  closeNewMessageModal: () => set({ isNewMessageModalOpen: false }),
  setUserSearch: (value) => set({ userSearch: value }),
  setConversationSearch: (value) => set({ conversationSearch: value }),
  toggleUnreadFilter: () => set((s) => ({ 
    showUnreadOnly: !s.showUnreadOnly,
    showArchivedOnly: false,
    showAll: false 
  })),
  toggleArchivedFilter: () => set((s) => ({ 
    showArchivedOnly: !s.showArchivedOnly,
    showUnreadOnly: false,
    showAll: false 
  })),
  setShowAll: () => set({ showUnreadOnly: false, showArchivedOnly: false, showAll: true }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  setChatSearchOpen: (open) => set({ chatSearchOpen: open }),

  openContextMenu: (x, y, targetConversationId) =>
    set({
      contextMenu: { isOpen: true, x, y, targetConversationId },
    }),
  closeContextMenu: () => set({ contextMenu: { isOpen: false, x: 0, y: 0, targetConversationId: null } }),

  openContactInfo: (userId) =>
    set({
      isContactInfoOpen: true,
      contactInfoUserId: userId,
    }),
  closeContactInfo: () =>
    set({
      isContactInfoOpen: false,
      contactInfoUserId: null,
    }),
  setActiveContactTab: (tab) => set({ activeContactTab: tab }),

  closeAllOverlays: () =>
    set({
      isUserDropdownOpen: false,
      isNewMessageModalOpen: false,
      contextMenu: { isOpen: false, x: 0, y: 0, targetConversationId: null },
      isContactInfoOpen: false,
      contactInfoUserId: null,
    }),
}))


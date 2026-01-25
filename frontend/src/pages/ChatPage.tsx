import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import clsx from "clsx";

import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { useUIStore } from "../store/uiStore";
import { useSocket } from "../hooks/useSocket";
import {
  formatConversationTime,
  getUserAvatarUrl,
  groupMessages,
} from "../utils/messageHelpers";

const CONTEXT_MENU_WIDTH = 200;
const CONTEXT_MENU_ESTIMATED_HEIGHT = 260;

export default function ChatPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const logout = useAuthStore((s) => s.logout);
  const users = useChatStore((s) => s.users);
  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const messagesByConv = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const chatError = useChatStore((s) => s.error);

  const fetchUsers = useChatStore((s) => s.fetchUsers);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markAsUnread = useChatStore((s) => s.markAsUnread);
  const archiveConversation = useChatStore((s) => s.archiveConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const updateUserOnlineStatus = useChatStore((s) => s.updateUserOnlineStatus);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageReadStatus = useChatStore(
    (s) => s.updateMessageReadStatus,
  );

  const socket = useSocket();

  function handleLogout() {
    logout();
    navigate("/auth");
  }

  const isUserDropdownOpen = useUIStore((s) => s.isUserDropdownOpen);
  const toggleUserDropdown = useUIStore((s) => s.toggleUserDropdown);
  const closeUserDropdown = useUIStore((s) => s.closeUserDropdown);

  const isNewMessageModalOpen = useUIStore((s) => s.isNewMessageModalOpen);
  const openNewMessageModal = useUIStore((s) => s.openNewMessageModal);
  const closeNewMessageModal = useUIStore((s) => s.closeNewMessageModal);
  const userSearch = useUIStore((s) => s.userSearch);
  const setUserSearch = useUIStore((s) => s.setUserSearch);
  const conversationSearch = useUIStore((s) => s.conversationSearch);
  const setConversationSearch = useUIStore((s) => s.setConversationSearch);
  const showUnreadOnly = useUIStore((s) => s.showUnreadOnly);
  const toggleUnreadFilter = useUIStore((s) => s.toggleUnreadFilter);
  const showArchivedOnly = useUIStore((s) => s.showArchivedOnly);
  const toggleArchivedFilter = useUIStore((s) => s.toggleArchivedFilter);
  const showAll = useUIStore((s) => s.showAll);
  const globalSearchOpen = useUIStore((s) => s.globalSearchOpen);
  const setGlobalSearchOpen = useUIStore((s) => s.setGlobalSearchOpen);
  const chatSearchOpen = useUIStore((s) => s.chatSearchOpen);
  const setChatSearchOpen = useUIStore((s) => s.setChatSearchOpen);

  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");

  const contextMenu = useUIStore((s) => s.contextMenu);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);

  const isContactInfoOpen = useUIStore((s) => s.isContactInfoOpen);
  const contactInfoUserId = useUIStore((s) => s.contactInfoUserId);
  const activeContactTab = useUIStore((s) => s.activeContactTab);
  const openContactInfo = useUIStore((s) => s.openContactInfo);
  const closeContactInfo = useUIStore((s) => s.closeContactInfo);
  const setActiveContactTab = useUIStore((s) => s.setActiveContactTab);

  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays);

  const [messageText, setMessageText] = useState("");

  const logoRef = useRef<HTMLDivElement | null>(null);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const modalInputRef = useRef<HTMLInputElement | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  const swipeRef = useRef<{
    convId: string | null;
    startX: number;
    translateX: number;
    isSwiping: boolean;
  }>({
    convId: null,
    startX: 0,
    translateX: 0,
    isSwiping: false,
  });
  const [, forceRerender] = useState(0);

  const currentConversation = useMemo(() => {
    return conversations.find((c) => c.id === currentConversationId) ?? null;
  }, [conversations, currentConversationId]);

  const currentChatUser = useMemo(() => {
    return currentConversation?.otherUser ?? null;
  }, [currentConversation]);

  const contactUser = useMemo(() => {
    if (contactInfoUserId) {
      const conv = conversations.find(
        (c) => c.otherUser.id === contactInfoUserId,
      );
      return conv?.otherUser ?? null;
    }
    return currentChatUser;
  }, [conversations, contactInfoUserId, currentChatUser]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  // Filter conversations based on search and filters
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // Apply archived filter
    if (showArchivedOnly) {
      filtered = filtered.filter((c) => c.isArchived);
    } else if (showUnreadOnly) {
      // Show unread only (non-archived)
      filtered = filtered.filter((c) => !c.isArchived && c.unreadCount > 0);
    } else if (showAll) {
      // Show all non-archived by default
      filtered = filtered.filter((c) => !c.isArchived);
    }

    // Apply search filter
    const searchQuery = conversationSearch.trim().toLowerCase();
    if (searchQuery) {
      filtered = filtered.filter((c) => {
        const userName = c.otherUser.name.toLowerCase();
        const userEmail = c.otherUser.email.toLowerCase();
        const lastMessage = c.lastMessage?.content.toLowerCase() || "";
        return (
          userName.includes(searchQuery) ||
          userEmail.includes(searchQuery) ||
          lastMessage.includes(searchQuery)
        );
      });
    }

    return filtered;
  }, [
    conversations,
    conversationSearch,
    showUnreadOnly,
    showArchivedOnly,
    showAll,
  ]);

  const groupedMessages = useMemo(() => {
    if (!currentConversationId || !currentUser) return [];
    const msgs = messagesByConv[currentConversationId] || [];
    return groupMessages(msgs, currentUser.id);
  }, [messagesByConv, currentConversationId, currentUser]);

  // Fetch data on mount - only once
  useEffect(() => {
    if (!currentUser) {
      checkAuth().catch(() => handleLogout());
      return;
    }
    // Fetch data only once on mount
    fetchUsers();
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Socket.io real-time updates
  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.on("message:new", (message: any) => {
      addMessage(message);
    });

    socket.on(
      "message:read",
      (data: { conversationId: string; readBy: string }) => {
        updateMessageReadStatus(data.conversationId, data.readBy);
      },
    );

    socket.on("user:online", (data: { userId: string }) => {
      updateUserOnlineStatus(data.userId, true);
    });

    socket.on("user:offline", (data: { userId: string; lastSeen: string }) => {
      updateUserOnlineStatus(data.userId, false, data.lastSeen);
    });

    return () => {
      socket.off("message:new");
      socket.off("message:read");
      socket.off("user:online");
      socket.off("user:offline");
    };
  }, [
    socket,
    currentUser,
    addMessage,
    updateMessageReadStatus,
    updateUserOnlineStatus,
  ]);

  // Close dropdown/context menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;

      if (isUserDropdownOpen) {
        const inDropdown = !!userDropdownRef.current?.contains(target);
        const inLogo = !!logoRef.current?.contains(target);
        if (!inDropdown && !inLogo) closeUserDropdown();
      }

      if (contextMenu.isOpen) {
        const inMenu = !!contextMenuRef.current?.contains(target);
        if (!inMenu) closeContextMenu();
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [
    closeContextMenu,
    closeUserDropdown,
    contextMenu.isOpen,
    isUserDropdownOpen,
  ]);

  // Close overlays on Escape and handle keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeAllOverlays();
        setGlobalSearchOpen(false);
        setChatSearchOpen(false);
      }
      // Cmd+K or Ctrl+K for global search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeAllOverlays, setGlobalSearchOpen, setChatSearchOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (!isNewMessageModalOpen) return;
    window.setTimeout(() => modalInputRef.current?.focus(), 0);
  }, [isNewMessageModalOpen]);

  // Auto-scroll to bottom when messages change (matches `app.js`)
  useEffect(() => {
    const el = chatMessagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [groupedMessages.length]);

  // Swipe handlers (ported from `app.js`)
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const s = swipeRef.current;
      if (!s.convId) return;

      const diff = s.startX - e.clientX;
      s.isSwiping = true;

      // Right swipe -> positive translateX
      if (diff < 0) {
        s.translateX = Math.min(Math.abs(diff), 70);
      } else if (diff > 0) {
        s.translateX = -Math.min(diff, 70);
      } else {
        s.translateX = 0;
      }

      forceRerender((n) => n + 1);
    }

    function onEnd() {
      const s = swipeRef.current;
      if (!s.convId) return;

      const translateX = s.translateX;
      const conv = conversations.find((c) => c.id === s.convId);
      if (conv && s.isSwiping) {
        if (translateX >= 50) {
          markAsUnread(conv.id);
        }
        if (translateX <= -50) {
          archiveConversation(conv.id);
        }
      }

      s.translateX = 0;

      // Reset state after a small delay to prevent click
      window.setTimeout(() => {
        swipeRef.current.isSwiping = false;
      }, 100);

      swipeRef.current.convId = null;
      forceRerender((n) => n + 1);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [archiveConversation, conversations, markAsUnread]);

  const handleContextAction = useCallback(
    (action: string) => {
      if (!contextMenu.isOpen || contextMenu.targetConversationId === null)
        return;
      const conversationId = contextMenu.targetConversationId;

      switch (action) {
        case "unread":
          markAsUnread(conversationId);
          break;
        case "archive":
          archiveConversation(conversationId);
          break;
        case "mute":
          // no-op for now
          break;
        case "contact":
          const conv = conversations.find((c) => c.id === conversationId);
          if (conv) openContactInfo(conv.otherUser.id);
          break;
        case "export":
          // no-op for now
          break;
        case "clear":
          // no-op for now
          break;
        case "delete":
          deleteConversation(conversationId);
          break;
      }

      closeContextMenu();
    },
    [
      contextMenu,
      conversations,
      markAsUnread,
      archiveConversation,
      openContactInfo,
      deleteConversation,
      closeContextMenu,
    ],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (swipeRef.current.isSwiping) return;
      selectConversation(conversationId);
    },
    [selectConversation],
  );

  const onSend = useCallback(async () => {
    if (!currentConversationId || !messageText.trim()) return;
    const textToSend = messageText.trim();
    // Clear input immediately for better UX
    setMessageText("");
    try {
      await sendMessage(currentConversationId, textToSend);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore text on error
      setMessageText(textToSend);
    }
  }, [currentConversationId, messageText, sendMessage]);

  // If auth is missing, show a friendly fallback instead of a blank screen
  if (!currentUser) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p>Session expired or invalid. Please log in again.</p>
          <button className="submit-btn" type="button" onClick={handleLogout}>
            Go to login
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while initial data is being fetched
  if (isLoading && conversations.length === 0 && users.length === 0) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "16px", fontSize: "18px" }}>
            Loading...
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px" }}>
            Fetching your conversations
          </div>
        </div>
      </div>
    );
  }

  // Show error if there's a chat error
  if (chatError && conversations.length === 0) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{ textAlign: "center", maxWidth: "400px", padding: "20px" }}
        >
          <div
            style={{ color: "#b91c1c", marginBottom: "16px", fontSize: "16px" }}
          >
            ⚠️ Error loading chat
          </div>
          <div
            style={{ color: "#6b7280", marginBottom: "20px", fontSize: "14px" }}
          >
            {chatError}
          </div>
          <button
            className="submit-btn"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const appContainerClass = clsx(
    "app-container",
    isContactInfoOpen && "contact-open",
  );

  return (
    <div className={appContainerClass}>
      {/* Left Icon Sidebar */}
      <aside className="icon-sidebar">
        {/* Green Compose Button at Top */}
        <button
          className="compose-button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleUserDropdown();
          }}
          title="New Message"
        >
          <svg
            width="20"
            height="22"
            viewBox="0 0 20 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path="url(#clip0_0_2597)">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M0.000228882 8.25V17.05H2.75023C3.03913 17.05 3.3252 17.1069 3.59215 17.2175C3.85902 17.328 4.10159 17.4901 4.30583 17.6944C4.51014 17.8987 4.67221 18.1412 4.78279 18.4081C4.89329 18.675 4.95023 18.9611 4.95023 19.25V22H11.5502L19.8002 13.75V4.95H17.0502C16.7613 4.95 16.4753 4.8931 16.2083 4.78254C15.9414 4.67198 15.6989 4.50992 15.4946 4.30564C15.2903 4.10135 15.1283 3.85881 15.0176 3.5919C14.9072 3.32499 14.8502 3.03892 14.8502 2.75V0H8.25023L0.000228882 8.25ZM9.35023 16.5H5.50023V10.45L10.4502 5.5H14.3002V11.55L9.35023 16.5Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id="clip0_0_2597">
                <rect width="19.8" height="22" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </button>

        <nav className="icon-nav">
          {/* Home Icon */}
          <a href="#" className="nav-icon-item" title="Home">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.5 9.375V16.875C17.5 17.0408 17.4342 17.1997 17.3169 17.3169C17.1997 17.4342 17.0408 17.5 16.875 17.5H12.5C12.3342 17.5 12.1753 17.4342 12.0581 17.3169C11.9408 17.1997 11.875 17.0408 11.875 16.875V12.8125C11.875 12.7296 11.8421 12.6501 11.7835 12.5915C11.7249 12.5329 11.6454 12.5 11.5625 12.5H8.4375C8.35462 12.5 8.27513 12.5329 8.21653 12.5915C8.15792 12.6501 8.125 12.7296 8.125 12.8125V16.875C8.125 17.0408 8.05915 17.1997 7.94194 17.3169C7.82473 17.4342 7.66576 17.5 7.5 17.5H3.125C2.95924 17.5 2.80027 17.4342 2.68306 17.3169C2.56585 17.1997 2.5 17.0408 2.5 16.875V9.375C2.50015 9.04354 2.63195 8.72571 2.86641 8.49141L9.11641 2.24141C9.3508 2.00716 9.66862 1.87558 10 1.87558C10.3314 1.87558 10.6492 2.00716 10.8836 2.24141L17.1336 8.49141C17.368 8.72571 17.4998 9.04354 17.5 9.375Z"
                fill="#151515"
              />
            </svg>
          </a>
          {/* Chat Icon - Active */}
          <a href="#" className="nav-icon-item active" title="Messages">
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.12677 1.93496e-07C6.72401 -0.000305907 5.34507 0.362569 4.12416 1.0533C2.90325 1.74404 1.88197 2.7391 1.15972 3.94164C0.437474 5.14418 0.0388684 6.51322 0.00270152 7.91552C-0.0334654 9.31781 0.294039 10.7056 0.953336 11.9438L0.0666172 14.6039C-0.00683229 14.8242 -0.0174915 15.0605 0.0358342 15.2865C0.08916 15.5124 0.204363 15.7191 0.368532 15.8832C0.532701 16.0474 0.739347 16.1626 0.96531 16.2159C1.19127 16.2693 1.42762 16.2586 1.64787 16.1852L4.30802 15.2984C5.39769 15.878 6.60506 16.2017 7.83851 16.245C9.07196 16.2883 10.2991 16.05 11.4267 15.5482C12.5543 15.0465 13.5528 14.2944 14.3463 13.3491C15.1399 12.4039 15.7076 11.2902 16.0066 10.0928C16.3055 8.89529 16.3276 7.64547 16.0714 6.43815C15.8152 5.23084 15.2873 4.09776 14.5277 3.12493C13.7682 2.15211 12.797 1.36509 11.6879 0.823636C10.5789 0.282179 9.36098 0.00050643 8.12677 1.93496e-07ZM8.12677 15C6.91816 15.0008 5.73076 14.6825 4.68459 14.0773C4.60799 14.0329 4.52283 14.0053 4.43474 13.9963C4.34666 13.9872 4.25766 13.997 4.17365 14.025L1.25177 15L2.22599 12.0781C2.25407 11.9942 2.264 11.9052 2.25511 11.8171C2.24622 11.729 2.21872 11.6438 2.17443 11.5672C1.41659 10.257 1.11233 8.73327 1.30883 7.23247C1.50533 5.73167 2.19161 4.33767 3.26122 3.26671C4.33082 2.19576 5.72396 1.50771 7.2245 1.30931C8.72505 1.11092 10.2491 1.41326 11.5603 2.16944C12.8715 2.92562 13.8965 4.09337 14.4763 5.49152C15.0561 6.88968 15.1582 8.4401 14.767 9.90226C14.3757 11.3644 13.5128 12.6566 12.3122 13.5783C11.1116 14.5 9.64038 14.9998 8.12677 15Z"
                fill="#151515"
              />
            </svg>
          </a>
          {/* Explore/Compass Icon */}
          <a href="#" className="nav-icon-item" title="Explore">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 1.875C8.39303 1.875 6.82214 2.35152 5.486 3.24431C4.14985 4.1371 3.10844 5.40605 2.49348 6.8907C1.87852 8.37535 1.71762 10.009 2.03112 11.5851C2.34463 13.1612 3.11846 14.6089 4.25476 15.7452C5.39106 16.8815 6.8388 17.6554 8.41489 17.9689C9.99099 18.2824 11.6247 18.1215 13.1093 17.5065C14.594 16.8916 15.8629 15.8502 16.7557 14.514C17.6485 13.1779 18.125 11.607 18.125 10C18.1227 7.84581 17.266 5.78051 15.7427 4.25727C14.2195 2.73403 12.1542 1.87727 10 1.875ZM10 16.875C8.64026 16.875 7.31105 16.4718 6.18046 15.7164C5.04987 14.9609 4.16868 13.8872 3.64833 12.6309C3.12798 11.3747 2.99183 9.99237 3.2571 8.65875C3.52238 7.32513 4.17716 6.10013 5.13864 5.13864C6.10013 4.17715 7.32514 3.52237 8.65876 3.2571C9.99238 2.99183 11.3747 3.12798 12.631 3.64833C13.8872 4.16868 14.9609 5.04987 15.7164 6.18045C16.4718 7.31104 16.875 8.64025 16.875 10C16.8729 11.8227 16.1479 13.5702 14.8591 14.8591C13.5702 16.1479 11.8227 16.8729 10 16.875ZM13.4703 5.69062L8.47032 8.19062C8.34943 8.25135 8.25135 8.34943 8.19063 8.47031L5.69063 13.4703C5.64293 13.5656 5.6204 13.6716 5.62519 13.7781C5.62997 13.8845 5.66191 13.988 5.71796 14.0787C5.77402 14.1693 5.85233 14.2442 5.94545 14.296C6.03857 14.3479 6.14341 14.3751 6.25 14.375C6.34703 14.3749 6.44273 14.3524 6.52969 14.3094L11.5297 11.8094C11.6506 11.7487 11.7487 11.6506 11.8094 11.5297L14.3094 6.52969C14.3684 6.41229 14.3888 6.27929 14.3679 6.14958C14.347 6.01988 14.2857 5.90006 14.1928 5.80716C14.0999 5.71426 13.9801 5.653 13.8504 5.63208C13.7207 5.61116 13.5877 5.63164 13.4703 5.69062ZM10.7813 10.7812L7.64766 12.3523L9.21875 9.21875L12.3555 7.65078L10.7813 10.7812Z"
                fill="#151515"
              />
            </svg>
          </a>
          {/* Archive/Folder Icon */}
          <a href="#" className="nav-icon-item" title="Archive">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.875 5.62501H10.2586L8.125 3.49141C8.00935 3.37483 7.87168 3.28241 7.71999 3.21951C7.5683 3.1566 7.40562 3.12448 7.24141 3.12501H3.125C2.79348 3.12501 2.47554 3.2567 2.24112 3.49112C2.0067 3.72554 1.875 4.04349 1.875 4.37501V15.6734C1.87541 15.992 2.00214 16.2974 2.22739 16.5226C2.45263 16.7479 2.75802 16.8746 3.07656 16.875H16.9445C17.2575 16.8746 17.5575 16.7501 17.7788 16.5288C18.0001 16.3075 18.1246 16.0075 18.125 15.6945V6.87501C18.125 6.54349 17.9933 6.22554 17.7589 5.99112C17.5245 5.7567 17.2065 5.62501 16.875 5.62501ZM3.125 4.37501H7.24141L8.49141 5.62501H3.125V4.37501ZM16.875 15.625H3.125V6.87501H16.875V15.625Z"
                fill="#151515"
              />
            </svg>
          </a>
          {/* Media/Gallery Icon */}
          <a href="#" className="nav-icon-item" title="Media">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.25 2.5H6.25C5.91848 2.5 5.60054 2.6317 5.36612 2.86612C5.1317 3.10054 5 3.41848 5 3.75V5H3.75C3.41848 5 3.10054 5.1317 2.86612 5.36612C2.6317 5.60054 2.5 5.91848 2.5 6.25V16.25C2.5 16.5815 2.6317 16.8995 2.86612 17.1339C3.10054 17.3683 3.41848 17.5 3.75 17.5H13.75C14.0815 17.5 14.3995 17.3683 14.6339 17.1339C14.8683 16.8995 15 16.5815 15 16.25V15H16.25C16.5815 15 16.8995 14.8683 17.1339 14.6339C17.3683 14.3995 17.5 14.0815 17.5 13.75V3.75C17.5 3.41848 17.3683 3.10054 17.1339 2.86612C16.8995 2.6317 16.5815 2.5 16.25 2.5ZM6.25 3.75H16.25V9.17031L14.9453 7.86563C14.7109 7.63138 14.3931 7.4998 14.0617 7.4998C13.7303 7.4998 13.4125 7.63138 13.1781 7.86563L7.29453 13.75H6.25V3.75ZM13.75 16.25H3.75V6.25H5V13.75C5 14.0815 5.1317 14.3995 5.36612 14.6339C5.60054 14.8683 5.91848 15 6.25 15H13.75V16.25ZM16.25 13.75H9.0625L14.0625 8.75L16.25 10.9375V13.75ZM9.375 8.75C9.74584 8.75 10.1084 8.64003 10.4167 8.43401C10.725 8.22798 10.9654 7.93514 11.1073 7.59253C11.2492 7.24992 11.2863 6.87292 11.214 6.50921C11.1416 6.14549 10.963 5.8114 10.7008 5.54917C10.4386 5.28695 10.1045 5.10837 9.74079 5.03603C9.37708 4.96368 9.00008 5.00081 8.65747 5.14273C8.31486 5.28464 8.02202 5.52496 7.81599 5.83331C7.60997 6.14165 7.5 6.50416 7.5 6.875C7.5 7.37228 7.69754 7.84919 8.04917 8.20083C8.40081 8.55246 8.87772 8.75 9.375 8.75ZM9.375 6.25C9.49861 6.25 9.61945 6.28666 9.72223 6.35533C9.82501 6.42401 9.90512 6.52162 9.95242 6.63582C9.99973 6.75003 10.0121 6.87569 9.98799 6.99693C9.96388 7.11817 9.90435 7.22953 9.81694 7.31694C9.72953 7.40435 9.61817 7.46388 9.49693 7.48799C9.37569 7.51211 9.25003 7.49973 9.13582 7.45242C9.02162 7.40512 8.92401 7.32501 8.85533 7.22223C8.78666 7.11945 8.75 6.99861 8.75 6.875C8.75 6.70924 8.81585 6.55027 8.93306 6.43306C9.05027 6.31585 9.20924 6.25 9.375 6.25Z"
                fill="#151515"
              />
            </svg>
          </a>
        </nav>

        <div className="sidebar-bottom">
          {/* Settings Icon */}
          <button className="settings-button" title="Settings" type="button">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.6744 7.57283L11.7181 5.77127L9.91658 0.815018C9.82779 0.575797 9.66791 0.369481 9.45842 0.223787C9.24893 0.0780927 8.99988 0 8.74471 0C8.48954 0 8.24048 0.0780927 8.03099 0.223787C7.82151 0.369481 7.66163 0.575797 7.57283 0.815018L5.77127 5.77127L0.815018 7.57283C0.575797 7.66163 0.369481 7.82151 0.223787 8.03099C0.0780927 8.24048 0 8.48954 0 8.74471C0 8.99988 0.0780927 9.24893 0.223787 9.45842C0.369481 9.66791 0.575797 9.82779 0.815018 9.91658L5.77127 11.7189L7.57283 16.6744C7.66163 16.9136 7.82151 17.1199 8.03099 17.2656C8.24048 17.4113 8.48954 17.4894 8.74471 17.4894C8.99988 17.4894 9.24893 17.4113 9.45842 17.2656C9.66791 17.1199 9.82779 16.9136 9.91658 16.6744L11.7189 11.7181L16.6744 9.91658C16.9136 9.82779 17.1199 9.66791 17.2656 9.45842C17.4113 9.24893 17.4894 8.99988 17.4894 8.74471C17.4894 8.48954 17.4113 8.24048 17.2656 8.03099C17.1199 7.82151 16.9136 7.66163 16.6744 7.57283ZM11.0166 10.6431C10.9309 10.6744 10.853 10.724 10.7885 10.7885C10.724 10.853 10.6744 10.9309 10.6431 11.0166L8.74471 16.2369L6.84627 11.0166C6.81505 10.9309 6.76545 10.853 6.70093 10.7885C6.63642 10.724 6.55856 10.6744 6.47283 10.6431L1.25252 8.74471L6.47283 6.84627C6.55856 6.81505 6.63642 6.76545 6.70093 6.70093C6.76545 6.63642 6.81505 6.55856 6.84627 6.47283L8.74471 1.25252L10.6431 6.47283C10.6744 6.55856 10.724 6.63642 10.7885 6.70093C10.853 6.76545 10.9309 6.81505 11.0166 6.84627L16.2369 8.74471L11.0166 10.6431Z"
                fill="#151515"
              />
            </svg>
          </button>
          {/* User Avatar */}
          <div className="user-avatar-small" ref={logoRef}>
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt={currentUser.name} />
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email || "user"}`}
                alt="User"
              />
            )}
          </div>
        </div>
      </aside>

      {/* User Dropdown Menu */}
      <div
        className={clsx("user-dropdown", isUserDropdownOpen && "show")}
        id="userDropdown"
        ref={userDropdownRef}
      >
        <a href="#" className="dropdown-item">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Go back to dashboard
        </a>
        <a href="#" className="dropdown-item">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
          Rename file
        </a>

        <div className="dropdown-divider"></div>

        <div className="dropdown-user-info">
          <div className="dropdown-user-name">{currentUser?.name}</div>
          <div className="dropdown-user-email">{currentUser?.email}</div>
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
            <div className="credits-bar-fill" style={{ width: "20%" }}></div>
          </div>
          <div className="credits-usage">
            <span>5 of 25 used today</span>
            <span className="credits-tomorrow">+25 tomorrow</span>
          </div>
        </div>

        <div className="dropdown-divider"></div>

        <a href="#" className="dropdown-item">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="28" height="28" rx="6" fill="#F3F3EE" />
            <g clip-path="url(#clip0_0_2037)">
              <path
                d="M8.66683 13.3333H19.3335M8.66683 13.3333C7.93045 13.3333 7.3335 12.7364 7.3335 12V11.3333C7.3335 10.5969 7.93045 9.99999 8.66683 9.99999H19.3335C20.0699 9.99999 20.6668 10.5969 20.6668 11.3333V12C20.6668 12.7364 20.0699 13.3333 19.3335 13.3333M8.66683 13.3333L8.66683 19.3333C8.66683 20.0697 9.26378 20.6667 10.0002 20.6667H18.0002C18.7365 20.6667 19.3335 20.0697 19.3335 19.3333V13.3333M14.0002 9.99999H16.6668C17.4032 9.99999 18.0002 9.40304 18.0002 8.66666C18.0002 7.93028 17.4032 7.33333 16.6668 7.33333C15.1941 7.33333 14.0002 8.52724 14.0002 9.99999ZM14.0002 9.99999H11.3335C10.5971 9.99999 10.0002 9.40304 10.0002 8.66666C10.0002 7.93028 10.5971 7.33333 11.3335 7.33333C12.8063 7.33333 14.0002 8.52724 14.0002 9.99999ZM14.0002 9.99999V20.6667"
                stroke="#28303F"
                stroke-linecap="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_0_2037">
                <rect
                  width="16"
                  height="16"
                  fill="white"
                  transform="translate(6 6)"
                />
              </clipPath>
            </defs>
          </svg>
          Win free credits
        </a>
        <a href="#" className="dropdown-item">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="28" height="28" rx="6" fill="#F3F3EE" />
            <g clip-path="url(#clip0_0_2043)">
              <path
                d="M14.0002 7.33334V8M14.0002 20V20.6667M18.7142 9.28596L18.2428 9.75737M9.75753 18.2426L9.28612 18.714M20.6668 14H20.0002M8.00016 14H7.3335M18.7142 18.714L18.2428 18.2426M9.75753 9.75737L9.28612 9.28596M18.0002 14C18.0002 16.2091 16.2093 18 14.0002 18C11.791 18 10.0002 16.2091 10.0002 14C10.0002 11.7909 11.791 10 14.0002 10C16.2093 10 18.0002 11.7909 18.0002 14Z"
                stroke="#28303F"
                stroke-linecap="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_0_2043">
                <rect
                  width="16"
                  height="16"
                  fill="white"
                  transform="translate(6 6)"
                />
              </clipPath>
            </defs>
          </svg>
          Theme Style
        </a>
        <a
          href="#"
          className="dropdown-item logout"
          onClick={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="28" height="28" rx="6" fill="#F3F3EE" />
            <path
              d="M19.3335 15.3333L20.1954 14.4714C20.4558 14.2111 20.4558 13.7889 20.1954 13.5286L19.3335 12.6667"
              stroke="#28303F"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20.0002 14H14.6668M10.0002 19.3333C8.5274 19.3333 7.3335 18.1394 7.3335 16.6667V11.3333C7.3335 9.86058 8.5274 8.66667 10.0002 8.66667M10.0002 19.3333C11.4729 19.3333 12.6668 18.1394 12.6668 16.6667V11.3333C12.6668 9.86058 11.4729 8.66667 10.0002 8.66667M10.0002 19.3333H15.3335C16.8063 19.3333 18.0002 18.1394 18.0002 16.6667M10.0002 8.66667H15.3335C16.8063 8.66667 18.0002 9.86058 18.0002 11.3333"
              stroke="#28303F"
              stroke-linecap="round"
            />
          </svg>
          Log out
        </a>
      </div>

      {/* Conversation List Sidebar */}
      <aside className="conversation-sidebar">
        <div className="conversation-header">
          <h2>All Message</h2>
          <button
            className="new-message-btn"
            id="newMessageBtn"
            type="button"
            onClick={openNewMessageModal}
          >
            <svg
              width="14"
              height="13"
              viewBox="0 0 14 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.77499 2.02127L10.775 5.02127M9.64999 10.6463H12.65M11.15 9.14627V12.1463M3.64999 12.1463L11.525 4.27131C11.722 4.07433 11.8782 3.84048 11.9848 3.58311C12.0914 3.32574 12.1463 3.04989 12.1463 2.77131C12.1463 2.49274 12.0914 2.21689 11.9848 1.95952C11.8782 1.70215 11.722 1.4683 11.525 1.27131C11.328 1.07433 11.0942 0.918076 10.8368 0.81147C10.5794 0.704864 10.3036 0.649994 10.025 0.649994C9.74642 0.649994 9.47057 0.704864 9.2132 0.81147C8.95583 0.918076 8.72198 1.07433 8.52499 1.27131L0.649994 9.14631V12.1463H3.64999Z"
                stroke="white"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            New Message
          </button>
        </div>

        <div className="conversation-search">
          <div className="search-input-wrapper">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search in message"
              className="search-input"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className={clsx("filter-btn", showUnreadOnly && "active")}
              type="button"
              title="Filter"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="39"
                  height="39"
                  rx="9.5"
                  fill="white"
                />
                <rect
                  x="0.5"
                  y="0.5"
                  width="39"
                  height="39"
                  rx="9.5"
                  stroke="#E8E5DF"
                />
                <path
                  d="M14 14H26V15.629C25.9999 16.0268 25.8418 16.4083 25.5605 16.6895L22.25 20V25.25L17.75 26.75V20.375L14.39 16.679C14.1391 16.4029 14 16.0433 14 15.6703V14Z"
                  stroke="#262626"
                  stroke-width="1.3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {showUnreadOnly && (
            <button className="unread-filter-pill" onClick={toggleUnreadFilter}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Unread</span>
            </button>
          )}
          {showArchivedOnly && (
            <button
              className="archive-filter-pill"
              onClick={toggleArchivedFilter}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                <rect x="1" y="3" width="22" height="5"></rect>
                <line x1="10" y1="12" x2="14" y2="12"></line>
              </svg>
              <span>Archived</span>
            </button>
          )}
        </div>

        <div className="conversation-list" id="conversationList">
          {filteredConversations.map((conv) => {
            const user = conv.otherUser;
            const active = conv.id === currentConversationId;
            const isSwipingThis = swipeRef.current.convId === conv.id;
            const translateX = isSwipingThis ? swipeRef.current.translateX : 0;
            const showLeft = isSwipingThis && translateX > 35;
            const showRight = isSwipingThis && translateX < -35;

            return (
              <div
                className="conversation-item-wrapper"
                data-conv-id={conv.id}
                key={conv.id}
              >
                <div
                  className={clsx("swipe-action left", showLeft && "visible")}
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsUnread(conv.id);
                  }}
                >
                  <svg
                    width="16"
                    height="14"
                    viewBox="0 0 16 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0.75 12.7659L1.725 9.84087C-0.0179998 7.26312 0.6555 3.93687 3.3 2.06037C5.9445 0.184624 9.7425 0.338374 12.1838 2.42037C14.625 4.50312 14.955 7.86988 12.9555 10.2961C10.956 12.7224 7.24425 13.4574 4.275 12.0159L0.75 12.7659Z"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Unread
                </div>
                <div
                  className={clsx(
                    "swipe-action right archive-action",
                    showRight && "visible",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveConversation(conv.id);
                  }}
                >
                  <div className="archive-button-content">
                    <svg
                      width="15"
                      height="14"
                      viewBox="0 0 15 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.75 3.75C13.1478 3.75 13.5294 3.59196 13.8107 3.31066C14.092 3.02936 14.25 2.64782 14.25 2.25C14.25 1.85218 14.092 1.47064 13.8107 1.18934C13.5294 0.908035 13.1478 0.75 12.75 0.75H2.25C1.85218 0.75 1.47064 0.908035 1.18934 1.18934C0.908035 1.47064 0.75 1.85218 0.75 2.25C0.75 2.64782 0.908035 3.02936 1.18934 3.31066C1.47064 3.59196 1.85218 3.75 2.25 3.75M12.75 3.75H2.25M12.75 3.75V11.25C12.75 11.6478 12.592 12.0294 12.3107 12.3107C12.0294 12.592 11.6478 12.75 11.25 12.75H3.75C3.35218 12.75 2.97064 12.592 2.68934 12.3107C2.40804 12.0294 2.25 11.6478 2.25 11.25V3.75M6 6.75H9"
                        stroke="white"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>

                    <span>Archive</span>
                  </div>
                </div>

                <div
                  className={clsx(
                    "conversation-item",
                    active && "active",
                    conv.unreadCount > 0 && "unread",
                    conv.isArchived && "archived",
                    isSwipingThis && "swiping",
                  )}
                  style={{
                    transform: translateX
                      ? `translateX(${translateX}px)`
                      : undefined,
                  }}
                  onPointerDown={(e) => {
                    swipeRef.current.convId = conv.id;
                    swipeRef.current.startX = e.clientX;
                    swipeRef.current.translateX = 0;
                    swipeRef.current.isSwiping = false;
                  }}
                  onClick={() => {
                    if (!swipeRef.current.isSwiping) {
                      handleSelectConversation(conv.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const x = e.clientX;
                    const y = e.clientY;
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const adjustedX =
                      x + CONTEXT_MENU_WIDTH > vw ? x - CONTEXT_MENU_WIDTH : x;
                    const adjustedY =
                      y + CONTEXT_MENU_ESTIMATED_HEIGHT > vh
                        ? y - CONTEXT_MENU_ESTIMATED_HEIGHT
                        : y;
                    openContextMenu(adjustedX, adjustedY, conv.id);
                  }}
                >
                  <div className="conversation-avatar">
                    <img src={getUserAvatarUrl(user)} alt={user.name} />
                    {user.isOnline ? (
                      <span className="online-dot"></span>
                    ) : null}
                  </div>

                  <div className="conversation-content">
                    {/* UNREAD Tag - Green rectangular tag on top */}
                    {conv.unreadCount > 0 && (
                      <div className="unread-tag">
                        <span>UNREAD</span>
                      </div>
                    )}
                    <div className="conversation-top">
                      <span className="conversation-name">{user.name}</span>
                      <div className="conversation-badges">
                        {conv.isArchived && (
                          <span className="archive-tag">
                            <span>ARCHIVED</span>
                          </span>
                        )}
                        <span className="conversation-time">
                          {conv.lastMessage
                            ? formatConversationTime(conv.lastMessage.createdAt)
                            : formatConversationTime(conv.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="conversation-bottom">
                      <span className="conversation-preview">
                        {conv.lastMessage?.content || "Start a conversation..."}
                      </span>
                      {conv.lastMessage?.isRead && conv.unreadCount === 0 ? (
                        <span className="read-receipt">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
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
            );
          })}
        </div>
      </aside>

      {/* Conversation Context Menu */}
      <div
        className={clsx("context-menu", contextMenu.isOpen && "show")}
        id="contextMenu"
        ref={contextMenuRef}
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <div
          className="context-menu-item"
          data-action="unread"
          onClick={() => handleContextAction("unread")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 13.3333L2.86667 10.7333C1.31733 8.44197 1.916 5.4853 4.26667 3.8173C6.61733 2.14997 9.99333 2.28663 12.1633 4.1373C14.3333 5.98863 14.6267 8.9813 12.8493 11.138C11.072 13.2946 7.77267 13.948 5.13333 12.6666L2 13.3333Z"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Mark as unread
        </div>
        <div
          className="context-menu-item"
          data-action="archive"
          onClick={() => handleContextAction("archive")}
        >
          <svg
            width="14"
            height="12"
            viewBox="0 0 14 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.3334 3.33334C11.687 3.33334 12.0262 3.19286 12.2762 2.94281C12.5263 2.69277 12.6667 2.35363 12.6667 2.00001C12.6667 1.64638 12.5263 1.30724 12.2762 1.0572C12.0262 0.807147 11.687 0.666672 11.3334 0.666672H2.00008C1.64646 0.666672 1.30732 0.807147 1.05727 1.0572C0.807224 1.30724 0.666748 1.64638 0.666748 2.00001C0.666748 2.35363 0.807224 2.69277 1.05727 2.94281C1.30732 3.19286 1.64646 3.33334 2.00008 3.33334M11.3334 3.33334H2.00008M11.3334 3.33334V10C11.3334 10.3536 11.1929 10.6928 10.9429 10.9428C10.6928 11.1929 10.3537 11.3333 10.0001 11.3333H3.33341C2.97979 11.3333 2.64065 11.1929 2.39061 10.9428C2.14056 10.6928 2.00008 10.3536 2.00008 10V3.33334M5.33341 6.00001H8.00008"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Archive
        </div>
        <div
          className="context-menu-item has-submenu"
          data-action="mute"
          onClick={() => handleContextAction("mute")}
        >
          <div className="context-menu-subitem">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.6667 6.66666L13.3333 9.33333M13.3333 6.66666L10.6667 9.33333M4 9.99998H2.66667C2.48986 9.99998 2.32029 9.92974 2.19526 9.80471C2.07024 9.67969 2 9.51012 2 9.33331V6.66664C2 6.48983 2.07024 6.32026 2.19526 6.19524C2.32029 6.07021 2.48986 5.99998 2.66667 5.99998H4L6.33333 2.99998C6.3916 2.8868 6.48843 2.79819 6.60633 2.75017C6.72422 2.70215 6.8554 2.69788 6.97617 2.73814C7.09693 2.77839 7.19932 2.86052 7.26482 2.96967C7.33033 3.07882 7.35463 3.2078 7.33333 3.33331V12.6666C7.35463 12.7921 7.33033 12.9211 7.26482 13.0303C7.19932 13.1394 7.09693 13.2216 6.97617 13.2618C6.8554 13.3021 6.72422 13.2978 6.60633 13.2498C6.48843 13.2018 6.3916 13.1132 6.33333 13L4 9.99998Z"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Mute
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div
          className="context-menu-item"
          data-action="contact"
          onClick={() => handleContextAction("contact")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.11198 12.566C4.27699 12.0168 4.61462 11.5355 5.07481 11.1933C5.535 10.8512 6.09321 10.6665 6.66665 10.6667H9.33331C9.90749 10.6665 10.4664 10.8516 10.9269 11.1945C11.3874 11.5374 11.725 12.0199 11.8893 12.57M2 8C2 8.78793 2.15519 9.56815 2.45672 10.2961C2.75825 11.0241 3.20021 11.6855 3.75736 12.2426C4.31451 12.7998 4.97595 13.2417 5.7039 13.5433C6.43185 13.8448 7.21207 14 8 14C8.78793 14 9.56815 13.8448 10.2961 13.5433C11.0241 13.2417 11.6855 12.7998 12.2426 12.2426C12.7998 11.6855 13.2417 11.0241 13.5433 10.2961C13.8448 9.56815 14 8.78793 14 8C14 7.21207 13.8448 6.43185 13.5433 5.7039C13.2417 4.97595 12.7998 4.31451 12.2426 3.75736C11.6855 3.20021 11.0241 2.75825 10.2961 2.45672C9.56815 2.15519 8.78793 2 8 2C7.21207 2 6.43185 2.15519 5.7039 2.45672C4.97595 2.75825 4.31451 3.20021 3.75736 3.75736C3.20021 4.31451 2.75825 4.97595 2.45672 5.7039C2.15519 6.43185 2 7.21207 2 8ZM6 6.66667C6 7.1971 6.21071 7.70581 6.58579 8.08088C6.96086 8.45595 7.46957 8.66667 8 8.66667C8.53043 8.66667 9.03914 8.45595 9.41421 8.08088C9.78929 7.70581 10 7.1971 10 6.66667C10 6.13623 9.78929 5.62753 9.41421 5.25245C9.03914 4.87738 8.53043 4.66667 8 4.66667C7.46957 4.66667 6.96086 4.87738 6.58579 5.25245C6.21071 5.62753 6 6.13623 6 6.66667Z"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Contact info
        </div>
        <div
          className="context-menu-item"
          data-action="export"
          onClick={() => handleContextAction("export")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.66675 11.3333V12.6667C2.66675 13.0203 2.80722 13.3594 3.05727 13.6095C3.30732 13.8595 3.64646 14 4.00008 14H12.0001C12.3537 14 12.6928 13.8595 12.9429 13.6095C13.1929 13.3594 13.3334 13.0203 13.3334 12.6667V11.3333M4.66675 6L8.00008 2.66666M8.00008 2.66666L11.3334 6M8.00008 2.66666V10.6667"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Export chat
        </div>
        <div
          className="context-menu-item"
          data-action="clear"
          onClick={() => handleContextAction("clear")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="#111625"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Clear chat
        </div>
        <div
          className="context-menu-item danger"
          data-action="delete"
          onClick={() => handleContextAction("delete")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.66675 4.66667H13.3334M6.66675 7.33333V11.3333M9.33341 7.33333V11.3333M3.33341 4.66667L4.00008 12.6667C4.00008 13.0203 4.14056 13.3594 4.39061 13.6095C4.64065 13.8595 4.97979 14 5.33341 14H10.6667C11.0204 14 11.3595 13.8595 11.6096 13.6095C11.8596 13.3594 12.0001 13.0203 12.0001 12.6667L12.6667 4.66667M6.00008 4.66667V2.66667C6.00008 2.48986 6.07032 2.32029 6.19534 2.19526C6.32037 2.07024 6.48994 2 6.66675 2H9.33341C9.51023 2 9.6798 2.07024 9.80482 2.19526C9.92984 2.32029 10.0001 2.48986 10.0001 2.66667V4.66667"
              stroke="#DF1C41"
              stroke-width="1.33333"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Delete chat
        </div>
      </div>

      {/* New Message Modal */}
      <div
        className={clsx("modal-overlay", isNewMessageModalOpen && "show")}
        id="newMessageModal"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeNewMessageModal();
        }}
      >
        <div className="new-message-modal">
          <h3>New Message</h3>
          <div className="modal-search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
                  startNewConversation(u.id);
                  closeNewMessageModal();
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
                <div
                  className="chat-user-avatar"
                  onClick={() => openContactInfo(currentChatUser.id)}
                >
                  <img
                    src={getUserAvatarUrl(currentChatUser)}
                    alt={currentChatUser.name}
                    id="chatUserAvatar"
                  />
                  {currentChatUser.isOnline ? (
                    <span className="online-indicator"></span>
                  ) : null}
                </div>
                <div className="chat-user-info">
                  <h3 id="chatUserName">{currentChatUser.name}</h3>
                  <span
                    className="chat-user-status"
                    id="chatUserStatus"
                    style={{
                      color: currentChatUser.isOnline ? "#10b981" : "#6b7280",
                    }}
                  >
                    {currentChatUser.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="chat-header-actions">
            <button
              className="header-action-btn"
              type="button"
              onClick={() => setChatSearchOpen(!chatSearchOpen)}
              title="Search in conversation"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  fill="white"
                />
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  stroke="#E8E5DF"
                />
                <path
                  d="M22 22L18 18M10 14.6667C10 15.2795 10.1207 15.8863 10.3552 16.4525C10.5898 17.0187 10.9335 17.5332 11.3668 17.9665C11.8002 18.3998 12.3146 18.7436 12.8808 18.9781C13.447 19.2126 14.0538 19.3333 14.6667 19.3333C15.2795 19.3333 15.8863 19.2126 16.4525 18.9781C17.0187 18.7436 17.5332 18.3998 17.9665 17.9665C18.3998 17.5332 18.7436 17.0187 18.9781 16.4525C19.2126 15.8863 19.3333 15.2795 19.3333 14.6667C19.3333 14.0538 19.2126 13.447 18.9781 12.8808C18.7436 12.3146 18.3998 11.8002 17.9665 11.3668C17.5332 10.9335 17.0187 10.5898 16.4525 10.3552C15.8863 10.1207 15.2795 10 14.6667 10C14.0538 10 13.447 10.1207 12.8808 10.3552C12.3146 10.5898 11.8002 10.9335 11.3668 11.3668C10.9335 11.8002 10.5898 12.3146 10.3552 12.8808C10.1207 13.447 10 14.0538 10 14.6667Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              className="header-action-btn"
              type="button"
              onClick={() => alert("Audio call feature coming soon!")}
              title="Audio call"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  fill="white"
                />
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  stroke="#E8E5DF"
                />
                <path
                  d="M11.3333 10.6667H14L15.3333 14L13.6667 15C14.3806 16.4477 15.5523 17.6194 17 18.3333L18 16.6667L21.3333 18V20.6667C21.3333 21.0203 21.1929 21.3594 20.9428 21.6095C20.6928 21.8595 20.3536 22 20 22C17.3995 21.842 14.9468 20.7377 13.1046 18.8954C11.2623 17.0532 10.158 14.6005 10 12C10 11.6464 10.1405 11.3072 10.3905 11.0572C10.6406 10.8071 10.9797 10.6667 11.3333 10.6667Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              className="header-action-btn"
              type="button"
              onClick={() => alert("Video call feature coming soon!")}
              title="Video call"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  fill="white"
                />
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  stroke="#E8E5DF"
                />
                <path
                  d="M18 14.6667L21.0353 13.1493C21.1369 13.0986 21.2499 13.0746 21.3633 13.0797C21.4768 13.0848 21.5871 13.1188 21.6837 13.1785C21.7804 13.2382 21.8602 13.3216 21.9155 13.4208C21.9709 13.52 21.9999 13.6317 22 13.7453V18.2547C21.9999 18.3683 21.9709 18.48 21.9155 18.5792C21.8602 18.6783 21.7804 18.7618 21.6837 18.8215C21.5871 18.8812 21.4768 18.9152 21.3633 18.9203C21.2499 18.9254 21.1369 18.9014 21.0353 18.8507L18 17.3333V14.6667Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10 13.3333C10 12.9797 10.1405 12.6406 10.3905 12.3905C10.6406 12.1405 10.9797 12 11.3333 12H16.6667C17.0203 12 17.3594 12.1405 17.6095 12.3905C17.8595 12.6406 18 12.9797 18 13.3333V18.6667C18 19.0203 17.8595 19.3594 17.6095 19.6095C17.3594 19.8595 17.0203 20 16.6667 20H11.3333C10.9797 20 10.6406 19.8595 10.3905 19.6095C10.1405 19.3594 10 19.0203 10 18.6667V13.3333Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              className="header-action-btn"
              type="button"
              onClick={() => {
                if (currentChatUser) {
                  openContactInfo(currentChatUser.id);
                }
              }}
              title="More options"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  fill="white"
                />
                <rect
                  x="0.5"
                  y="0.5"
                  width="31"
                  height="31"
                  rx="7.5"
                  stroke="#E8E5DF"
                />
                <path
                  d="M10.6666 16C10.6666 16.1768 10.7369 16.3464 10.8619 16.4714C10.9869 16.5964 11.1565 16.6667 11.3333 16.6667C11.5101 16.6667 11.6797 16.5964 11.8047 16.4714C11.9297 16.3464 12 16.1768 12 16C12 15.8232 11.9297 15.6536 11.8047 15.5286C11.6797 15.4036 11.5101 15.3333 11.3333 15.3333C11.1565 15.3333 10.9869 15.4036 10.8619 15.5286C10.7369 15.6536 10.6666 15.8232 10.6666 16Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M15.3333 16C15.3333 16.1768 15.4035 16.3464 15.5286 16.4714C15.6536 16.5964 15.8231 16.6667 16 16.6667C16.1768 16.6667 16.3463 16.5964 16.4714 16.4714C16.5964 16.3464 16.6666 16.1768 16.6666 16C16.6666 15.8232 16.5964 15.6536 16.4714 15.5286C16.3463 15.4036 16.1768 15.3333 16 15.3333C15.8231 15.3333 15.6536 15.4036 15.5286 15.5286C15.4035 15.6536 15.3333 15.8232 15.3333 16Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M20 16C20 16.1768 20.0702 16.3464 20.1952 16.4714C20.3202 16.5964 20.4898 16.6667 20.6666 16.6667C20.8434 16.6667 21.013 16.5964 21.138 16.4714C21.2631 16.3464 21.3333 16.1768 21.3333 16C21.3333 15.8232 21.2631 15.6536 21.138 15.5286C21.013 15.4036 20.8434 15.3333 20.6666 15.3333C20.4898 15.3333 20.3202 15.4036 20.1952 15.5286C20.0702 15.6536 20 15.8232 20 16Z"
                  stroke="#262626"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
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
            const groupClass = msg.isMe ? "sent" : "received";
            return (
              <div className={clsx("message-group", groupClass)} key={msg.id}>
                {msg.messages.map((text, index) => (
                  <div key={`${msg.id}-${index}`} className="message-bubble">
                    {text}
                  </div>
                ))}
                <div className="message-time">
                  {msg.isMe && msg.read ? (
                    <span className="read-status">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
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
                  {msg.time}
                </div>
              </div>
            );
          })}
          {groupedMessages.length === 0 && currentConversation && (
            <div className="empty-chat">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>

        {/* Chat Search Bar */}
        {chatSearchOpen && (
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div className="search-input-wrapper" style={{ margin: 0 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search in conversation..."
                className="search-input"
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setChatSearchOpen(false);
                  setChatSearchQuery("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        )}

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
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <div className="chat-input-actions">
              <button
                className="input-action-btn"
                type="button"
                onClick={() => alert("Voice message feature coming soon!")}
                title="Voice message"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.91663 5.83332C2.91663 6.91629 3.34683 7.9549 4.11261 8.72068C4.87838 9.48645 5.91699 9.91666 6.99996 9.91666M6.99996 9.91666C8.08293 9.91666 9.12154 9.48645 9.88731 8.72068C10.6531 7.9549 11.0833 6.91629 11.0833 5.83332M6.99996 9.91666V12.25M4.66663 12.25H9.33329M5.24996 2.91666C5.24996 2.45253 5.43433 2.00741 5.76252 1.67922C6.09071 1.35103 6.53583 1.16666 6.99996 1.16666C7.46409 1.16666 7.90921 1.35103 8.2374 1.67922C8.56559 2.00741 8.74996 2.45253 8.74996 2.91666V5.83332C8.74996 6.29745 8.56559 6.74257 8.2374 7.07076C7.90921 7.39895 7.46409 7.58332 6.99996 7.58332C6.53583 7.58332 6.09071 7.39895 5.76252 7.07076C5.43433 6.74257 5.24996 6.29745 5.24996 5.83332V2.91666Z"
                    stroke="#262626"
                    stroke-width="1.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                className="input-action-btn"
                type="button"
                onClick={() => alert("Emoji picker coming soon!")}
                title="Emoji"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.15002 4.14999H4.15586M7.65002 4.14999H7.65586M0.650024 5.89999C0.650024 6.58943 0.78582 7.27212 1.04966 7.90908C1.31349 8.54604 1.70021 9.1248 2.18771 9.6123C2.67522 10.0998 3.25398 10.4865 3.89094 10.7504C4.5279 11.0142 5.21058 11.15 5.90002 11.15C6.58946 11.15 7.27215 11.0142 7.90911 10.7504C8.54607 10.4865 9.12483 10.0998 9.61234 9.6123C10.0998 9.1248 10.4866 8.54604 10.7504 7.90908C11.0142 7.27212 11.15 6.58943 11.15 5.89999C11.15 5.21055 11.0142 4.52787 10.7504 3.89091C10.4866 3.25395 10.0998 2.67519 9.61234 2.18768C9.12483 1.70018 8.54607 1.31346 7.90911 1.04963C7.27215 0.785789 6.58946 0.649994 5.90002 0.649994C5.21058 0.649994 4.5279 0.785789 3.89094 1.04963C3.25398 1.31346 2.67522 1.70018 2.18771 2.18768C1.70021 2.67519 1.31349 3.25395 1.04966 3.89091C0.78582 4.52787 0.650024 5.21055 0.650024 5.89999ZM3.56669 6.48333C3.56669 7.10217 3.81252 7.69566 4.25011 8.13324C4.68769 8.57083 5.28119 8.81666 5.90002 8.81666C6.51886 8.81666 7.11236 8.57083 7.54994 8.13324C7.98753 7.69566 8.23336 7.10217 8.23336 6.48333H3.56669Z"
                    stroke="#262626"
                    stroke-width="1.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                className="input-action-btn"
                type="button"
                onClick={() => alert("Attachment feature coming soon!")}
                title="Attach file"
              >
                <svg
                  width="16"
                  height="18"
                  viewBox="0 0 12 13"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.279 3.12487L3.48734 6.91653C3.25527 7.1486 3.1249 7.46335 3.1249 7.79153C3.1249 8.11972 3.25527 8.43447 3.48734 8.66653C3.7194 8.8986 4.03415 9.02897 4.36234 9.02897C4.69052 9.02897 5.00527 8.8986 5.23734 8.66653L9.029 4.87487C9.49313 4.41074 9.75388 3.78125 9.75388 3.12487C9.75388 2.46849 9.49313 1.839 9.029 1.37487C8.56487 0.910739 7.93538 0.649994 7.279 0.649994C6.62262 0.649994 5.99313 0.910739 5.529 1.37487L1.73734 5.16653C1.04114 5.86273 0.650024 6.80697 0.650024 7.79153C0.650024 8.7761 1.04114 9.72034 1.73734 10.4165C2.43353 11.1127 3.37777 11.5038 4.36234 11.5038C5.3469 11.5038 6.29114 11.1127 6.98734 10.4165L10.779 6.62487"
                    stroke="#262626"
                    stroke-width="1.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
            <button
              className="send-btn"
              id="sendBtn"
              type="button"
              onClick={onSend}
              disabled={!messageText.trim()}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.53061 7.98336L12.8639 0.650024M5.53061 7.98336L7.86394 12.65C7.89319 12.7139 7.94015 12.7679 7.99924 12.8059C8.05833 12.8438 8.12706 12.8639 8.19727 12.8639C8.26748 12.8639 8.33622 12.8438 8.39531 12.8059C8.4544 12.7679 8.50136 12.7139 8.53061 12.65L12.8639 0.650024M5.53061 7.98336L0.863938 5.65002C0.800111 5.62078 0.746023 5.57382 0.708103 5.51473C0.670182 5.45564 0.650024 5.3869 0.650024 5.31669C0.650024 5.24648 0.670182 5.17775 0.708103 5.11866C0.746023 5.05957 0.800111 5.01261 0.863938 4.98336L12.8639 0.650024"
                  stroke="white"
                  stroke-width="1.3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Contact Info Sidebar */}
      <aside
        className={clsx("contact-info-sidebar", isContactInfoOpen && "show")}
        id="contactInfoSidebar"
      >
        <div className="contact-info-header">
          <h3>Contact Info</h3>
          <button
            className="close-btn"
            id="closeContactInfo"
            type="button"
            onClick={closeContactInfo}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
                  <img
                    src={getUserAvatarUrl(contactUser)}
                    alt={contactUser.name}
                    id="contactAvatar"
                  />
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Audio
            </button>
            <button className="contact-action-btn" type="button">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              Video
            </button>
          </div>

          <div className="contact-tabs">
            <button
              className={clsx(
                "contact-tab",
                activeContactTab === "media" && "active",
              )}
              data-tab="media"
              type="button"
              onClick={() => setActiveContactTab("media")}
            >
              Media
            </button>
            <button
              className={clsx(
                "contact-tab",
                activeContactTab === "link" && "active",
              )}
              data-tab="link"
              type="button"
              onClick={() => setActiveContactTab("link")}
            >
              Link
            </button>
            <button
              className={clsx(
                "contact-tab",
                activeContactTab === "docs" && "active",
              )}
              data-tab="docs"
              type="button"
              onClick={() => setActiveContactTab("docs")}
            >
              Docs
            </button>
          </div>

          <div className="contact-tab-content" id="contactTabContent">
            <div
              className={clsx(
                "tab-pane",
                activeContactTab === "media" && "active",
              )}
              data-pane="media"
            >
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

            <div
              className={clsx(
                "tab-pane",
                activeContactTab === "link" && "active",
              )}
              data-pane="link"
            >
              <div className="links-section">
                <div className="links-month">
                  <span className="month-label">May</span>
                  <div className="links-list">
                    <a href="#" className="link-item">
                      <div className="link-icon">
                        <img
                          src="https://www.google.com/s2/favicons?domain=basecamp.com&sz=32"
                          alt="Basecamp"
                        />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://basecamp.net/</span>
                        <span className="link-description">
                          Discover thousands of premium UI kits, templates, and
                          design resources tailored for designers, developers,
                          and...
                        </span>
                      </div>
                    </a>
                    <a href="#" className="link-item">
                      <div className="link-icon">
                        <img
                          src="https://www.google.com/s2/favicons?domain=notion.com&sz=32"
                          alt="Notion"
                        />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://notion.com/</span>
                        <span className="link-description">
                          A new tool that blends your everyday work apps into
                          one. It&apos;s the all-in-one workspace for you and
                          your team.
                        </span>
                      </div>
                    </a>
                    <a href="#" className="link-item">
                      <div className="link-icon asana">
                        <img
                          src="https://www.google.com/s2/favicons?domain=asana.com&sz=32"
                          alt="Asana"
                        />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://asana.com/</span>
                        <span className="link-description">
                          Work anytime, anywhere with Asana. Keep remote and
                          distributed teams, and your entire organization,
                          focused...
                        </span>
                      </div>
                    </a>
                    <a href="#" className="link-item">
                      <div className="link-icon">
                        <img
                          src="https://www.google.com/s2/favicons?domain=trello.com&sz=32"
                          alt="Trello"
                        />
                      </div>
                      <div className="link-content">
                        <span className="link-url">https://trello.com/</span>
                        <span className="link-description">
                          Make the impossible, possible with Trello. The
                          ultimate teamwork project management tool. Start up
                          board in se ...
                        </span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={clsx(
                "tab-pane",
                activeContactTab === "docs" && "active",
              )}
              data-pane="docs"
            >
              <div className="docs-section">
                <div className="docs-month">
                  <span className="month-label">May</span>
                  <div className="docs-list">
                    <div className="doc-item">
                      <div className="doc-icon pdf">
                        <span>PDF</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">
                          Document Requirement.pdf
                        </span>
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
                        <span className="doc-name">
                          Product Illustrations.ai
                        </span>
                        <span className="doc-meta">72 MB • ai</span>
                      </div>
                    </div>
                    <div className="doc-item">
                      <div className="doc-icon pdf">
                        <span>PDF</span>
                      </div>
                      <div className="doc-content">
                        <span className="doc-name">
                          Quotation-Hikariworks-May.pdf
                        </span>
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 16.6666L3.58333 13.4166C2.64704 12.0319 2.30833 10.392 2.63018 8.80188C2.95204 7.21179 3.91255 5.77969 5.33314 4.77186C6.75373 3.76403 8.53772 3.24905 10.3534 3.32266C12.1691 3.39628 13.8929 4.05349 15.2044 5.1721C16.5159 6.2907 17.3257 7.79458 17.4834 9.40412C17.641 11.0137 17.1358 12.6193 16.0616 13.9226C14.9873 15.2258 13.4172 16.138 11.6432 16.4894C9.86911 16.8409 8.01183 16.6077 6.41667 15.8333L2.5 16.6666Z"
                stroke="#596881"
                stroke-width="1.875"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <span>Message</span>
          </div>
        </div>
        <div className="header-right">
          <div
            className="header-search"
            onClick={() => setGlobalSearchOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setGlobalSearchOpen(true);
              }
            }}
          >
            <div className="header-search-content">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search</span>
            </div>
            <span className="shortcut">⌘+K</span>
          </div>
          <button
            className="header-icon-btn"
            type="button"
            onClick={() => alert("Notifications feature coming soon!")}
            title="Notifications"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0.5"
                y="0.5"
                width="31"
                height="31"
                rx="7.5"
                fill="white"
              />
              <rect
                x="0.5"
                y="0.5"
                width="31"
                height="31"
                rx="7.5"
                stroke="#E8E5DF"
              />
              <path
                d="M14 19.3333V20C14 20.5304 14.2107 21.0391 14.5857 21.4142C14.9608 21.7893 15.4695 22 16 22C16.5304 22 17.0391 21.7893 17.4142 21.4142C17.7892 21.0391 18 20.5304 18 20V19.3333M14.6666 11.3333C14.6666 10.9797 14.8071 10.6406 15.0572 10.3905C15.3072 10.1405 15.6463 10 16 10C16.3536 10 16.6927 10.1405 16.9428 10.3905C17.1928 10.6406 17.3333 10.9797 17.3333 11.3333C18.0989 11.6954 18.7516 12.2589 19.2213 12.9635C19.6911 13.6682 19.9603 14.4874 20 15.3333V17.3333C20.0501 17.7478 20.1969 18.1447 20.4285 18.4921C20.6601 18.8395 20.97 19.1276 21.3333 19.3333H10.6666C11.0299 19.1276 11.3398 18.8395 11.5714 18.4921C11.803 18.1447 11.9498 17.7478 12 17.3333V15.3333C12.0397 14.4874 12.3088 13.6682 12.7786 12.9635C13.2484 12.2589 13.901 11.6954 14.6666 11.3333Z"
                stroke="#262626"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            className="header-icon-btn"
            type="button"
            onClick={() => alert("Settings feature coming soon!")}
            title="Settings"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0.5"
                y="0.5"
                width="31"
                height="31"
                rx="7.5"
                fill="white"
              />
              <rect
                x="0.5"
                y="0.5"
                width="31"
                height="31"
                rx="7.5"
                stroke="#E8E5DF"
              />
              <path
                d="M14.8833 10.878C15.1673 9.70733 16.8327 9.70733 17.1167 10.878C17.1593 11.0539 17.2428 11.2172 17.3605 11.3547C17.4781 11.4921 17.6266 11.5999 17.7938 11.6692C17.9609 11.7384 18.1421 11.7672 18.3225 11.7532C18.5029 11.7393 18.6775 11.6829 18.832 11.5887C19.8607 10.962 21.0387 12.1393 20.412 13.1687C20.3179 13.3231 20.2616 13.4976 20.2477 13.6778C20.2337 13.8581 20.2625 14.0392 20.3317 14.2063C20.4009 14.3733 20.5085 14.5217 20.6458 14.6394C20.7831 14.757 20.9463 14.8406 21.122 14.8833C22.2927 15.1673 22.2927 16.8327 21.122 17.1167C20.9461 17.1593 20.7828 17.2428 20.6453 17.3605C20.5079 17.4781 20.4001 17.6266 20.3308 17.7938C20.2616 17.9609 20.2328 18.1421 20.2468 18.3225C20.2607 18.5029 20.3171 18.6775 20.4113 18.832C21.038 19.8607 19.8607 21.0387 18.8313 20.412C18.6769 20.3179 18.5024 20.2616 18.3222 20.2477C18.1419 20.2337 17.9608 20.2625 17.7937 20.3317C17.6267 20.4009 17.4783 20.5085 17.3606 20.6458C17.243 20.7831 17.1594 20.9463 17.1167 21.122C16.8327 22.2927 15.1673 22.2927 14.8833 21.122C14.8407 20.9461 14.7572 20.7828 14.6395 20.6453C14.5219 20.5079 14.3734 20.4001 14.2062 20.3308C14.0391 20.2616 13.8579 20.2328 13.6775 20.2468C13.4971 20.2607 13.3225 20.3171 13.168 20.4113C12.1393 21.038 10.9613 19.8607 11.588 18.8313C11.6821 18.6769 11.7384 18.5024 11.7523 18.3222C11.7663 18.1419 11.7375 17.9608 11.6683 17.7937C11.5991 17.6267 11.4915 17.4783 11.3542 17.3606C11.2169 17.243 11.0537 17.1594 10.878 17.1167C9.70733 16.8327 9.70733 15.1673 10.878 14.8833C11.0539 14.8407 11.2172 14.7572 11.3547 14.6395C11.4921 14.5219 11.5999 14.3734 11.6692 14.2062C11.7384 14.0391 11.7672 13.8579 11.7532 13.6775C11.7393 13.4971 11.6829 13.3225 11.5887 13.168C10.962 12.1393 12.1393 10.9613 13.1687 11.588C13.8353 11.9933 14.6993 11.6347 14.8833 10.878Z"
                stroke="#262626"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 16C14 16.5304 14.2107 17.0391 14.5858 17.4142C14.9609 17.7893 15.4696 18 16 18C16.5304 18 17.0391 17.7893 17.4142 17.4142C17.7893 17.0391 18 16.5304 18 16C18 15.4696 17.7893 14.9609 17.4142 14.5858C17.0391 14.2107 16.5304 14 16 14C15.4696 14 14.9609 14.2107 14.5858 14.5858C14.2107 14.9609 14 15.4696 14 16Z"
                stroke="#262626"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            className="header-user"
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt={currentUser.name} />
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email || "user"}`}
                alt="User"
              />
            )}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {globalSearchOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setGlobalSearchOpen(false);
              setGlobalSearchQuery("");
            }
          }}
        >
          <div
            className="new-message-modal"
            style={{ maxWidth: "600px", marginTop: "10vh" }}
          >
            <h3>Search</h3>
            <div className="modal-search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search conversations, messages, or users..."
                className="search-input"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setGlobalSearchOpen(false);
                  setGlobalSearchQuery("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {globalSearchQuery && (
              <div
                className="user-list"
                style={{ maxHeight: "400px", overflowY: "auto" }}
              >
                {filteredConversations
                  .filter((c) => {
                    const query = globalSearchQuery.toLowerCase();
                    return (
                      c.otherUser.name.toLowerCase().includes(query) ||
                      c.otherUser.email.toLowerCase().includes(query) ||
                      c.lastMessage?.content.toLowerCase().includes(query)
                    );
                  })
                  .map((conv) => (
                    <div
                      key={conv.id}
                      className="user-list-item"
                      onClick={() => {
                        handleSelectConversation(conv.id);
                        setGlobalSearchOpen(false);
                        setGlobalSearchQuery("");
                      }}
                    >
                      <img
                        src={getUserAvatarUrl(conv.otherUser)}
                        alt={conv.otherUser.name}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>
                          {conv.otherUser.name}
                        </div>
                        {conv.lastMessage && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            {conv.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

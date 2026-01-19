// Mock Data - This will be replaced with real WebSocket data
const mockUsers = [
  { id: 1, name: 'Adrian Kurt', avatar: 'adrian', online: true, email: 'adrian.kurt@mail.com' },
  { id: 2, name: 'Bianca Lofre', avatar: 'bianca', online: true, email: 'bianca.lofre@mail.com' },
  { id: 3, name: 'Diana Sayu', avatar: 'diana', online: false, email: 'diana.sayu@mail.com' },
  { id: 4, name: 'Palmer Dian', avatar: 'palmer', online: true, email: 'palmer.dian@mail.com' },
  { id: 5, name: 'Sam Kohler', avatar: 'sam', online: false, email: 'sam.kohler@mail.com' },
  { id: 6, name: 'Yuki Tanaka', avatar: 'yuki', online: true, email: 'yuki.tanaka@mail.com' },
  { id: 7, name: 'Zender Lowre', avatar: 'zender', online: false, email: 'zender.lowre@mail.com' },
  { id: 8, name: 'Daniel CH', avatar: 'daniel', online: true, email: 'Danielch@shipz.com' },
  { id: 9, name: 'Fego Chidera', avatar: 'fego', online: true, email: 'fego.chidera@mail.com' },
  { id: 10, name: 'Yomi Immanuel', avatar: 'yomi', online: false, email: 'yomi.immanuel@mail.com' },
  { id: 11, name: 'Bianca Nubia', avatar: 'biancaN', online: true, email: 'bianca.nubia@mail.com' },
];

const mockConversations = [
  {
    id: 1,
    user: mockUsers[0],
    lastMessage: 'Thanks for the explanation!',
    time: '3 mins ago',
    unread: true,
    isRead: false
  },
  {
    id: 2,
    user: mockUsers[9],
    lastMessage: "Let's do a quick call after lunch, I'll explai...",
    time: '12 mins ago',
    unread: false,
    isRead: true
  },
  {
    id: 3,
    user: mockUsers[10],
    lastMessage: 'anytime! my pleasure~',
    time: '32 mins ago',
    unread: false,
    isRead: true
  },
  {
    id: 4,
    user: mockUsers[6],
    lastMessage: 'Okay cool, that make sense 👍',
    time: '1 hour ago',
    unread: false,
    isRead: true
  },
  {
    id: 5,
    user: mockUsers[3],
    lastMessage: 'Thanks, Jonas! That helps 😊',
    time: '5 hour ago',
    unread: false,
    isRead: true
  },
  {
    id: 6,
    user: mockUsers[5],
    lastMessage: 'Have you watch the new season of Danm...',
    time: '12 hour ago',
    unread: false,
    isRead: true
  }
];

const mockMessages = [
  {
    id: 1,
    senderId: 8, // Daniel
    messages: [
      'Hey, Dan',
      'Can you help with with the last task for Eventora, please?',
      "I'm little bit confused with the task.. 😅"
    ],
    time: '10:17 AM',
    isMe: false
  },
  {
    id: 2,
    senderId: 0, // Me
    messages: ["it's done already, no worries!"],
    time: '10:22 AM',
    isMe: true,
    read: true
  },
  {
    id: 3,
    senderId: 8, // Daniel
    messages: ['what...', 'Really?! Thank you so much! 😍'],
    time: '10:32 AM',
    isMe: false
  },
  {
    id: 4,
    senderId: 0, // Me
    messages: ['anytime! my pleasure~'],
    reaction: '🌹',  // This is a reaction, not a separate message
    time: '11:01 AM',
    isMe: true,
    read: true
  }
];

// Current state
let currentChatUserId = 8; // Daniel CH
let currentUser = {
  id: 0,
  name: 'testing2',
  email: 'testing2@gmail.com',
  avatar: 'testing2'
};

// DOM Elements
const userMenuTrigger = document.getElementById('userMenuTrigger');
const logoMenuTrigger = document.getElementById('logoMenuTrigger');
const userDropdown = document.getElementById('userDropdown');
const newMessageBtn = document.getElementById('newMessageBtn');
const newMessageModal = document.getElementById('newMessageModal');
const conversationList = document.getElementById('conversationList');
const userList = document.getElementById('userList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userSearchInput = document.getElementById('userSearchInput');
const contextMenu = document.getElementById('contextMenu');
const contactInfoSidebar = document.getElementById('contactInfoSidebar');
const closeContactInfoBtn = document.getElementById('closeContactInfo');

// Context menu state
let contextMenuTargetId = null;

// Contact info state
let contactInfoUserId = null;

// Swipe state
let swipeStartX = 0;
let swipeCurrentX = 0;
let isSwiping = false;
let swipingElement = null;

// Initialize the app
function init() {
  renderConversations();
  renderUserList();
  renderMessages();
  setupEventListeners();
}

// Render conversation list
function renderConversations() {
  conversationList.innerHTML = mockConversations.map(conv => `
    <div class="conversation-item-wrapper" data-conv-id="${conv.id}">
      <!-- Left swipe action - Unread -->
      <div class="swipe-action left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Unread
      </div>
      <!-- Right swipe action - Archive -->
      <div class="swipe-action right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="21 8 21 21 3 21 3 8"></polyline>
          <rect x="1" y="3" width="22" height="5"></rect>
          <line x1="10" y1="12" x2="14" y2="12"></line>
        </svg>
        Archive
      </div>
      <div class="conversation-item ${conv.active ? 'active' : ''} ${conv.unread ? 'unread' : ''}" data-user-id="${conv.user.id}">
        ${conv.unread ? `
          <div class="unread-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Unread</span>
          </div>
        ` : `
          <div class="conversation-avatar">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user.avatar}" alt="${conv.user.name}">
            ${conv.user.online ? '<span class="online-dot"></span>' : ''}
          </div>
        `}
        <div class="conversation-content">
          <div class="conversation-top">
            <span class="conversation-name">${conv.user.name}</span>
            <span class="conversation-time">${conv.time}</span>
          </div>
          <div class="conversation-bottom">
            <span class="conversation-preview">${conv.lastMessage}</span>
            ${conv.isRead && !conv.unread ? `
              <span class="read-receipt">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: -8px;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!isSwiping) {
        const userId = parseInt(item.dataset.userId);
        selectConversation(userId);
      }
    });

    // Right-click context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, item.dataset.userId);
    });
  });

  // Setup swipe handlers
  setupSwipeHandlers();
}

// Render user list in modal
function renderUserList(filter = '') {
  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(filter.toLowerCase())
  );

  userList.innerHTML = filteredUsers.map(user => `
    <div class="user-list-item" data-user-id="${user.id}">
      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}" alt="${user.name}">
      <span>${user.name}</span>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.user-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const userId = parseInt(item.dataset.userId);
      startNewConversation(userId);
    });
  });
}

// Render messages
function renderMessages() {
  const currentChatUser = mockUsers.find(u => u.id === currentChatUserId);
  
  // Update header
  document.getElementById('chatUserName').textContent = currentChatUser.name;
  document.getElementById('chatUserStatus').textContent = currentChatUser.online ? 'Online' : 'Offline';
  document.getElementById('chatUserStatus').style.color = currentChatUser.online ? '#10b981' : '#6b7280';
  document.getElementById('chatUserAvatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentChatUser.avatar}`;

  // Render messages
  let html = '<div class="message-date-divider"><span>Today</span></div>';

  mockMessages.forEach(msg => {
    const groupClass = msg.isMe ? 'sent' : 'received';
    const lastIndex = msg.messages.length - 1;
    
    html += `
      <div class="message-group ${groupClass}">
        ${msg.messages.map((text, index) => `
          <div class="message-bubble ${msg.reaction && index === lastIndex ? 'has-reaction' : ''}">
            ${text}
            ${msg.reaction && index === lastIndex ? `<span class="message-reaction">${msg.reaction}</span>` : ''}
          </div>
        `).join('')}
        <div class="message-time">
          ${msg.time}
          ${msg.isMe && msg.read ? `
            <span class="read-status">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: -6px;">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          ` : ''}
        </div>
      </div>
    `;
  });

  chatMessages.innerHTML = html;
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Select a conversation
function selectConversation(userId) {
  currentChatUserId = userId;
  
  // Clear unread status
  const conv = mockConversations.find(c => c.user.id === userId);
  if (conv && conv.unread) {
    conv.unread = false;
  }
  
  // Update active state
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
    if (parseInt(item.dataset.userId) === userId) {
      item.classList.add('active');
    }
  });

  // In a real app, you'd fetch messages here
  renderMessages();
  renderConversations();
}

// Start new conversation
function startNewConversation(userId) {
  currentChatUserId = userId;
  hideModal();
  
  // Check if conversation exists
  const existingConv = mockConversations.find(c => c.user.id === userId);
  if (!existingConv) {
    const user = mockUsers.find(u => u.id === userId);
    mockConversations.unshift({
      id: Date.now(),
      user: user,
      lastMessage: 'Start a conversation...',
      time: 'Now',
      unread: false,
      isRead: false,
      active: true
    });
  }
  
  renderConversations();
  selectConversation(userId);
}

// Send message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // Add message to mock data
  const newMessage = {
    id: Date.now(),
    senderId: 0,
    messages: [text],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isMe: true,
    read: false
  };

  mockMessages.push(newMessage);
  
  // Update conversation preview
  const conv = mockConversations.find(c => c.user.id === currentChatUserId);
  if (conv) {
    conv.lastMessage = text;
    conv.time = 'Just now';
    conv.isRead = false;
  }

  messageInput.value = '';
  renderMessages();
  renderConversations();

  // Simulate read receipt after 1 second
  setTimeout(() => {
    newMessage.read = true;
    if (conv) conv.isRead = true;
    renderMessages();
    renderConversations();
  }, 1000);
}

// Toggle user dropdown
function toggleUserDropdown() {
  userDropdown.classList.toggle('show');
}

// Show modal
function showModal() {
  newMessageModal.classList.add('show');
  userSearchInput.value = '';
  renderUserList();
  userSearchInput.focus();
}

// Hide modal
function hideModal() {
  newMessageModal.classList.remove('show');
}

// Show context menu
function showContextMenu(e, userId) {
  contextMenuTargetId = userId;
  
  const x = e.clientX;
  const y = e.clientY;
  
  // Position menu
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  
  // Adjust if too close to edge
  const menuRect = contextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (x + 200 > viewportWidth) {
    contextMenu.style.left = `${x - 200}px`;
  }
  
  if (y + menuRect.height > viewportHeight) {
    contextMenu.style.top = `${y - menuRect.height}px`;
  }
  
  contextMenu.classList.add('show');
}

// Hide context menu
function hideContextMenu() {
  contextMenu.classList.remove('show');
  contextMenuTargetId = null;
}

// Handle context menu action
function handleContextMenuAction(action) {
  const conv = mockConversations.find(c => c.user.id === parseInt(contextMenuTargetId));
  
  switch(action) {
    case 'unread':
      markAsUnread(contextMenuTargetId);
      break;
    case 'archive':
      archiveConversation(contextMenuTargetId);
      break;
    case 'mute':
      console.log('Mute:', conv?.user.name);
      break;
    case 'contact':
      showContactInfo(contextMenuTargetId);
      break;
    case 'export':
      console.log('Export chat:', conv?.user.name);
      break;
    case 'clear':
      console.log('Clear chat:', conv?.user.name);
      break;
    case 'delete':
      deleteConversation(contextMenuTargetId);
      break;
  }
  
  hideContextMenu();
}

// Mark conversation as unread
function markAsUnread(userId) {
  const conv = mockConversations.find(c => c.user.id === parseInt(userId));
  if (conv) {
    conv.unread = true;
    conv.isRead = false;
    renderConversations();
  }
}

// Show contact info sidebar
function showContactInfo(userId) {
  const user = mockUsers.find(u => u.id === parseInt(userId));
  if (!user) return;
  
  contactInfoUserId = userId;
  
  // Update contact info content
  document.getElementById('contactAvatar').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`;
  document.getElementById('contactName').textContent = user.name;
  document.getElementById('contactEmail').textContent = user.email;
  
  // Show sidebar
  contactInfoSidebar.classList.add('show');
  document.querySelector('.app-container').classList.add('contact-open');
}

// Hide contact info sidebar
function hideContactInfo() {
  contactInfoSidebar.classList.remove('show');
  document.querySelector('.app-container').classList.remove('contact-open');
  contactInfoUserId = null;
}

// Archive conversation
function archiveConversation(userId) {
  const index = mockConversations.findIndex(c => c.user.id === parseInt(userId));
  if (index > -1) {
    const conv = mockConversations[index];
    console.log('Archived:', conv.user.name);
    mockConversations.splice(index, 1);
    renderConversations();
  }
}

// Delete conversation
function deleteConversation(userId) {
  const index = mockConversations.findIndex(c => c.user.id === parseInt(userId));
  if (index > -1) {
    const conv = mockConversations[index];
    console.log('Deleted:', conv.user.name);
    mockConversations.splice(index, 1);
    renderConversations();
  }
}

// Setup swipe handlers for touch/mouse
function setupSwipeHandlers() {
  const wrappers = document.querySelectorAll('.conversation-item-wrapper');
  
  wrappers.forEach(wrapper => {
    const item = wrapper.querySelector('.conversation-item');
    const swipeActionLeft = wrapper.querySelector('.swipe-action.left');
    const swipeActionRight = wrapper.querySelector('.swipe-action.right');
    
    // Mouse events
    item.addEventListener('mousedown', (e) => startSwipe(e, item, swipeActionLeft, swipeActionRight));
    
    // Touch events
    item.addEventListener('touchstart', (e) => startSwipe(e.touches[0], item, swipeActionLeft, swipeActionRight), { passive: true });
  });
  
  // Global move and end handlers
  document.addEventListener('mousemove', handleSwipeMove);
  document.addEventListener('mouseup', handleSwipeEnd);
  document.addEventListener('touchmove', (e) => handleSwipeMove(e.touches[0]), { passive: true });
  document.addEventListener('touchend', handleSwipeEnd);
}

function startSwipe(e, item, swipeActionLeft, swipeActionRight) {
  swipeStartX = e.clientX || e.pageX;
  swipingElement = item;
  swipingElement.swipeActionLeft = swipeActionLeft;
  swipingElement.swipeActionRight = swipeActionRight;
  swipingElement.classList.add('swiping');
}

function handleSwipeMove(e) {
  if (!swipingElement) return;
  
  const currentX = e.clientX || e.pageX;
  const diff = swipeStartX - currentX;
  
  isSwiping = true;
  
  // Right swipe (diff < 0) - show Unread on left
  if (diff < 0) {
    const translateX = Math.min(Math.abs(diff), 70);
    swipingElement.style.transform = `translateX(${translateX}px)`;
    
    if (translateX > 35) {
      swipingElement.swipeActionLeft?.classList.add('visible');
    } else {
      swipingElement.swipeActionLeft?.classList.remove('visible');
    }
    swipingElement.swipeActionRight?.classList.remove('visible');
  }
  // Left swipe (diff > 0) - show Archive on right
  else if (diff > 0) {
    const translateX = Math.min(diff, 70);
    swipingElement.style.transform = `translateX(-${translateX}px)`;
    
    if (translateX > 35) {
      swipingElement.swipeActionRight?.classList.add('visible');
    } else {
      swipingElement.swipeActionRight?.classList.remove('visible');
    }
    swipingElement.swipeActionLeft?.classList.remove('visible');
  }
}

function handleSwipeEnd() {
  if (!swipingElement) return;
  
  const transform = swipingElement.style.transform;
  const match = transform?.match(/translateX\((-?\d+)px\)/);
  const translateX = match ? parseInt(match[1]) : 0;
  
  swipingElement.classList.remove('swiping');
  
  const wrapper = swipingElement.closest('.conversation-item-wrapper');
  const convId = wrapper.dataset.convId;
  const conv = mockConversations.find(c => c.id === parseInt(convId));
  
  // If swiped right more than 50px, trigger unread
  if (translateX >= 50 && conv) {
    markAsUnread(conv.user.id);
  }
  // If swiped left more than 50px, trigger archive
  else if (translateX <= -50 && conv) {
    archiveConversation(conv.user.id);
  }
  
  // Reset position
  swipingElement.style.transform = '';
  swipingElement.swipeActionLeft?.classList.remove('visible');
  swipingElement.swipeActionRight?.classList.remove('visible');
  
  // Reset state after a small delay to prevent click
  setTimeout(() => {
    isSwiping = false;
  }, 100);
  
  swipingElement = null;
}

// Setup event listeners
function setupEventListeners() {
  // Logo menu toggle (opens dropdown)
  logoMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUserDropdown();
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target) && !logoMenuTrigger.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
  });

  // New message modal
  newMessageBtn.addEventListener('click', showModal);

  // Close modal on overlay click
  newMessageModal.addEventListener('click', (e) => {
    if (e.target === newMessageModal) {
      hideModal();
    }
  });

  // User search
  userSearchInput.addEventListener('input', (e) => {
    renderUserList(e.target.value);
  });

  // Send message
  sendBtn.addEventListener('click', sendMessage);
  
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
      userDropdown.classList.remove('show');
      hideContextMenu();
      hideContactInfo();
    }
  });

  // Context menu item clicks
  document.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      handleContextMenuAction(action);
    });
  });

  // Hide context menu on outside click
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // Close contact info
  closeContactInfoBtn.addEventListener('click', hideContactInfo);

  // Chat header avatar click to show contact info
  document.querySelector('.chat-user-avatar').addEventListener('click', () => {
    showContactInfo(currentChatUserId);
  });

  // Contact tabs
  document.querySelectorAll('.contact-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.contact-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active pane
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      const activePane = document.querySelector(`.tab-pane[data-pane="${tabName}"]`);
      if (activePane) {
        activePane.classList.add('active');
      }
    });
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
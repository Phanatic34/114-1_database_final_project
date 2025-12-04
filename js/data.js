/**
 * Data Layer for Second-hand Marketplace
 * Uses localStorage for persistence
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID (e.g., 'u1')
 * @property {string} name - Display name
 * @property {string} email - Email address
 * @property {string} password - Password (plain text for demo)
 * @property {boolean} [disabled] - Whether account is disabled
 */

/**
 * @typedef {Object} Item
 * @property {string} id - Item ID (e.g., 'i1')
 * @property {string} sellerId - User ID of seller
 * @property {string} title - Item title
 * @property {string} category - Category ('console', 'phone', etc.)
 * @property {string} condition - Condition ('全新', '九成新', etc.)
 * @property {number} price - Price in NT$
 * @property {string} description - Item description
 * @property {string[]} tags - Tags array
 * @property {string} location - Location (e.g., '台北市大安區')
 * @property {number} quantity - Available quantity
 * @property {Object} modes - Trade modes
 * @property {boolean} modes.sale - 販售中
 * @property {boolean} modes.tradeTarget - 可交換（指定目標）
 * @property {boolean} modes.tradeOpen - 開放式許願
 * @property {string} [tradeTargetNote] - What seller wants to trade for
 * @property {string[]} images - Image URLs
 * @property {number} views - View count
 * @property {number} addedToCartCount - Added to cart count
 * @property {boolean} [isActive] - Whether item is active/listed
 * @property {string} [createdAt] - Creation timestamp
 */

/**
 * @typedef {Object} Request
 * @property {string} id - Request ID
 * @property {string} itemId - Item ID
 * @property {string} sellerId - Seller user ID
 * @property {string} buyerId - Buyer user ID
 * @property {string} type - Request type: 'purchase' | 'trade-target' | 'trade-open' | 'trade-wish'
 * @property {string} status - Status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
 * @property {string} createdAt - Creation timestamp
 * @property {number} quantity - Quantity requested
 * @property {string} [note] - Optional note
 * @property {string} [offeredItemId] - Offered item ID for trades
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} [requestId] - Associated request ID
 * @property {string} [itemId] - Associated item ID
 * @property {string} senderId - Sender user ID
 * @property {string} receiverId - Receiver user ID
 * @property {string} text - Message text
 * @property {string} createdAt - Creation timestamp
 * @property {boolean} [read] - Whether message is read
 */

// Storage keys
const STORAGE_KEYS = {
  USERS: 'users',
  CURRENT_USER_ID: 'currentUserId',
  ITEMS: 'items',
  REQUESTS: 'requests',
  MESSAGES: 'messages'
};

// Helper: Get data from localStorage
function getStorage(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return defaultValue;
  }
}

// Helper: Save data to localStorage
function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
    return false;
  }
}

// Generate unique ID
function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========== User Functions ==========

/**
 * Get current logged-in user
 * @returns {User|null}
 */
function getCurrentUser() {
  const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!userId) return null;
  
  const users = getUsers();
  return users.find(u => u.id === userId) || null;
}

/**
 * Get all users
 * @returns {User[]}
 */
function getUsers() {
  return getStorage(STORAGE_KEYS.USERS, []);
}

/**
 * Save users
 * @param {User[]} users
 */
function saveUsers(users) {
  setStorage(STORAGE_KEYS.USERS, users);
}

/**
 * Create a new user
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {User}
 */
function createUser(name, email, password) {
  const users = getUsers();
  
  // Check if email already exists
  if (users.some(u => u.email === email)) {
    throw new Error('此電子郵件已被註冊');
  }
  
  const user = {
    id: generateId('u'),
    name,
    email,
    password,
    disabled: false
  };
  
  users.push(user);
  saveUsers(users);
  return user;
}

/**
 * Login user
 * @param {string} email
 * @param {string} password
 * @returns {User|null}
 */
function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password && !u.disabled);
  
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    return user;
  }
  
  return null;
}

/**
 * Logout current user
 */
function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
}

/**
 * Update user
 * @param {string} userId
 * @param {Partial<User>} updates
 */
function updateUser(userId, updates) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
    return users[index];
  }
  return null;
}

/**
 * Require login - redirect if not logged in
 * @param {string} redirectUrl - URL to redirect to after login
 */
function requireLogin(redirectUrl = null) {
  const user = getCurrentUser();
  if (!user) {
    const url = redirectUrl || window.location.href;
    window.location.href = `login.html?redirect=${encodeURIComponent(url)}`;
    return false;
  }
  return true;
}

// ========== Item Functions ==========

/**
 * Get all items
 * @returns {Item[]}
 */
function getItems() {
  return getStorage(STORAGE_KEYS.ITEMS, []);
}

/**
 * Save items
 * @param {Item[]} items
 */
function saveItems(items) {
  setStorage(STORAGE_KEYS.ITEMS, items);
}

/**
 * Get item by ID
 * @param {string} itemId
 * @returns {Item|null}
 */
function getItemById(itemId) {
  const items = getItems();
  return items.find(i => i.id === itemId) || null;
}

/**
 * Get items by seller ID
 * @param {string} sellerId
 * @returns {Item[]}
 */
function getItemsBySeller(sellerId) {
  const items = getItems();
  return items.filter(i => i.sellerId === sellerId);
}

/**
 * Create a new item
 * @param {Item} itemData
 * @returns {Item}
 */
function createItem(itemData) {
  const items = getItems();
  const item = {
    id: generateId('i'),
    createdAt: new Date().toISOString(),
    views: 0,
    addedToCartCount: 0,
    isActive: true,
    ...itemData
  };
  
  items.push(item);
  saveItems(items);
  return item;
}

/**
 * Update item
 * @param {string} itemId
 * @param {Partial<Item>} updates
 */
function updateItem(itemId, updates) {
  const items = getItems();
  const index = items.findIndex(i => i.id === itemId);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveItems(items);
    return items[index];
  }
  return null;
}

/**
 * Delete item
 * @param {string} itemId
 */
function deleteItem(itemId) {
  const items = getItems();
  const filtered = items.filter(i => i.id !== itemId);
  saveItems(filtered);
}

// ========== Request Functions ==========

/**
 * Get all requests
 * @returns {Request[]}
 */
function getRequests() {
  return getStorage(STORAGE_KEYS.REQUESTS, []);
}

/**
 * Save requests
 * @param {Request[]} requests
 */
function saveRequests(requests) {
  setStorage(STORAGE_KEYS.REQUESTS, requests);
}

/**
 * Get request by ID
 * @param {string} requestId
 * @returns {Request|null}
 */
function getRequestById(requestId) {
  const requests = getRequests();
  return requests.find(r => r.id === requestId) || null;
}

/**
 * Get requests by user (as buyer or seller)
 * @param {string} userId
 * @returns {{outgoing: Request[], incoming: Request[]}}
 */
function getRequestsByUser(userId) {
  const requests = getRequests();
  return {
    outgoing: requests.filter(r => r.buyerId === userId),
    incoming: requests.filter(r => r.sellerId === userId)
  };
}

/**
 * Create a new request
 * @param {Request} requestData
 * @returns {Request}
 */
function createRequest(requestData) {
  const requests = getRequests();
  const request = {
    id: generateId('r'),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...requestData
  };
  
  requests.push(request);
  saveRequests(requests);
  return request;
}

/**
 * Update request
 * @param {string} requestId
 * @param {Partial<Request>} updates
 */
function updateRequest(requestId, updates) {
  const requests = getRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index !== -1) {
    requests[index] = { ...requests[index], ...updates };
    saveRequests(requests);
    return requests[index];
  }
  return null;
}

// ========== Message Functions ==========

/**
 * Get all messages
 * @returns {Message[]}
 */
function getMessages() {
  return getStorage(STORAGE_KEYS.MESSAGES, []);
}

/**
 * Save messages
 * @param {Message[]} messages
 */
function saveMessages(messages) {
  setStorage(STORAGE_KEYS.MESSAGES, messages);
}

/**
 * Get messages for a conversation
 * @param {string} itemId
 * @param {string} userId1
 * @param {string} userId2
 * @param {string} [requestId]
 * @returns {Message[]}
 */
function getMessagesForConversation(itemId, userId1, userId2, requestId = null) {
  const messages = getMessages();
  return messages.filter(m => {
    const matchesItem = m.itemId === itemId;
    const matchesUsers = (m.senderId === userId1 && m.receiverId === userId2) ||
                        (m.senderId === userId2 && m.receiverId === userId1);
    const matchesRequest = !requestId || m.requestId === requestId;
    return matchesItem && matchesUsers && matchesRequest;
  }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Create a new message
 * @param {Message} messageData
 * @returns {Message}
 */
function createMessage(messageData) {
  const messages = getMessages();
  const message = {
    id: generateId('m'),
    createdAt: new Date().toISOString(),
    read: false,
    ...messageData
  };
  
  messages.push(message);
  saveMessages(messages);
  return message;
}

/**
 * Get conversations for a user
 * @param {string} userId
 * @returns {Array<{itemId: string, otherUserId: string, otherUserName: string, lastMessage: Message, item: Item}>}
 */
function getConversationsForUser(userId) {
  const messages = getMessages();
  const items = getItems();
  const users = getUsers();
  
  // Group messages by (itemId, otherUserId)
  const conversationMap = new Map();
  
  messages.forEach(msg => {
    if (msg.senderId === userId || msg.receiverId === userId) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const key = `${msg.itemId || 'no-item'}_${otherUserId}`;
      
      if (!conversationMap.has(key) || 
          new Date(msg.createdAt) > new Date(conversationMap.get(key).lastMessage.createdAt)) {
        const item = items.find(i => i.id === msg.itemId);
        const otherUser = users.find(u => u.id === otherUserId);
        
        conversationMap.set(key, {
          itemId: msg.itemId,
          otherUserId,
          otherUserName: otherUser ? otherUser.name : 'Unknown',
          lastMessage: msg,
          item: item || null
        });
      }
    }
  });
  
  return Array.from(conversationMap.values()).sort((a, b) => 
    new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
  );
}

// ========== Seed Data ==========

/**
 * Initialize with demo data if storage is empty
 */
function seedDemoData() {
  const users = getUsers();
  const items = getItems();
  
  if (users.length === 0) {
    // Create demo users
    const demoUsers = [
      { id: 'u1', name: 'game_lover_2024', email: 'demo1@example.com', password: 'demo123', disabled: false },
      { id: 'u2', name: 'ps5_seller', email: 'demo2@example.com', password: 'demo123', disabled: false },
      { id: 'u3', name: 'phone_dealer', email: 'demo3@example.com', password: 'demo123', disabled: false }
    ];
    saveUsers(demoUsers);
  }
  
  if (items.length === 0) {
    // Create demo items (using existing mockItems structure from itemsData.js)
    // We'll load these from the existing data file if available
    const demoItems = [
      {
        id: 'i1',
        sellerId: 'u1',
        title: 'Nintendo Switch OLED 白色主機',
        category: 'games',
        condition: '九成新',
        price: 8500,
        description: 'Nintendo Switch OLED 白色主機，使用約一年，功能完全正常。',
        tags: ['Nintendo', 'Switch', 'OLED', '遊戲主機', '二手'],
        location: '台北市信義區',
        quantity: 1,
        modes: {
          sale: true,
          tradeTarget: true,
          tradeOpen: false
        },
        tradeTargetNote: '想換 PlayStation 5 或 Xbox Series X，也接受其他 Nintendo 主機相關商品',
        images: [
          'https://via.placeholder.com/600x600/0064D2/FFFFFF?text=Nintendo+Switch+1',
          'https://via.placeholder.com/600x600/0052A3/FFFFFF?text=Nintendo+Switch+2'
        ],
        views: 342,
        addedToCartCount: 18,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'i2',
        sellerId: 'u2',
        title: 'PlayStation 5 光碟版 主機',
        category: 'games',
        condition: '全新',
        price: 12000,
        description: 'PlayStation 5 光碟版主機，全新未拆封，原廠保固。',
        tags: ['PlayStation', 'PS5', '遊戲主機', '全新'],
        location: '新北市板橋區',
        quantity: 1,
        modes: {
          sale: true,
          tradeTarget: false,
          tradeOpen: false
        },
        images: [
          'https://via.placeholder.com/600x600/0064D2/FFFFFF?text=PS5+1',
          'https://via.placeholder.com/600x600/0052A3/FFFFFF?text=PS5+2'
        ],
        views: 521,
        addedToCartCount: 23,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'i3',
        sellerId: 'u3',
        title: 'iPhone 13 Pro 256GB 深藍色',
        category: 'electronics',
        condition: '九成新',
        price: 18000,
        description: 'iPhone 13 Pro 256GB 深藍色，使用約一年半，功能完全正常。',
        tags: ['Apple', 'iPhone', '13 Pro', '256GB', '二手'],
        location: '台北市大安區',
        quantity: 1,
        modes: {
          sale: true,
          tradeTarget: true,
          tradeOpen: true
        },
        tradeTargetNote: '接受各種 3C 產品交換提案',
        images: [
          'https://via.placeholder.com/600x600/003D7A/FFFFFF?text=iPhone+1',
          'https://via.placeholder.com/600x600/002855/FFFFFF?text=iPhone+2'
        ],
        views: 678,
        addedToCartCount: 34,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    saveItems(demoItems);
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  seedDemoData();
}


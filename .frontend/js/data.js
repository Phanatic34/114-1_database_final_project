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

/**
 * @typedef {Object} Transaction
 * @property {string} id - Transaction ID
 * @property {string} itemId - Item ID
 * @property {string} sellerId - Seller user ID
 * @property {string} buyerId - Buyer user ID
 * @property {string} type - Transaction type: 'purchase' | 'trade-open' | 'trade-target'
 * @property {string} status - Status: 'pending' | 'declined' | 'reserved' | 'completed' | 'cancelled'
 * @property {number} quantity - Quantity
 * @property {string} createdAt - Creation timestamp
 * @property {string} [reservedAt] - When seller accepted (ISO datetime)
 * @property {string} [completedAt] - When both confirmed (ISO datetime)
 * @property {string} [sellerConfirmedAt] - When seller clicked 已面交
 * @property {string} [buyerConfirmedAt] - When buyer clicked 已面交
 * @property {string} [note] - Optional note
 * @property {string} [offeredItemId] - Offered item ID for trades
 */

/**
 * @typedef {Object} Review
 * @property {string} id - Review ID
 * @property {string} itemId - Item ID
 * @property {string} transactionId - Transaction ID
 * @property {string} fromUserId - User who wrote the review
 * @property {string} toUserId - User being reviewed
 * @property {number} rating - Rating 1-5
 * @property {string} comment - Review comment
 * @property {string} createdAt - Creation timestamp
 */

// Storage keys
const STORAGE_KEYS = {
  USERS: 'users',
  CURRENT_USER_ID: 'currentUserId',
  ITEMS: 'items',
  REQUESTS: 'requests',
  MESSAGES: 'messages',
  TRANSACTIONS: 'transactions',
  REVIEWS: 'reviews',
  CART: 'cart'
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
 * Get current logged-in user ID
 * @returns {string|null}
 */
function getCurrentUserId() {
  // 優先使用 API 認證
  if (typeof window !== 'undefined' && typeof window.api !== 'undefined' && window.api.getUserId) {
    const userId = window.api.getUserId();
    if (userId) {
      return String(userId);
    }
  }
  
  // 也檢查 localStorage 中的 userId (API 方式)
  const apiUserId = localStorage.getItem('userId');
  if (apiUserId) {
    return String(apiUserId);
  }
  
  // 回退到舊的方式
  return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
}

/**
 * Get current logged-in user
 * @returns {User|null}
 */
function getCurrentUser() {
  // 方式 1: 檢查 userInfo (API 登入方式)
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      // 轉換為舊格式以保持相容性
      return {
        id: String(user.user_id),
        name: user.user_name,
        email: user.email,
        student_id: user.student_id
      };
    } catch (e) {
      console.error('無法解析使用者資訊:', e);
    }
  }
  
  // 方式 2: 檢查 userId (API 登入方式，但沒有完整 userInfo)
  const apiUserId = localStorage.getItem('userId');
  if (apiUserId) {
    // 返回基本用戶對象，至少有 id
    return {
      id: String(apiUserId),
      name: '使用者',
      email: '',
      student_id: ''
    };
  }
  
  // 方式 3: 檢查 currentUserId (舊登入方式)
  const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (currentUserId) {
    const users = getUsers();
    const user = users.find(u => u.id === currentUserId);
    if (user) {
      return user;
    }
    // 即使找不到用戶資料，也返回基本對象
    return {
      id: String(currentUserId),
      name: '使用者',
      email: '',
      student_id: ''
    };
  }
  
  return null;
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
  // 先檢查是否有任何形式的登入狀態
  const hasUserId = localStorage.getItem('userId');
  const hasUserInfo = localStorage.getItem('userInfo');
  const hasCurrentUserId = localStorage.getItem('currentUserId');
  
  if (hasUserId || hasUserInfo || hasCurrentUserId) {
    return true;
  }
  
  // 如果都沒有，跳轉到登入頁
  const url = redirectUrl || window.location.href;
  window.location.href = `login.html?redirect=${encodeURIComponent(url)}`;
  return false;
}

/**
 * Check if current user is the seller of an item
 * @param {Item} item
 * @returns {boolean}
 */
function isCurrentUserSeller(item) {
  const currentUserId = getCurrentUserId();
  return currentUserId && item && item.sellerId && String(currentUserId) === String(item.sellerId);
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
 * Get all items including seed items
 * @returns {Item[]}
 */
function getAllItems() {
  const userItems = getItems();
  const seedItems = getSeedItems();
  
  // Combine seed items and user items, avoiding duplicates by ID
  const itemMap = new Map();
  
  // Add seed items first
  seedItems.forEach(item => {
    itemMap.set(String(item.id), item);
  });
  
  // Add user items (they override seed items if same ID)
  userItems.forEach(item => {
    itemMap.set(String(item.id), item);
  });
  
  return Array.from(itemMap.values());
}

/**
 * Get seed items (demo items)
 * @returns {Item[]}
 */
function getSeedItems() {
  // Return the demo items that are seeded on first load
  // 已移除假資料（Nintendo Switch、PlayStation 5、iPhone 13 Pro）
  const demoItems = [
  ];
  
  return demoItems;
}

/**
 * Get item by ID (searches both seed and user items)
 * @param {string|number} itemId
 * @returns {Item|null}
 */
function getItemById(itemId) {
  if (!itemId) return null;
  const allItems = getAllItems();
  // Convert both to strings for comparison to handle type mismatches
  const itemIdStr = String(itemId);
  return allItems.find(i => String(i.id) === itemIdStr) || null;
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
 * @param {string|number} itemId
 * @param {Partial<Item>} updates
 */
function updateItem(itemId, updates) {
  if (!itemId) return null;
  const items = getItems();
  const itemIdStr = String(itemId);
  const index = items.findIndex(i => String(i.id) === itemIdStr);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveItems(items);
    return items[index];
  }
  return null;
}

/**
 * Delete item
 * @param {string|number} itemId
 */
function deleteItem(itemId) {
  if (!itemId) return;
  const items = getItems();
  const itemIdStr = String(itemId);
  const filtered = items.filter(i => String(i.id) !== itemIdStr);
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

/**
 * Cancel a request (only by the buyer who created it)
 * @param {string} requestId
 * @param {string} userId - User ID of the person cancelling (must be the buyer)
 * @returns {Request|null}
 */
function cancelRequest(requestId, userId) {
  const requests = getRequests();
  const index = requests.findIndex(r => r.id === requestId);
  
  if (index === -1) return null;
  
  const request = requests[index];
  
  // Only the buyer (req.buyerId) is allowed to cancel their own request
  if (userId && request.buyerId && request.buyerId !== userId) {
    return null;
  }
  
  requests[index] = {
    ...request,
    status: 'cancelled',
    cancelledAt: new Date().toISOString()
  };
  
  saveRequests(requests);
  return requests[index];
}

/**
 * Get active (pending) requests for an item
 * @param {string} itemId
 * @returns {Request[]}
 */
function getActiveRequestsForItem(itemId) {
  const all = getRequests();
  return all.filter(req => 
    String(req.itemId) === String(itemId) && 
    req.status === 'pending'
  );
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
    // 已移除假資料（Nintendo Switch、PlayStation 5、iPhone 13 Pro）
    // 現在只使用資料庫中的真實商品資料
    // 不需要創建假資料
  }
}

// ========== Pending Transactions ==========

const PENDING_TX_KEY = 'pendingTransactions';

/**
 * Load all pending transactions
 * @returns {Object<string, {itemId: string, type: 'buy' | 'trade', createdAt: number}>}
 */
function loadPendingTransactions() {
  try {
    const raw = localStorage.getItem(PENDING_TX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error loading pending transactions:', e);
    return {};
  }
}

/**
 * Save pending transactions map
 * @param {Object<string, {itemId: string, type: 'buy' | 'trade', createdAt: number}>} map
 */
function savePendingTransactions(map) {
  try {
    localStorage.setItem(PENDING_TX_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving pending transactions:', e);
  }
}

/**
 * Set a pending transaction for an item
 * @param {string} itemId
 * @param {'buy' | 'trade'} type
 */
function setPendingTransaction(itemId, type) {
  const map = loadPendingTransactions();
  map[itemId] = { itemId, type, createdAt: Date.now() };
  savePendingTransactions(map);
}

/**
 * Clear pending transaction for an item
 * @param {string} itemId
 */
function clearPendingTransaction(itemId) {
  const map = loadPendingTransactions();
  delete map[itemId];
  savePendingTransactions(map);
}

/**
 * Check if an item has a pending transaction
 * @param {string} itemId
 * @returns {boolean}
 */
function hasPendingTransaction(itemId) {
  const map = loadPendingTransactions();
  return !!map[itemId];
}

// ========== Transaction Functions ==========

/**
 * Get all transactions
 * @returns {Transaction[]}
 */
function getTransactions() {
  return getStorage(STORAGE_KEYS.TRANSACTIONS, []);
}

/**
 * Save transactions
 * @param {Transaction[]} transactions
 */
function saveTransactions(transactions) {
  setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
}

/**
 * Get transaction by ID
 * @param {string} transactionId
 * @returns {Transaction|null}
 */
function getTransactionById(transactionId) {
  const transactions = getTransactions();
  return transactions.find(t => t.id === transactionId) || null;
}

/**
 * Get transactions by item ID
 * @param {string} itemId
 * @returns {Transaction[]}
 */
function getTransactionsByItem(itemId) {
  const transactions = getTransactions();
  return transactions.filter(t => String(t.itemId) === String(itemId));
}

/**
 * Get active transaction for item (reserved or completed)
 * @param {string} itemId
 * @returns {Transaction|null}
 */
function getActiveTransactionForItem(itemId) {
  const transactions = getTransactionsByItem(itemId);
  return transactions.find(t => t.status === 'reserved' || t.status === 'completed') || null;
}

/**
 * Create transaction from request
 * @param {Request} request
 * @returns {Transaction}
 */
function createTransactionFromRequest(request) {
  const transactions = getTransactions();
  
  // Check if transaction already exists for this request
  const existing = transactions.find(t => 
    String(t.itemId) === String(request.itemId) &&
    String(t.buyerId) === String(request.buyerId) &&
    (t.status === 'reserved' || t.status === 'pending')
  );
  
  if (existing) {
    return existing;
  }
  
  const transaction = {
    id: generateId('tx'),
    itemId: request.itemId,
    sellerId: request.sellerId,
    buyerId: request.buyerId,
    type: request.type,
    quantity: request.quantity || 1,
    status: 'pending',
    createdAt: request.createdAt || new Date().toISOString(),
    note: request.note,
    offeredItemId: request.offeredItemId
  };
  
  transactions.push(transaction);
  saveTransactions(transactions);
  return transaction;
}

/**
 * Update transaction
 * @param {string} transactionId
 * @param {Partial<Transaction>} updates
 * @returns {Transaction|null}
 */
function updateTransaction(transactionId, updates) {
  const transactions = getTransactions();
  const index = transactions.findIndex(t => t.id === transactionId);
  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...updates };
    saveTransactions(transactions);
    return transactions[index];
  }
  return null;
}

// ========== Item Status Functions ==========

/**
 * Set item as reserved
 * @param {string} itemId
 * @param {string} buyerId
 * @param {string} reservedAt
 */
function setItemReserved(itemId, buyerId, reservedAt) {
  const items = getItems();
  const index = items.findIndex(i => i.id === itemId);
  if (index !== -1) {
    items[index] = {
      ...items[index],
      status: 'reserved',
      reservedForUserId: buyerId,
      reservedAt: reservedAt
    };
    saveItems(items);
    return items[index];
  }
  return null;
}

/**
 * Set item as sold
 * @param {string} itemId
 * @param {string} completedAt
 */
function setItemSold(itemId, completedAt) {
  const items = getItems();
  const index = items.findIndex(i => i.id === itemId);
  if (index !== -1) {
    items[index] = {
      ...items[index],
      status: 'sold',
      soldAt: completedAt
    };
    saveItems(items);
    return items[index];
  }
  return null;
}

// ========== Review Functions ==========

/**
 * Get all reviews
 * @returns {Review[]}
 */
function getReviews() {
  return getStorage(STORAGE_KEYS.REVIEWS, []);
}

/**
 * Save reviews
 * @param {Review[]} reviews
 */
function saveReviews(reviews) {
  setStorage(STORAGE_KEYS.REVIEWS, reviews);
}

/**
 * Create a review
 * @param {Partial<Review>} reviewData
 * @returns {Review}
 */
function createReview(reviewData) {
  const reviews = getReviews();
  const review = {
    id: generateId('rv'),
    createdAt: new Date().toISOString(),
    ...reviewData
  };
  
  reviews.push(review);
  saveReviews(reviews);
  return review;
}

/**
 * Get reviews by item ID
 * @param {string} itemId
 * @returns {Review[]}
 */
function getReviewsByItem(itemId) {
  const reviews = getReviews();
  return reviews.filter(r => String(r.itemId) === String(itemId));
}

/**
 * Get reviews for a user (as the reviewed party)
 * @param {string} userId
 * @returns {Review[]}
 */
function getReviewsForUser(userId) {
  const reviews = getReviews();
  return reviews.filter(r => String(r.toUserId) === String(userId));
}

/**
 * Get review by user and transaction
 * @param {string} fromUserId
 * @param {string} transactionId
 * @returns {Review|null}
 */
function getReviewByUserAndTransaction(fromUserId, transactionId) {
  const reviews = getReviews();
  return reviews.find(r => 
    String(r.fromUserId) === String(fromUserId) &&
    String(r.transactionId) === String(transactionId)
  ) || null;
}

// ========== Cart Functions ==========

/**
 * Get cart items
 * @returns {Array<{itemId: string, quantity: number}>}
 */
function getCartItems() {
  return getStorage(STORAGE_KEYS.CART, []);
}

/**
 * Save cart items
 * @param {Array} cartItems
 */
function saveCartItems(cartItems) {
  setStorage(STORAGE_KEYS.CART, cartItems);
}

/**
 * Add item to cart
 * @param {string} itemId
 * @param {number} quantity
 * @returns {boolean}
 */
function addToCart(itemId, quantity = 1) {
  const cart = getCartItems();
  const existingItem = cart.find(c => String(c.itemId) === String(itemId));
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ itemId: String(itemId), quantity: quantity });
  }
  
  saveCartItems(cart);
  return true;
}

/**
 * Remove item from cart
 * @param {string} itemId
 */
function removeFromCart(itemId) {
  const cart = getCartItems();
  const filtered = cart.filter(c => String(c.itemId) !== String(itemId));
  saveCartItems(filtered);
}

/**
 * Update cart item quantity
 * @param {string} itemId
 * @param {number} quantity
 */
function updateCartItemQuantity(itemId, quantity) {
  const cart = getCartItems();
  const item = cart.find(c => String(c.itemId) === String(itemId));
  
  if (item) {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      item.quantity = quantity;
      saveCartItems(cart);
    }
  }
}

/**
 * Clear cart
 */
function clearCart() {
  saveCartItems([]);
}

/**
 * Get cart item count
 * @returns {number}
 */
function getCartItemCount() {
  const cart = getCartItems();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Initialize on load
if (typeof window !== 'undefined') {
  seedDemoData();
}


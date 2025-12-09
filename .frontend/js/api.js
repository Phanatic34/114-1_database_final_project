/**
 * API 工具模組
 * 用於與後端 API 通訊（JWT 版本）
 */

// API 基礎配置
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * 取得儲存的 JWT token
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem('jwt_token');
}

/**
 * 設定 JWT token
 * @param {string} token
 */
function setToken(token) {
    localStorage.setItem('jwt_token', token);
}

/**
 * 移除 JWT token（登出）
 */
function removeToken() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('currentUserId');
}

/**
 * 取得儲存的 user_id（從 token 或 localStorage）
 * @returns {string|null}
 */
function getUserId() {
    // 優先從 token 取得（如果需要解析）
    const token = getToken();
    if (token) {
        try {
            // JWT token 的 payload 是 base64 編碼的
            const payload = JSON.parse(atob(token.split('.')[1]));
            return String(payload.user_id);
        } catch (e) {
            // 如果解析失敗，使用 localStorage 中的 userId
        }
    }
    return localStorage.getItem('userId');
}

/**
 * 設定 user_id（向後兼容）
 * @param {number|string} userId
 */
function setUserId(userId) {
    localStorage.setItem('userId', String(userId));
}

/**
 * 通用 API 呼叫函數
 * @param {string} endpoint - API 端點（例如：'/products'）
 * @param {string} method - HTTP 方法（GET, POST, PUT, DELETE）
 * @param {object|null} data - 請求資料（POST/PUT 時使用）
 * @param {boolean} requiresAuth - 是否需要認證（需要 JWT token）
 * @returns {Promise<object>}
 */
async function apiCall(endpoint, method = 'GET', data = null, requiresAuth = false) {
    let url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // 如果需要認證，添加 JWT token
    if (requiresAuth) {
        const token = getToken();
        if (!token) {
            throw new Error('需要先登入');
        }
        // 添加到 Authorization header
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 如果有資料，添加到 body
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        // 檢查回應是否為 JSON
        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            console.error('API 回應不是 JSON:', text);
            throw new Error(`伺服器回應錯誤: ${response.status} ${response.statusText}`);
        }
        
        // 如果 token 過期，清除並重新導向登入
        if (response.status === 401 && result.error && result.error.includes('token')) {
            removeToken();
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            }
            throw new Error('登入已過期，請重新登入');
        }
        
        if (!response.ok) {
            throw new Error(result.error || result.message || `請求失敗 (${response.status})`);
        }
        
        return result;
    } catch (error) {
        console.error('API 呼叫錯誤:', error);
        // 如果是網路錯誤，提供更清楚的訊息
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('無法連接到伺服器，請確認後端服務是否運行');
        }
        throw error;
    }
}

// ========== 認證相關 API ==========

/**
 * 註冊使用者
 * @param {object} userData - {user_name, student_id, email, password, phone}
 * @returns {Promise<object>}
 */
async function registerUser(userData) {
    return await apiCall('/auth/register', 'POST', userData);
}

/**
 * 登入使用者
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
async function loginUser(email, password) {
    const result = await apiCall('/auth/login', 'POST', { email, password });
    // 儲存 JWT token
    if (result.token) {
        setToken(result.token);
        console.log('已儲存 JWT token');
    }
    // 向後兼容：也儲存 user_id 和 userInfo
    if (result.user_id) {
        setUserId(result.user_id);
    }
    if (result.user) {
        localStorage.setItem('userInfo', JSON.stringify(result.user));
        localStorage.setItem('currentUserId', String(result.user_id));
    }
    return result;
}

/**
 * 登出使用者
 */
function logoutUser() {
    removeToken();
    // 清除所有相關資料
    console.log('已清除登入資訊');
}

/**
 * 取得當前使用者資訊（從 token 或 localStorage）
 * @returns {Promise<object|null>}
 */
async function getCurrentUserInfo() {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        try {
            return JSON.parse(userInfo);
        } catch (e) {
            console.error('無法解析使用者資訊:', e);
        }
    }
    return null;
}

// ========== 商品相關 API ==========

/**
 * 取得商品列表
 * @param {object} filters - {status, category_id, search, trade_option}
 * @returns {Promise<Array>}
 */
async function getProducts(filters = {}) {
    let endpoint = '/products';
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.search) params.append('search', filters.search);
    if (filters.trade_option) params.append('trade_option', filters.trade_option);
    
    if (params.toString()) {
        endpoint += '?' + params.toString();
    }
    
    return await apiCall(endpoint, 'GET');
}

/**
 * 取得單一商品
 * @param {number} productId
 * @returns {Promise<object>}
 */
async function getProduct(productId) {
    return await apiCall(`/products/${productId}`, 'GET');
}

/**
 * 建立新商品
 * @param {object} productData
 * @returns {Promise<object>}
 */
async function createProduct(productData) {
    return await apiCall('/products', 'POST', productData, true);
}

/**
 * 更新商品
 * @param {string} productId
 * @param {object} productData
 * @returns {Promise<object>}
 */
async function updateProduct(productId, productData) {
    return await apiCall(`/products/${productId}`, 'PUT', productData, true);
}

/**
 * 刪除商品
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function deleteProduct(productId) {
    return await apiCall(`/products/${productId}`, 'DELETE', null, true);
}

// ========== 交易請求相關 API ==========

/**
 * 建立交易請求
 * @param {object} requestData - {itemId, sellerId, buyerId, type, quantity, offeredItemId, note}
 * @returns {Promise<object>}
 */
async function createTradeRequest(requestData) {
    return await apiCall('/trade-requests', 'POST', requestData, true);
}

/**
 * 取得交易請求
 * @param {object} params - 查詢參數 (e.g., { user_id: 'u1', type: 'incoming' })
 * @returns {Promise<object[]>}
 */
async function getTradeRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await apiCall(`/trade-requests${queryString ? `?${queryString}` : ''}`, 'GET', null, true);
}

/**
 * 接受交易請求
 * @param {string} requestId
 * @returns {Promise<object>}
 */
async function acceptTradeRequest(requestId) {
    return await apiCall(`/trade-requests/${requestId}/accept`, 'POST', null, true);
}

/**
 * 拒絕交易請求
 * @param {string} requestId
 * @returns {Promise<object>}
 */
async function rejectTradeRequest(requestId) {
    return await apiCall(`/trade-requests/${requestId}/reject`, 'POST', null, true);
}

/**
 * 取消交易請求
 * @param {string} requestId
 * @returns {Promise<object>}
 */
async function cancelTradeRequest(requestId) {
    return await apiCall(`/trade-requests/${requestId}/cancel`, 'POST', null, true);
}

// ========== 交易紀錄相關 API ==========

/**
 * 取得交易紀錄
 * @param {object} params - 查詢參數 (e.g., { user_id: 'u1' })
 * @returns {Promise<object[]>}
 */
async function getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await apiCall(`/transactions${queryString ? `?${queryString}` : ''}`, 'GET', null, true);
}

/**
 * 完成交易
 * @param {string} transactionId
 * @param {object} data - { userId, role }
 * @returns {Promise<object>}
 */
async function completeTransaction(transactionId, data) {
    return await apiCall(`/transactions/${transactionId}/complete`, 'POST', data, true);
}

// ========== 評價相關 API ==========

/**
 * 建立評價
 * @param {object} reviewData - {itemId, transactionId, fromUserId, toUserId, rating, comment}
 * @returns {Promise<object>}
 */
async function createReview(reviewData) {
    return await apiCall('/reviews', 'POST', reviewData, true);
}

/**
 * 取得使用者評價
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserReviews(userId) {
    return await apiCall(`/reviews/user/${userId}`, 'GET', null, true);
}

// ========== 訊息相關 API ==========

/**
 * 傳送訊息
 * @param {object} messageData - {itemId, senderId, receiverId, text}
 * @returns {Promise<object>}
 */
async function sendMessage(messageData) {
    return await apiCall('/messages', 'POST', messageData, true);
}

/**
 * 取得訊息
 * @param {object} params - { itemId, user1Id, user2Id }
 * @returns {Promise<object[]>}
 */
async function getMessages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await apiCall(`/messages${queryString ? `?${queryString}` : ''}`, 'GET', null, true);
}

// ========== 檢舉相關 API ==========

/**
 * 建立檢舉
 * @param {object} reportData - {reporterId, reportedItemId, reportedUserId, reason, description}
 * @returns {Promise<object>}
 */
async function createReport(reportData) {
    return await apiCall('/reports', 'POST', reportData, true);
}

// 匯出所有函數
window.api = {
    // 認證
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUserInfo,
    getUserId,
    setUserId,
    getToken,
    setToken,
    removeToken,
    
    // 商品
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    
    // 交易請求
    createTradeRequest,
    getTradeRequests,
    acceptTradeRequest,
    rejectTradeRequest,
    cancelTradeRequest,
    
    // 交易紀錄
    getTransactions,
    completeTransaction,
    
    // 評價
    createReview,
    getUserReviews,
    
    // 訊息
    sendMessage,
    getMessages,
    
    // 檢舉
    createReport,
    
    // 通用
    apiCall
};

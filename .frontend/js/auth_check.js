/**
 * 統一的登入檢查模組
 * 在所有頁面載入時立即檢查登入狀態
 * 版本: 2.0 (加入快取處理)
 */

(function() {
  'use strict';
  
  // 強制清除舊版本快取的標記
  const CACHE_VERSION = 'v2.0';
  const CACHE_KEY = 'app_cache_version';
  
  // 檢查並清除舊快取
  const storedVersion = localStorage.getItem(CACHE_KEY);
  if (storedVersion !== CACHE_VERSION) {
    console.log('檢測到新版本，清除舊快取...');
    // 清除所有舊的登入相關快取
    localStorage.removeItem('userId');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('currentUserId');
    localStorage.setItem(CACHE_KEY, CACHE_VERSION);
  }
  
  // 等待所有腳本載入完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    // DOM 已經載入，立即檢查
    setTimeout(checkAuth, 100);
  }
  
  function checkAuth() {
    // 檢查是否有登入狀態（優先檢查 JWT token）
    let hasToken = null;
    let hasUserId = null;
    let hasUserInfo = null;
    let hasCurrentUserId = null;
    
    try {
      hasToken = localStorage.getItem('jwt_token');
      hasUserId = localStorage.getItem('userId');
      hasUserInfo = localStorage.getItem('userInfo');
      hasCurrentUserId = localStorage.getItem('currentUserId');
    } catch (e) {
      console.error('無法讀取 localStorage:', e);
      // 如果無法讀取，可能是隱私模式或快取問題
      return true; // 不跳轉，讓頁面正常載入
    }
    
    // 如果沒有任何登入狀態，且不在登入/註冊頁面，則跳轉
    if (!hasToken && !hasUserId && !hasUserInfo && !hasCurrentUserId) {
      const currentPage = window.location.pathname;
      const isAuthPage = currentPage.includes('login.html') || currentPage.includes('register.html');
      
      if (!isAuthPage) {
        const redirectUrl = window.location.href;
        window.location.href = `login.html?redirect=${encodeURIComponent(redirectUrl)}`;
        return false;
      }
    }
    
    return true;
  }
})();


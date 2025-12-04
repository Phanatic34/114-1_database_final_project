/**
 * Shared Navbar Component
 * Updates navbar based on login state
 */

function updateNavbar() {
  const user = getCurrentUser();
  const headerActions = document.querySelector('.header-actions');
  
  if (!headerActions) return;
  
  // Clear existing content (but keep header-search if it exists)
  const headerSearch = headerActions.querySelector('.header-search');
  headerActions.innerHTML = '';
  
  // Re-add header search if it existed
  if (headerSearch) {
    headerActions.appendChild(headerSearch);
  }
  
  // Create nav-right container
  const navRight = document.createElement('div');
  navRight.className = 'nav-right';
  
  // Cart icon button (as button, not link, to show dropdown)
  const cartButton = document.createElement('button');
  cartButton.type = 'button';
  cartButton.className = 'nav-icon-button nav-cart-button';
  cartButton.setAttribute('aria-label', '購物車');
  cartButton.id = 'navCartButton';
  cartButton.innerHTML = `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h-2a1 1 0 0 0 0 2h1.1l1.4 9.2A2 2 0 0 0 9.5 17h8.2a2 2 0 0 0 2-1.7L21 7H8.4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="18" cy="19" r="1.3" />
    </svg>
    <span class="sr-only">購物車</span>
  `;
  navRight.appendChild(cartButton);
  
  // Cart dropdown menu
  const cartMenu = document.createElement('div');
  cartMenu.className = 'header-dropdown-panel nav-cart-menu';
  cartMenu.id = 'navCartMenu';
  cartMenu.setAttribute('hidden', 'hidden');
  cartMenu.innerHTML = `
    <div class="dropdown-panel-header">
      <h3 class="dropdown-panel-title">購物車</h3>
    </div>
    <div class="dropdown-panel-content">
      <p class="dropdown-panel-empty">目前購物車沒有商品</p>
    </div>
    <div class="dropdown-panel-footer">
      <a href="cart.html" class="dropdown-panel-button">前往購物車</a>
    </div>
  `;
  navRight.appendChild(cartMenu);
  
  // Profile icon button
  const profileButton = document.createElement('button');
  profileButton.type = 'button';
  profileButton.className = 'nav-icon-button nav-profile-button';
  profileButton.setAttribute('aria-label', '我的帳號');
  profileButton.id = 'navProfileButton';
  profileButton.innerHTML = `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="3.4" />
      <path d="M6 18.5a5.8 5.8 0 0 1 6-4.2 5.8 5.8 0 0 1 6 4.2" />
    </svg>
    <span class="sr-only">我的帳號</span>
  `;
  navRight.appendChild(profileButton);
  
  // Profile dropdown menu
  const profileMenu = document.createElement('div');
  profileMenu.className = 'header-dropdown-panel nav-profile-menu';
  profileMenu.id = 'navProfileMenu';
  profileMenu.setAttribute('hidden', 'hidden');
  
  if (user) {
    // User is logged in - show account menu items
    profileMenu.innerHTML = `
      <div class="dropdown-panel-header">
        <h3 class="dropdown-panel-title">我的帳號</h3>
      </div>
      <div class="dropdown-panel-content">
        <a href="my_items.html" class="dropdown-item">我的商品</a>
        <a href="requests.html" class="dropdown-item">交易請求</a>
        <a href="transactions.html" class="dropdown-item">交易紀錄</a>
        <a href="messages.html" class="dropdown-item">訊息</a>
        <a href="account.html" class="dropdown-item">帳號管理</a>
        <button class="dropdown-item logout-btn" id="logoutBtn">登出</button>
      </div>
    `;
    
    // Logout handler
    setTimeout(() => {
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          logoutUser();
          window.location.href = 'index.html';
        });
      }
    }, 0);
  } else {
    // User is not logged in - show login/register
    profileMenu.innerHTML = `
      <div class="dropdown-panel-header">
        <h3 class="dropdown-panel-title">我的帳號</h3>
      </div>
      <div class="dropdown-panel-content">
        <a href="login.html" class="dropdown-item">登入</a>
        <a href="register.html" class="dropdown-item">註冊</a>
      </div>
    `;
  }
  
  navRight.appendChild(profileMenu);
  headerActions.appendChild(navRight);
  
  // Add dropdown toggle for cart
  if (cartButton && cartMenu) {
    cartButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close profile menu if open
      if (profileMenu) profileMenu.setAttribute('hidden', 'hidden');
      const isHidden = cartMenu.hasAttribute('hidden');
      if (isHidden) {
        cartMenu.removeAttribute('hidden');
      } else {
        cartMenu.setAttribute('hidden', 'hidden');
      }
    });
  }
  
  // Add dropdown toggle for profile
  if (profileButton && profileMenu) {
    profileButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close cart menu if open
      if (cartMenu) cartMenu.setAttribute('hidden', 'hidden');
      const isHidden = profileMenu.hasAttribute('hidden');
      if (isHidden) {
        profileMenu.removeAttribute('hidden');
      } else {
        profileMenu.setAttribute('hidden', 'hidden');
      }
    });
  }
  
  // Click outside to close both dropdowns
  document.addEventListener('click', (e) => {
    if (cartMenu && !cartMenu.contains(e.target) && !cartButton.contains(e.target)) {
      cartMenu.setAttribute('hidden', 'hidden');
    }
    if (profileMenu && !profileMenu.contains(e.target) && !profileButton.contains(e.target)) {
      profileMenu.setAttribute('hidden', 'hidden');
    }
  });
}

// Add CSS for navbar icons and dropdown
function addNavbarStyles() {
  if (document.getElementById('navbar-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'navbar-styles';
  style.textContent = `
    .header-actions {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .nav-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .nav-icon-button {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.45);
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      cursor: pointer;
      padding: 0;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .nav-icon-button:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.85);
    }
    
    .nav-icon {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
    }
    
    /* screen-reader-only text */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    .nav-right {
      position: relative;
    }
    
    /* Common dropdown panel styles - override header white color */
    .header-dropdown-panel {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      min-width: 260px;
      background: #ffffff !important;
      color: #222222 !important;
      border-radius: 16px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
      padding: 16px 20px;
      z-index: 100;
    }
    
    .header-dropdown-panel * {
      color: inherit;
    }
    
    .nav-cart-menu {
      right: 0;
    }
    
    .nav-profile-menu {
      right: 0;
    }
    
    .dropdown-panel-header {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #111827 !important;
    }
    
    .dropdown-panel-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827 !important;
      margin: 0;
    }
    
    .dropdown-panel-content {
      color: #111827 !important;
    }
    
    .dropdown-panel-content * {
      color: #111827 !important;
    }
    
    .dropdown-panel-empty {
      font-size: 14px;
      color: #6b7280 !important;
      margin: 0;
      text-align: center;
      padding: 20px 0;
    }
    
    .dropdown-panel-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      color: #111827 !important;
    }
    
    .dropdown-panel-button {
      display: block;
      width: 100%;
      padding: 10px 16px;
      text-align: center;
      background: #2563eb !important;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
      border: none;
      cursor: pointer;
    }
    
    .dropdown-panel-button:hover {
      background: #1d4ed8 !important;
      color: #ffffff !important;
    }
    
    .dropdown-item {
      display: block;
      width: 100%;
      padding: 10px 0;
      text-align: left;
      color: #111827 !important;
      text-decoration: none;
      font-size: 14px;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 4px;
    }
    
    .dropdown-item:hover {
      background: #f3f4f6;
      color: #111827 !important;
    }
    
    .logout-btn {
      border-top: 1px solid #e5e7eb;
      margin-top: 8px;
      padding-top: 12px;
      color: #dc2626 !important;
    }
    
    .logout-btn:hover {
      background: #fee2e2;
      color: #dc2626 !important;
    }
  `;
  document.head.appendChild(style);
}

// Initialize navbar on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    addNavbarStyles();
    updateNavbar();
  });
}


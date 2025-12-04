/**
 * Shared Navbar Component
 * Updates navbar based on login state
 */

function updateNavbar() {
  const user = getCurrentUser();
  const headerActions = document.querySelector('.header-actions');
  
  if (!headerActions) return;
  
  // Clear existing content
  headerActions.innerHTML = '';
  
  if (user) {
    // User is logged in - show user dropdown
    const userDropdown = document.createElement('div');
    userDropdown.className = 'user-dropdown';
    userDropdown.innerHTML = `
      <button class="user-dropdown-btn" id="userDropdownBtn">
        <span>使用者：${user.name}</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="user-dropdown-menu" id="userDropdownMenu" hidden>
        <a href="my_items.html" class="dropdown-item">我的商品</a>
        <a href="requests.html" class="dropdown-item">交易請求</a>
        <a href="transactions.html" class="dropdown-item">交易紀錄</a>
        <a href="messages.html" class="dropdown-item">訊息</a>
        <a href="account.html" class="dropdown-item">帳號管理</a>
        <button class="dropdown-item logout-btn" id="logoutBtn">登出</button>
      </div>
    `;
    headerActions.appendChild(userDropdown);
    
    // Add dropdown toggle
    const dropdownBtn = document.getElementById('userDropdownBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.hidden = !dropdownMenu.hidden;
      });
      
      // Close on outside click
      document.addEventListener('click', () => {
        dropdownMenu.hidden = true;
      });
    }
    
    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logoutUser();
        window.location.href = 'index.html';
      });
    }
  } else {
    // User is not logged in - show login/register buttons
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.textContent = '登入';
    headerActions.appendChild(loginLink);
    
    const registerLink = document.createElement('a');
    registerLink.href = 'register.html';
    registerLink.textContent = '註冊';
    headerActions.appendChild(registerLink);
  }
}

// Add CSS for user dropdown
function addNavbarStyles() {
  if (document.getElementById('navbar-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'navbar-styles';
  style.textContent = `
    .user-dropdown {
      position: relative;
    }
    
    .user-dropdown-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .user-dropdown-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .dropdown-arrow {
      font-size: 10px;
    }
    
    .user-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 160px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
      padding: 6px 0;
      z-index: 100;
    }
    
    .dropdown-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      text-align: left;
      color: #111827;
      text-decoration: none;
      font-size: 14px;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .dropdown-item:hover {
      background: #f3f4f6;
    }
    
    .logout-btn {
      border-top: 1px solid #e5e7eb;
      margin-top: 4px;
      padding-top: 12px;
      color: #dc2626;
    }
    
    .logout-btn:hover {
      background: #fee2e2;
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


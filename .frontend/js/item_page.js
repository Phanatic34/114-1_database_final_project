/**
 * Item Detail Page JavaScript
 * Handles item loading, rendering, and interactions
 */

// Global variables
let currentItem = null;
let selectedItemId = null;

// Get current item ID from URL
function getCurrentItemId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Get item ID from URL (alias for getCurrentItemId)
function getQueryId() {
  return getCurrentItemId();
}

// Render item not found page
function renderItemNotFound(reason) {
  const root = document.querySelector('.item-page-main') || document.body;
  root.innerHTML = `
    <div style="padding: 40px; text-align: center;">
      <h1>商品不存在</h1>
      <p style="margin-top: 8px; color: #666;">${reason || '找不到指定的商品'}</p>
      <p style="margin-top: 16px;"><a href="index.html">回到首頁</a></p>
    </div>
  `;
}

// Normalize tags - convert various formats to array
function normalizeTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  // Allow comma or space separated strings
  return String(raw)
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Render item tags in header
function renderItemTags(container, rawTags) {
  if (!container) return;
  container.innerHTML = '';

  const tags = normalizeTags(rawTags);
  if (!tags.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  tags.forEach((tag) => {
    const span = document.createElement('span');
    span.className = 'item-tag-pill';
    span.textContent = tag;
    container.appendChild(span);
  });
}

// Normalize item format for compatibility
function normalizeItem(item) {
  // Convert new format to old format for display compatibility
  if (item.modes) {
    item.mode = {
      purchase: item.modes.sale || false,
      trade: item.modes.tradeTarget || item.modes.tradeOpen || false,
      wish: item.modes.tradeOpen || false,
      tradeMode: item.modes.tradeTarget && item.modes.tradeOpen ? 'both' :
                item.modes.tradeTarget ? 'target' :
                item.modes.tradeOpen ? 'offer' : null,
      tradeSummary: item.tradeTargetNote || ''
    };
  }

  // Ensure tags is always an array
  if (!item.tags || !Array.isArray(item.tags)) {
    item.tags = [];
  }

  // Convert description from string to object format if needed
  if (typeof item.description === 'string') {
    item.description = {
      main: item.description,
      includes: [],
      conditionDetails: [],
      extra: ''
    };
  }

  // Ensure stats object exists
  if (!item.stats) {
    item.stats = {
      views: item.views || 0,
      watchers: item.addedToCartCount || 0
    };
  }

  // Ensure pickup object exists
  if (!item.pickup) {
    item.pickup = {
      type: '面交',
      place: item.location || '未指定',
      time: '時間可議'
    };
  }

  // Ensure status exists (default to 'active')
  if (!item.status) {
    item.status = 'active';
  }

  return item;
}

// Render item header (title only, tags moved to description section)
function renderItemHeader(item) {
  const titleEl = document.getElementById('itemTitle');

  if (titleEl) {
    titleEl.textContent = item.title || '未命名商品';
  }

  // Tags are now rendered in the description section, not in the header
}

// Helper: Get days since a date string
function getDaysSince(dateStr) {
  if (!dateStr) return Infinity;
  const now = new Date();
  const d = new Date(dateStr);
  return (now - d) / (1000 * 60 * 60 * 24);
}

// Populate entire item page
function populateItemPage() {
  if (!currentItem) return;

  // Title and tags
  renderItemHeader(currentItem);

  // Update breadcrumb with category name
  const breadcrumbCategory = document.getElementById('breadcrumbCategory');
  if (breadcrumbCategory && currentItem.category) {
    const normalizedCategory = typeof normalizeCategory !== 'undefined' ? normalizeCategory(currentItem.category) : currentItem.category;
    breadcrumbCategory.textContent = normalizedCategory;
    const categoryMap = {
      '課本／學習用品': 'textbooks',
      '筆電／3C': 'laptop_3c',
      '手機／平板': 'phone_tablet',
      '遊戲與主機': 'game_console',
      '宿舍家電與家具': 'dorm_furniture',
      '服飾／生活用品': 'clothing_life',
      '運動／興趣嗜好': 'sports_hobby',
      '其他': 'others'
    };
    const categoryId = categoryMap[normalizedCategory] || 'others';
    breadcrumbCategory.href = `item_list.html?category=${categoryId}`;
  }

  // Seller info
  if (currentItem.seller && currentItem.seller.name) {
    const sellerNameEl = document.getElementById('sellerName');
    const sellerCountEl = document.getElementById('sellerCount');
    const sellerRatingTextEl = document.getElementById('sellerRatingText');
    const sellerAvatarEl = document.getElementById('sellerAvatar');

    if (sellerNameEl) sellerNameEl.textContent = currentItem.seller.name;
    if (sellerCountEl) sellerCountEl.textContent = `(${currentItem.seller.deals || 0})`;
    if (sellerRatingTextEl) sellerRatingTextEl.textContent = currentItem.seller.ratingText || '無評價';

    if (sellerAvatarEl) {
      const avatarSpan = sellerAvatarEl.querySelector('span');
      if (avatarSpan && currentItem.seller.name) {
        avatarSpan.textContent = currentItem.seller.name[0].toUpperCase();
      }
    }

    const sellerViewItemsButton = document.getElementById('sellerViewItemsButton');
    if (sellerViewItemsButton) {
      sellerViewItemsButton.addEventListener('click', () => {
        window.location.href = `item_list.html?seller=${encodeURIComponent(currentItem.seller.name)}`;
      });
    }
  } else {
    // Fallback if seller info is missing
    if (currentItem.sellerId) {
      const seller = getUsers().find(u => u.id === currentItem.sellerId);
      if (seller) {
        currentItem.seller = {
          name: seller.name,
          rating: 4.8,
          ratingText: '99.9% 好評',
          deals: 0
        };
        const sellerNameEl = document.getElementById('sellerName');
        const sellerCountEl = document.getElementById('sellerCount');
        const sellerRatingTextEl = document.getElementById('sellerRatingText');
        const sellerAvatarEl = document.getElementById('sellerAvatar');

        if (sellerNameEl) sellerNameEl.textContent = currentItem.seller.name;
        if (sellerCountEl) sellerCountEl.textContent = `(${currentItem.seller.deals || 0})`;
        if (sellerRatingTextEl) sellerRatingTextEl.textContent = currentItem.seller.ratingText || '無評價';

        if (sellerAvatarEl) {
          const avatarSpan = sellerAvatarEl.querySelector('span');
          if (avatarSpan) {
            avatarSpan.textContent = currentItem.seller.name[0].toUpperCase();
          }
        }
      } else {
        const sellerNameEl = document.getElementById('sellerName');
        if (sellerNameEl) sellerNameEl.textContent = '未知賣家';
      }
    } else {
      const sellerNameEl = document.getElementById('sellerName');
      if (sellerNameEl) sellerNameEl.textContent = '未知賣家';
    }
  }

  // Condition badge
  const conditionBadge = document.getElementById('conditionBadge');
  const itemCondition = document.getElementById('itemCondition');
  if (conditionBadge) conditionBadge.textContent = currentItem.condition;
  if (itemCondition) itemCondition.textContent = currentItem.condition;

  // Location
  const itemLocation = document.getElementById('itemLocation');
  if (itemLocation) itemLocation.textContent = currentItem.location;

  // Hide tags from old location in 商品資訊 section
  const tagsContainer = document.getElementById('itemTags');
  if (tagsContainer) {
    const tagsRowElement = tagsContainer.closest('.item-info-row');
    if (tagsRowElement) {
      tagsRowElement.style.display = 'none';
    }
  }

  // Images
  const mainImage = document.getElementById('main-image');
  if (mainImage) {
    setProductImage(mainImage, currentItem);
    mainImage.alt = currentItem.title;

    const thumbnailContainer = document.querySelector('.item-thumbnails');
    if (thumbnailContainer) {
      thumbnailContainer.innerHTML = '';
      // Use item's images array if available, otherwise generate one image
      let imagesToUse = [];
      if (currentItem.images && currentItem.images.length > 0) {
        // Filter out placeholder URLs and use helper for each
        imagesToUse = currentItem.images.map((img, idx) => {
          if (img && !img.includes('via.placeholder.com') && !img.includes('9c3aaf7')) {
            return img; // Use existing valid URL
          }
          // Generate AI image for this specific view (add index to make it unique)
          return getProductImageUrl(currentItem.title + ' view ' + (idx + 1));
        });
      } else {
        // Generate a single AI image
        imagesToUse = [getProductImageUrl(currentItem)];
      }
      
      imagesToUse.forEach((imgUrl, index) => {
        const button = document.createElement('button');
        button.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        button.onclick = () => changeImage(index);
        const thumbImg = document.createElement('img');
        thumbImg.src = imgUrl;
        thumbImg.alt = `View ${index + 1}`;
        attachImageFallback(thumbImg);
        button.appendChild(thumbImg);
        thumbnailContainer.appendChild(button);
      });
      
      // Update the images array for changeImage function
      window.currentItemImages = imagesToUse;
    }
  }

  // Update image gallery function to use currentItem images (already set above)

  // Price
  const actionPrice = document.getElementById('actionPrice');
  if (currentItem.mode && currentItem.mode.purchase && actionPrice) {
    actionPrice.textContent = `NT$ ${currentItem.price.toLocaleString('zh-TW')}`;
  }

  // Mode badges
  const badgesContainer = document.getElementById('tradeModeBadges');
  if (badgesContainer) {
    badgesContainer.innerHTML = '';
    if (currentItem.mode && currentItem.mode.purchase) {
      const badge = document.createElement('span');
      badge.className = 'badge mode-sale';
      badge.textContent = '販售中';
      badgesContainer.appendChild(badge);
    }
    if (currentItem.mode && currentItem.mode.trade) {
      const badge = document.createElement('span');
      badge.className = 'badge mode-trade';
      if (currentItem.mode.tradeMode === 'target') {
        badge.textContent = '可交換（指定目標）';
      } else if (currentItem.mode.tradeMode === 'offer') {
        badge.className = 'badge mode-wish';
        badge.textContent = '開放式許願';
      } else {
        badge.textContent = '可交換（指定目標）';
        const badge2 = document.createElement('span');
        badge2.className = 'badge mode-wish';
        badge2.textContent = '開放式許願';
        badgesContainer.appendChild(badge2);
      }
      badgesContainer.appendChild(badge);
    }
    if (currentItem.mode.wish && !currentItem.mode.trade) {
      const badge = document.createElement('span');
      badge.className = 'badge mode-wish';
      badge.textContent = '開放式許願';
      badgesContainer.appendChild(badge);
    }
  }

  // Trade rule card
  const tradeRuleBody = document.getElementById('tradeRuleBody');
  const tradeRuleCard = document.getElementById('tradeRuleCard');
  if (currentItem.mode.trade && currentItem.mode.tradeSummary) {
    if (tradeRuleBody) {
      tradeRuleBody.innerHTML = `<p><strong>想換：</strong>${currentItem.mode.tradeSummary}</p>`;
      if (currentItem.mode.tradeMode === 'offer' || currentItem.mode.tradeMode === 'both') {
        tradeRuleBody.innerHTML += '<p>也接受開放交換，買家可提出任何商品提案</p>';
      }
    }
    if (tradeRuleCard) tradeRuleCard.style.display = 'block';
  } else {
    if (tradeRuleCard) tradeRuleCard.style.display = 'none';
  }

  // Description
  const descContainer = document.getElementById('itemDescription');
  if (descContainer) {
    descContainer.innerHTML = '';

    if (typeof currentItem.description === 'string') {
      const mainP = document.createElement('p');
      mainP.textContent = currentItem.description;
      descContainer.appendChild(mainP);
    } else if (currentItem.description && typeof currentItem.description === 'object') {
      if (currentItem.description.main) {
        const mainP = document.createElement('p');
        mainP.textContent = currentItem.description.main;
        descContainer.appendChild(mainP);
      }

      if (currentItem.description.includes && currentItem.description.includes.length > 0) {
        const includesP = document.createElement('p');
        includesP.innerHTML = '<strong>包含：</strong>';
        descContainer.appendChild(includesP);
        const includesUl = document.createElement('ul');
        currentItem.description.includes.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          includesUl.appendChild(li);
        });
        descContainer.appendChild(includesUl);
      }

      if (currentItem.description.conditionDetails && currentItem.description.conditionDetails.length > 0) {
        const conditionP = document.createElement('p');
        conditionP.innerHTML = '<strong>外觀狀況：</strong>';
        descContainer.appendChild(conditionP);
        const conditionUl = document.createElement('ul');
        currentItem.description.conditionDetails.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          conditionUl.appendChild(li);
        });
        descContainer.appendChild(conditionUl);
      }

      if (currentItem.description.extra) {
        const extraP = document.createElement('p');
        extraP.textContent = currentItem.description.extra;
        descContainer.appendChild(extraP);
      }
    }
  }

  // Tags in description section
  const descriptionTagsContainer = document.getElementById('item-description-tags');
  renderItemTags(descriptionTagsContainer, currentItem.tags);

  // Stats
  const viewStats = document.getElementById('viewStats');
  if (viewStats) {
    viewStats.textContent = `瀏覽次數：${currentItem.stats.views}　追蹤人數：${currentItem.stats.watchers}`;
  }

  // Pickup info
  const pickupInfo = document.getElementById('pickupInfo');
  if (pickupInfo) {
    pickupInfo.textContent = `${currentItem.pickup.type} | ${currentItem.pickup.place} | ${currentItem.pickup.time}`;
  }

  // Update trade modal requirement text
  const tradeReqText = document.getElementById('tradeRequirementText');
  if (tradeReqText && currentItem.mode.tradeSummary) {
    tradeReqText.textContent = currentItem.mode.tradeSummary;
  }

  // Update chat modal seller info
  const chatSellerName = document.getElementById('chatSellerName');
  const chatSellerAvatar = document.getElementById('chatSellerAvatar');
  if (chatSellerName) chatSellerName.textContent = currentItem.seller.name;
  if (chatSellerAvatar) chatSellerAvatar.textContent = currentItem.seller.name[0].toUpperCase();

  // Handle item status (reserved/sold) and show appropriate UI
  renderItemStatusUI();

  // Apply listing mode
  let listingMode = 'purchase_and_trade';
  if (!currentItem.mode.purchase && currentItem.mode.trade && !currentItem.mode.wish) {
    listingMode = 'trade_only';
  } else if (!currentItem.mode.purchase && currentItem.mode.wish) {
    listingMode = 'wish_only';
  }

  // Update mode handling
  const listingModeSummary = document.getElementById('listingModeSummary');
  const actionPriceBlock = document.getElementById('actionPriceBlock');
  // 購物車按鈕已移除
  const btnBuyNow = document.getElementById('btnBuyNow');
  const btnTrade = document.getElementById('btnTrade');
  const actionQuantity = document.querySelector('.action-quantity');

  if (listingMode === 'purchase_and_trade') {
    if (listingModeSummary) {
      listingModeSummary.textContent = '可購買・可交換';
    }
    if (actionPriceBlock) {
      actionPriceBlock.innerHTML = `
        <div class="purchase-card-header">
          <span class="action-price-label">價格</span>
          <button
            id="purchaseMoreBtn"
            class="purchase-more-btn"
            type="button"
            aria-label="更多選項"
          >
            ⋮
          </button>
          <div id="purchaseMoreMenu" class="purchase-more-menu" hidden>
            <button id="reportItemBtn" type="button" class="purchase-more-menu-item">
              檢舉商品
            </button>
          </div>
        </div>
        <div class="action-price">NT$ ${currentItem.price.toLocaleString('zh-TW')}</div>
      `;
      actionPriceBlock.style.display = 'block';
      attachPurchaseMenuListeners();
    }
    // 購物車按鈕已移除
    if (btnBuyNow) btnBuyNow.style.display = 'block';
    if (btnTrade) btnTrade.style.display = 'block';
    if (actionQuantity) actionQuantity.style.display = 'flex';
  } else if (listingMode === 'trade_only') {
    if (listingModeSummary) {
      listingModeSummary.textContent = '僅接受以物易物';
    }
    if (actionPriceBlock) {
      actionPriceBlock.innerHTML = `
        <div class="purchase-card-header">
          <span class="action-price-label">價格</span>
          <button
            id="purchaseMoreBtn"
            class="purchase-more-btn"
            type="button"
            aria-label="更多選項"
          >
            ⋮
          </button>
          <div id="purchaseMoreMenu" class="purchase-more-menu" hidden>
            <button id="reportItemBtn" type="button" class="purchase-more-menu-item">
              檢舉商品
            </button>
          </div>
        </div>
        <div class="action-price" style="color: #6b7280; font-size: 14px;">僅接受以物易物</div>
      `;
      actionPriceBlock.style.display = 'block';
      attachPurchaseMenuListeners();
    }
    // 購物車按鈕已移除
    if (btnBuyNow) btnBuyNow.style.display = 'none';
    if (btnTrade) btnTrade.style.display = 'block';
    if (actionQuantity) actionQuantity.style.display = 'none';
  } else if (listingMode === 'wish_only') {
    if (listingModeSummary) {
      listingModeSummary.textContent = '開放式許願';
    }
    if (actionPriceBlock) {
      actionPriceBlock.innerHTML = `
        <div class="purchase-card-header">
          <span class="action-price-label">價格</span>
          <button
            id="purchaseMoreBtn"
            class="purchase-more-btn"
            type="button"
            aria-label="更多選項"
          >
            ⋮
          </button>
          <div id="purchaseMoreMenu" class="purchase-more-menu" hidden>
            <button id="reportItemBtn" type="button" class="purchase-more-menu-item">
              檢舉商品
            </button>
          </div>
        </div>
        <div class="action-price" style="color: #6b7280; font-size: 14px;">開放式許願</div>
      `;
      actionPriceBlock.style.display = 'block';
      attachPurchaseMenuListeners();
    }
    // 購物車按鈕已移除
    if (btnBuyNow) btnBuyNow.style.display = 'none';
    if (btnTrade) {
      btnTrade.style.display = 'block';
      btnTrade.textContent = '提出交換提案';
    }
    if (actionQuantity) actionQuantity.style.display = 'none';
  }
}

// Helper function to get current user (compatible with both API and old system)
function getCurrentUserCompat() {
  // 優先檢查 userInfo (API 認證)
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
  
  // 檢查 API userId
  const apiUserId = localStorage.getItem('userId');
  if (apiUserId) {
    // 如果有 userId 但沒有 userInfo，嘗試從舊系統取得
    if (typeof getCurrentUser !== 'undefined') {
      const user = getCurrentUser();
      if (user) return user;
    }
  }
  
  // 回退到舊的方式
  if (typeof getCurrentUser !== 'undefined') {
    return getCurrentUser();
  }
  
  return null;
}

// Render item status UI (reserved/sold) and handoff section
function renderItemStatusUI() {
  if (!currentItem) return;
  
  const currentUser = getCurrentUserCompat();
  const itemStatus = currentItem.status || 'active';
  const actionButtonsGroup = document.getElementById('actionButtonsGroup');
  const handoffSection = document.getElementById('handoff-section');
  const handoffStatusText = document.getElementById('handoff-status-text');
  const btnConfirmHandoff = document.getElementById('btnConfirmHandoff');
  const itemTitle = document.getElementById('itemTitle');
  
  // Get active transaction if exists
  const tx = getActiveTransactionForItem(currentItem.id);
  
  // Handle reserved status
  if (itemStatus === 'reserved' && tx && tx.status === 'reserved') {
    const daysSince = getDaysSince(tx.reservedAt);
    const isSeller = currentUser && currentItem.sellerId && String(currentUser.id) === String(currentItem.sellerId);
    const isBuyer = currentUser && String(currentUser.id) === String(tx.buyerId);
    
    // Show reserved status near title
    if (itemTitle) {
      const buyer = getUsers().find(u => u.id === tx.buyerId);
      const buyerName = buyer ? buyer.name : '買家';
      const statusText = isSeller 
        ? `狀態：預約中（已保留給 ${buyerName}）`
        : isBuyer 
        ? `狀態：預約中（賣家已保留給你）`
        : `狀態：預約中（已由其他買家預約）`;
      
      // Add status indicator if not already present
      let statusEl = document.getElementById('item-status-indicator');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'item-status-indicator';
        statusEl.style.cssText = 'font-size: 14px; color: #2563eb; margin-top: 8px; font-weight: 500;';
        itemTitle.parentElement.insertBefore(statusEl, itemTitle.nextSibling);
      }
      statusEl.textContent = statusText;
    }
    
    // Hide action buttons for non-seller/non-buyer
    if (actionButtonsGroup && !isSeller && !isBuyer) {
      actionButtonsGroup.style.display = 'none';
      const messageBtn = document.getElementById('messageButtonMain');
      if (messageBtn) messageBtn.style.display = 'none';
      
      // Show message
      let reservedMsg = document.getElementById('reserved-message');
      if (!reservedMsg) {
        reservedMsg = document.createElement('div');
        reservedMsg.id = 'reserved-message';
        reservedMsg.style.cssText = 'padding: 16px; background: #fef3c7; border-radius: 8px; color: #92400e; text-align: center; margin-top: 16px;';
        reservedMsg.textContent = '此商品已由其他買家預約，暫不接受新的交易請求。';
        if (actionButtonsGroup.parentElement) {
          actionButtonsGroup.parentElement.insertBefore(reservedMsg, actionButtonsGroup);
        }
      }
    }
    
    // Show handoff section for seller or buyer
    if (handoffSection && (isSeller || isBuyer) && daysSince <= 7) {
      handoffSection.style.display = 'block';
      
      const sellerConfirmed = !!tx.sellerConfirmedAt;
      const buyerConfirmed = !!tx.buyerConfirmedAt;
      
      // Hide cancel transaction button when both parties confirmed handoff
      const cancelTxBtn = document.getElementById('cancelTxBtn');
      if (sellerConfirmed && buyerConfirmed) {
        if (cancelTxBtn) cancelTxBtn.style.display = 'none';
        if (handoffStatusText) handoffStatusText.textContent = '狀態：已完成面交';
        if (btnConfirmHandoff) {
          btnConfirmHandoff.disabled = true;
          btnConfirmHandoff.textContent = '雙方已確認';
        }
      } else if ((isSeller && sellerConfirmed) || (isBuyer && buyerConfirmed)) {
        if (cancelTxBtn) cancelTxBtn.style.display = 'none';
        if (handoffStatusText) handoffStatusText.textContent = '狀態：預約中（另一方尚未按「已面交」）';
        if (btnConfirmHandoff) {
          btnConfirmHandoff.disabled = true;
          btnConfirmHandoff.textContent = '已標記為已面交';
        }
      } else {
        // Only show cancel button if transaction is still pending (neither confirmed)
        if (cancelTxBtn && tx.status === 'reserved') {
          // Keep cancel button visible only for pending requests, not reserved transactions
          cancelTxBtn.style.display = 'none';
        }
        if (handoffStatusText) handoffStatusText.textContent = '狀態：預約中（等待雙方確認面交）';
        if (btnConfirmHandoff) {
          btnConfirmHandoff.disabled = false;
          btnConfirmHandoff.textContent = '已面交';
        }
      }
    } else if (handoffSection) {
      handoffSection.style.display = 'none';
    }
  } else if (itemStatus === 'sold') {
    // Item is sold - hide all action buttons
    if (actionButtonsGroup) actionButtonsGroup.style.display = 'none';
    if (handoffSection) handoffSection.style.display = 'none';
    
    const messageBtn = document.getElementById('messageButtonMain');
    if (messageBtn) messageBtn.style.display = 'none';
    
    // Hide cancel transaction button when item is sold
    const cancelTxBtn = document.getElementById('cancelTxBtn');
    if (cancelTxBtn) cancelTxBtn.style.display = 'none';
    
    // Show sold message
    let soldMsg = document.getElementById('sold-message');
    if (!soldMsg) {
      soldMsg = document.createElement('div');
      soldMsg.id = 'sold-message';
      soldMsg.style.cssText = 'padding: 16px; background: #ecfdf3; border-radius: 8px; color: #15803d; text-align: center; margin-top: 16px;';
      soldMsg.textContent = '此商品已完成交易。';
      if (actionButtonsGroup && actionButtonsGroup.parentElement) {
        actionButtonsGroup.parentElement.insertBefore(soldMsg, actionButtonsGroup);
      }
    }
    
    // Show review button if transaction is completed and user hasn't reviewed
    if (tx && tx.status === 'completed' && currentUser) {
      const isSeller = currentItem.sellerId && String(currentUser.id) === String(tx.sellerId);
      const isBuyer = String(currentUser.id) === String(tx.buyerId);
      
      if (isSeller || isBuyer) {
        const existingReview = getReviewByUserAndTransaction(currentUser.id, tx.id);
        if (!existingReview) {
          let reviewBtn = document.getElementById('btnOpenReview');
          if (!reviewBtn) {
            reviewBtn = document.createElement('button');
            reviewBtn.id = 'btnOpenReview';
            reviewBtn.className = 'item-action-button item-action-button-outline';
            reviewBtn.textContent = '為此次交易撰寫評價';
            reviewBtn.style.marginTop = '16px';
            reviewBtn.onclick = () => openReviewModal(tx);
            if (actionButtonsGroup && actionButtonsGroup.parentElement) {
              actionButtonsGroup.parentElement.insertBefore(reviewBtn, actionButtonsGroup);
            }
          }
        } else {
          // Show existing review
          let reviewDisplay = document.getElementById('review-display');
          if (!reviewDisplay) {
            reviewDisplay = document.createElement('div');
            reviewDisplay.id = 'review-display';
            reviewDisplay.style.cssText = 'padding: 16px; background: #f9fafb; border-radius: 8px; margin-top: 16px;';
            const stars = '★'.repeat(existingReview.rating) + '☆'.repeat(5 - existingReview.rating);
            reviewDisplay.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 8px;">你的評價：${stars}</div>
              <div style="color: #6b7280; font-size: 14px;">${existingReview.comment || '無評論'}</div>
            `;
            if (actionButtonsGroup && actionButtonsGroup.parentElement) {
              actionButtonsGroup.parentElement.insertBefore(reviewDisplay, actionButtonsGroup);
            }
          }
        }
      }
    }
  } else {
    // Item is active - hide handoff section
    if (handoffSection) handoffSection.style.display = 'none';
    
    // Remove status indicator if exists
    const statusEl = document.getElementById('item-status-indicator');
    if (statusEl) statusEl.remove();
    
    // Remove reserved/sold messages if exist
    const reservedMsg = document.getElementById('reserved-message');
    if (reservedMsg) reservedMsg.remove();
    const soldMsg = document.getElementById('sold-message');
    if (soldMsg) soldMsg.remove();
  }
}

// Image gallery functions
function changeImage(index) {
  if (window.currentItemImages && window.currentItemImages[index]) {
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
      mainImage.src = window.currentItemImages[index];
      // Re-attach fallback in case the new image fails
      attachImageFallback(mainImage);
    }
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }
}

// Quantity and total
function updateTotal() {
  const quantity = parseInt(document.getElementById('qty').value);
  const price = currentItem ? currentItem.price : 8500;
  // Note: total price display removed from new layout
}

// Actions
function handleAddToCart() {
  // 購物車功能已移除
  alert('購物車功能已移除，請使用「立即購買」功能');
}

function handlePurchase() {
  const currentUser = getCurrentUserCompat();
  if (!currentUser) {
    if (confirm('請先登入才能提出購買請求，是否前往登入頁面？')) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
    return;
  }

  if (!currentItem || !currentItem.sellerId) {
    alert('無法取得商品資訊，請重新載入頁面。');
    return;
  }

  if (currentItem.sellerId === currentUser.id) {
    alert('無法對自己刊登的商品提出請求。');
    return;
  }

  const quantity = parseInt(document.getElementById('qty').value) || 1;
  const price = currentItem.price || 0;
  const total = price * quantity;
  const itemTitle = currentItem.title;

  const modalHTML = `
    <div class="modal-overlay" id="purchaseModal" style="display: flex;">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>確認購買</h2>
          <button class="modal-close" onclick="closePurchaseModal()">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 16px;">
            <strong>商品：</strong>${itemTitle}
          </div>
          <div style="margin-bottom: 16px;">
            <label>數量：</label>
            <select id="purchaseQuantity" style="margin-left: 8px; padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 8px;">
              ${Array.from({length: Math.min(currentItem.quantity || 1, 10)}, (_, i) =>
                `<option value="${i+1}" ${i+1 === quantity ? 'selected' : ''}>${i+1}</option>`
              ).join('')}
            </select>
          </div>
          <div style="margin-bottom: 16px;">
            <strong>單價：</strong>NT$ ${price.toLocaleString('zh-TW')}
          </div>
          <div style="margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #2563eb;">
            <strong>總計：</strong>NT$ <span id="purchaseTotal">${total.toLocaleString('zh-TW')}</span>
          </div>
          <div class="form-group">
            <label for="purchaseNote">給賣家的訊息（選填）：</label>
            <textarea id="purchaseNote" placeholder="例如：希望週末面交" rows="3" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;"></textarea>
          </div>
        </div>
        <div class="modal-footer purchase-modal-footer">
          <button type="button" class="btn-secondary" id="purchaseCancelBtn" onclick="closePurchaseModal()">取消</button>
          <button type="button" class="btn-primary" id="purchaseConfirmBtn" onclick="confirmPurchase()">確認購買</button>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById('purchaseModal');
  if (existingModal) existingModal.remove();

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Handle Enter key to confirm purchase (but not when typing in textarea)
  const modal = document.getElementById('purchaseModal');
  if (modal) {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement;
        // Only trigger if focus is not on textarea or select
        if (activeElement && activeElement.tagName !== 'TEXTAREA' && activeElement.tagName !== 'SELECT') {
          e.preventDefault();
          confirmPurchase();
        }
      }
    };
    modal.addEventListener('keydown', handleKeyDown);
  }

  document.getElementById('purchaseQuantity').addEventListener('change', function() {
    const qty = parseInt(this.value);
    const newTotal = price * qty;
    document.getElementById('purchaseTotal').textContent = newTotal.toLocaleString('zh-TW');
  });
}

function closePurchaseModal() {
  const modal = document.getElementById('purchaseModal');
  if (modal) modal.remove();
}

function confirmPurchase() {
  const quantity = parseInt(document.getElementById('purchaseQuantity').value);
  const note = document.getElementById('purchaseNote').value.trim();
  const currentUser = getCurrentUserCompat();

  if (!currentUser || !currentItem || !currentItem.sellerId) return;

  createRequest({
    itemId: currentItem.id,
    sellerId: currentItem.sellerId,
    buyerId: currentUser.id,
    type: 'purchase',
    quantity: quantity,
    note: note || undefined
  });

  if (note) {
    createMessage({
      itemId: currentItem.id,
      senderId: currentUser.id,
      receiverId: currentItem.sellerId,
      text: note
    });
  }

  closePurchaseModal();

  const currentItemId = getCurrentItemId();
  if (currentItemId) {
    setPendingTransaction(currentItemId, 'buy');
  }

  alert('購買請求已送出！賣家將收到通知。\n賣家接受前，你可以取消這筆交易請求。');
  updateActionButtonsState();
}

function handleTrade() {
  const currentUser = getCurrentUserCompat();
  if (!currentUser) {
    if (confirm('請先登入才能提出交換請求，是否前往登入頁面？')) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
    return;
  }

  if (!currentItem || !currentItem.sellerId) {
    alert('無法取得商品資訊，請重新載入頁面。');
    return;
  }

  if (currentItem.sellerId === currentUser.id) {
    alert('無法對自己刊登的商品提出請求。');
    return;
  }

  const userItems = getItemsBySeller(currentUser.id).filter(i => i.isActive);

  const tradeRequirementText = document.getElementById('tradeRequirementText');
  const itemsGrid = document.querySelector('.items-grid');

  if (currentItem.modes && currentItem.modes.tradeTarget && currentItem.tradeTargetNote) {
    if (tradeRequirementText) {
      tradeRequirementText.textContent = currentItem.tradeTargetNote;
    }
  } else if (currentItem.modes && currentItem.modes.tradeOpen) {
    if (tradeRequirementText) {
      tradeRequirementText.textContent = '賣家開放任何交換提案。';
    }
  }

  if (itemsGrid) {
    itemsGrid.innerHTML = '';
    if (userItems.length === 0) {
      itemsGrid.innerHTML = '<p style="color: #6b7280; padding: 20px; text-align: center;">你目前沒有可交換的商品。請先刊登商品。</p>';
    } else {
      userItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'trade-item-card item-card';
        card.dataset.itemId = item.id;
        card.onclick = () => selectTradeItem(card);
            const thumbImg = document.createElement('img');
            thumbImg.src = getProductImageUrl(item);
            thumbImg.alt = item.title;
            attachImageFallback(thumbImg);
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'item-card-title';
            titleDiv.textContent = item.title;
            
            card.appendChild(thumbImg);
            card.appendChild(titleDiv);
            itemsGrid.appendChild(card);
      });
    }
  }

  selectedItemId = null;
  document.querySelectorAll('.trade-item-card').forEach(card => {
    card.classList.remove('selected');
  });
  updateSubmitButtonState();
  document.getElementById('trade-modal').style.display = 'flex';
}

function closeTradeModal() {
  document.getElementById('trade-modal').style.display = 'none';
  selectedItemId = null;
  document.querySelectorAll('.trade-item-card').forEach(card => {
    card.classList.remove('selected');
  });
}

function selectTradeItem(card) {
  const itemId = card.dataset.itemId;

  if (selectedItemId === itemId) {
    card.classList.remove('selected');
    selectedItemId = null;
  } else {
    document.querySelectorAll('.trade-item-card').forEach(c => {
      c.classList.remove('selected');
    });
    card.classList.add('selected');
    selectedItemId = itemId;
  }

  updateSubmitButtonState();
}

function updateSubmitButtonState() {
  const submitBtn = document.getElementById('submitTradeBtn');
  if (selectedItemId) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('disabled');
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
  }
}

function handleSubmitTrade() {
  if (!selectedItemId) {
    return;
  }

  const currentUser = getCurrentUserCompat();
  if (!currentUser || !currentItem) return;

  const messageTextarea = document.getElementById('trade-message');
  const note = messageTextarea ? messageTextarea.value.trim() : '';

  let requestType = 'trade-open';
  if (currentItem.modes && currentItem.modes.tradeTarget) {
    requestType = 'trade-target';
  }

  createRequest({
    itemId: currentItem.id,
    sellerId: currentItem.sellerId,
    buyerId: currentUser.id,
    type: requestType,
    quantity: 1,
    offeredItemId: selectedItemId,
    note: note || undefined
  });

  if (note) {
    createMessage({
      itemId: currentItem.id,
      senderId: currentUser.id,
      receiverId: currentItem.sellerId,
      text: note
    });
  }

  const currentItemId = getCurrentItemId();
  if (currentItemId) {
    setPendingTransaction(currentItemId, 'trade');
  }

  alert('交換提案已送出！賣家將收到通知。\n賣家接受前，你可以取消這筆交易請求。');
  closeTradeModal();
  updateActionButtonsState();
}

function handleOpenChat() {
  const currentUser = getCurrentUserCompat();
  if (!currentUser) {
    if (confirm('請先登入才能聯絡賣家，是否前往登入頁面？')) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
    return;
  }

  if (currentItem.sellerId === currentUser.id) {
    alert('無法對自己刊登的商品發送訊息。');
    return;
  }

  loadChatMessages();
  document.getElementById('chat-modal').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('chat-message').focus();
  }, 100);
}

function loadChatMessages() {
  const currentUser = getCurrentUserCompat();
  if (!currentUser || !currentItem || !currentItem.sellerId) return;

  const messages = getMessagesForConversation(
    currentItem.id,
    currentUser.id,
    currentItem.sellerId
  );

  const messagesArea = document.getElementById('messages-area');
  messagesArea.innerHTML = '';

  if (messages.length === 0) {
    messagesArea.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">與此商品相關的留言將會顯示在這裡。</div>';
  } else {
    messages.forEach(msg => {
      const isSender = msg.senderId === currentUser.id;
      const bubble = document.createElement('div');
      bubble.className = `message-bubble ${isSender ? 'message-user' : 'message-seller'}`;

      const time = new Date(msg.createdAt);
      const timeStr = time.toLocaleString('zh-TW', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      bubble.innerHTML = `
        <div class="message-content">${msg.text}</div>
        <div class="message-time">${timeStr}</div>
      `;
      messagesArea.appendChild(bubble);
    });
  }

  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function closeChatModal() {
  document.getElementById('chat-modal').style.display = 'none';
  document.getElementById('chat-message').value = '';
}

function handleSendMessage(event) {
  if (event) {
    event.preventDefault();
  }
  const currentUser = getCurrentUserCompat();
  if (!currentUser || !currentItem) return;

  const input = document.getElementById('chat-message');
  const messageText = input.value.trim();

  if (!messageText) {
    return;
  }

  createMessage({
    itemId: currentItem.id,
    senderId: currentUser.id,
    receiverId: currentItem.sellerId,
    text: messageText
  });

  loadChatMessages();
  input.value = '';
}

// Update action buttons state based on pending transactions
function updateActionButtonsState() {
  const itemId = getCurrentItemId();
  const hasPending = itemId ? hasPendingTransaction(itemId) : false;

  const actionGroup = document.getElementById('actionButtonsGroup');
  const cancelBtn = document.getElementById('cancelTxBtn');

  if (!actionGroup || !cancelBtn) return;

  // Check if transaction is completed - if so, hide cancel button
  const tx = itemId ? getActiveTransactionForItem(itemId) : null;
  const isCompleted = tx && tx.status === 'completed';
  const bothConfirmed = tx && tx.sellerConfirmedAt && tx.buyerConfirmedAt;

  if (hasPending && !isCompleted && !bothConfirmed) {
    actionGroup.classList.add('hidden');
    cancelBtn.style.display = 'block';
  } else {
    actionGroup.classList.remove('hidden');
    cancelBtn.style.display = 'none';
  }
}

function handleCancelTransaction() {
  const itemId = getCurrentItemId();
  if (!itemId) return;

  const ok = confirm('確定要取消這筆交易請求嗎？\n賣家將不會再看到這筆新請求。');
  if (!ok) return;

  const currentUser = getCurrentUserCompat();
  if (!currentUser) {
    alert('請先登入');
    return;
  }

  // Find the pending request for this item by this buyer
  const requests = getRequests();
  const pendingRequest = requests.find(r => 
    String(r.itemId) === String(itemId) && 
    String(r.buyerId) === String(currentUser.id) &&
    r.status === 'pending'
  );

  if (pendingRequest) {
    cancelRequest(pendingRequest.id, currentUser.id);
  }

  clearPendingTransaction(itemId);
  alert('已取消交易請求。');
  updateActionButtonsState();
}

function handleHeaderSearch() {
  const keyword = document.getElementById('headerSearchInput').value.trim();
  const params = new URLSearchParams();
  if (keyword) params.set('q', keyword);
  window.location.href = 'item_list.html?' + params.toString();
}

function attachPurchaseMenuListeners() {
  const moreBtn = document.getElementById('purchaseMoreBtn');
  const moreMenu = document.getElementById('purchaseMoreMenu');
  const reportBtn = document.getElementById('reportItemBtn');

  if (moreBtn && moreMenu) {
    const newMoreBtn = moreBtn.cloneNode(true);
    moreBtn.parentNode.replaceChild(newMoreBtn, moreBtn);

    newMoreBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      moreMenu.hidden = !moreMenu.hidden;
    });
  }

  if (reportBtn) {
    const newReportBtn = reportBtn.cloneNode(true);
    reportBtn.parentNode.replaceChild(newReportBtn, reportBtn);

    newReportBtn.addEventListener('click', function () {
      moreMenu.hidden = true;
      alert('已收到你的檢舉，我們會儘快處理，謝謝你的協助。');
    });
  }
}

// Main initialization function
async function renderItemPage() {
  const id = getQueryId();
  if (!id) {
    renderItemNotFound('Missing item id');
    return;
  }

  let item = null;
  
  // 優先嘗試從 API 獲取商品
  if (typeof api !== 'undefined' && api.getProduct) {
    try {
      const productData = await api.getProduct(id);
      // 轉換 API 格式到前端格式
      item = {
        id: productData.product_id,
        title: productData.product_name,
        category: productData.category_name,
        price: productData.price,
        condition: productData.condition,
        description: productData.description,
        images: productData.image_url ? [productData.image_url] : [],
        sellerId: productData.owner_id,
        seller: {
          name: productData.owner_name,
          email: productData.owner_email,
          phone: productData.owner_phone,
          rating: 4.8,
          ratingText: '99.9% 好評',
          deals: 0
        },
        modes: {
          sale: productData.trade_option === 'sale' || productData.trade_option === 'both',
          tradeTarget: productData.trade_option === 'trade' || productData.trade_option === 'both',
          tradeOpen: false
        },
        tradeTargetNote: productData.trade_item,
        status: productData.status,
        isActive: productData.status === 'available',
        location: '台北市',
        views: 0,
        tags: []
      };
      console.log('從 API 獲取商品成功:', item);
    } catch (e) {
      console.log('API 獲取失敗，嘗試 localStorage:', e.message);
    }
  }
  
  // 如果 API 失敗，嘗試從 localStorage 獲取
  if (!item && typeof getItemById === 'function') {
    item = getItemById(id);
  }
  
  if (!item) {
    renderItemNotFound(`Item with id=${id} not found`);
    return;
  }

  // If item is inactive, show not found
  if (item.isActive === false || item.status === 'removed') {
    renderItemNotFound('Item is not available');
    return;
  }

  currentItem = item;
  
  // Guard: ensure currentItem is set before proceeding
  if (!currentItem) {
    renderItemNotFound('Failed to load item');
    return;
  }

  // Increment view count
  if (currentItem.id) {
    updateItem(currentItem.id, { views: (currentItem.views || 0) + 1 });
    currentItem.views = (currentItem.views || 0) + 1;
  }

  // Get seller info
  if (!currentItem.seller && currentItem.sellerId) {
    const seller = getUsers().find(u => u.id === currentItem.sellerId);
    if (seller) {
      currentItem.seller = {
        name: seller.name,
        rating: 4.8,
        ratingText: '99.9% 好評',
        deals: 0
      };
    }
  }

  if (!currentItem.seller) {
    currentItem.seller = {
      name: 'Unknown',
      rating: 0,
      ratingText: '無評價',
      deals: 0
    };
  }

  // Track recently viewed items
  try {
    let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewedItems') || '[]');
    const currentItemIdStr = String(currentItem.id);
    recentlyViewed = recentlyViewed.filter(item => String(item.id) !== currentItemIdStr);

    const hasPurchase = currentItem.modes?.sale || false;
    const itemData = {
      id: String(currentItem.id),
      title: currentItem.title,
      price: hasPurchase ? currentItem.price : null,
      imageUrl: currentItem.images && currentItem.images.length > 0 ? currentItem.images[0] : '',
      condition: currentItem.condition,
      mode: {
        purchase: hasPurchase || false,
        trade: (currentItem.modes?.tradeTarget || currentItem.modes?.tradeOpen) || false,
        wish: (currentItem.modes?.tradeOpen) || false
      }
    };

    recentlyViewed.unshift(itemData);
    if (recentlyViewed.length > 8) {
      recentlyViewed = recentlyViewed.slice(0, 8);
    }
    localStorage.setItem('recentlyViewedItems', JSON.stringify(recentlyViewed));
  } catch (e) {
    console.error('Error saving recently viewed items:', e);
  }

  // Normalize current item
  currentItem = normalizeItem(currentItem);

  // Populate page
  populateItemPage();

  // Update action buttons state
  updateActionButtonsState();

  // Bind handoff button after item is loaded
  bindHandoffButton();

  // Clean up seller actions container if current user is not the seller
  const currentUser = getCurrentUserCompat();
  if (!currentUser || !currentItem || !isCurrentUserSeller(currentItem)) {
    const sellerActionsContainer = document.querySelector('.seller-actions-container');
    if (sellerActionsContainer) {
      sellerActionsContainer.remove();
    }
  }

  // Check if current user is seller
  setTimeout(() => {
    if (currentItem && isCurrentUserSeller(currentItem)) {
      showSellerView(currentItem);
    }
  }, 100);
}

// Show seller view (hide buy buttons, show edit button)
function showSellerView(item) {
  const actionButtonsGroup = document.getElementById('actionButtonsGroup');
  const cancelTxBtn = document.getElementById('cancelTxBtn');
  const messageButtonMain = document.getElementById('messageButtonMain');
  const actionQuantity = document.querySelector('.action-quantity');

  if (actionButtonsGroup) actionButtonsGroup.style.display = 'none';
  if (cancelTxBtn) cancelTxBtn.style.display = 'none';
  if (messageButtonMain) messageButtonMain.style.display = 'none';
  if (actionQuantity) actionQuantity.style.display = 'none';

  // Check if seller actions container already exists to avoid duplicates
  let sellerActionsContainer = document.querySelector('.seller-actions-container');
  
  if (!sellerActionsContainer) {
    // Create it only if it doesn't exist
    sellerActionsContainer = document.createElement('div');
    sellerActionsContainer.className = 'seller-actions-container';
    sellerActionsContainer.style.marginTop = '0';

    const editBtn = document.createElement('button');
    editBtn.className = 'item-action-button item-action-button-primary';
    editBtn.textContent = '修改商品資訊';
    editBtn.addEventListener('click', () => handleEditItem(item));
    sellerActionsContainer.appendChild(editBtn);

    const helper = document.createElement('p');
    helper.className = 'remove-helper-text';
    helper.textContent = '此處可修改此商品的價格、描述、標籤與交易方式。';
    sellerActionsContainer.appendChild(helper);

    const actionCard = document.querySelector('.action-card');
    if (actionCard) {
      const actionPriceBlock = document.querySelector('.action-price-block');
      const actionQuantity = document.querySelector('.action-quantity');

      if (actionPriceBlock && actionPriceBlock.nextSibling) {
        actionCard.insertBefore(sellerActionsContainer, actionPriceBlock.nextSibling);
      } else if (actionQuantity) {
        actionCard.insertBefore(sellerActionsContainer, actionQuantity);
      } else {
        actionCard.appendChild(sellerActionsContainer);
      }
    }
  } else {
    // If it exists, just update the button click handler to use current item
    const editBtn = sellerActionsContainer.querySelector('button');
    if (editBtn) {
      // Remove old listeners by cloning
      const newEditBtn = editBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newEditBtn, editBtn);
      newEditBtn.addEventListener('click', () => handleEditItem(item));
    }
  }

  addTransactionsSection(item);
}

// Add transactions section for seller
function addTransactionsSection(item) {
  const existingSection = document.getElementById('transactions-section');
  if (existingSection) {
    existingSection.remove();
  }

  // Only show active (pending) requests for the seller
  const requests = getActiveRequestsForItem(item.id);

  const transactionsSection = document.createElement('div');
  transactionsSection.id = 'transactions-section';
  transactionsSection.className = 'transactions-section';
  transactionsSection.style.cssText = 'margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;';

  const sectionTitle = document.createElement('h3');
  sectionTitle.textContent = '此商品的交易請求';
  sectionTitle.style.cssText = 'font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 16px 0;';
  transactionsSection.appendChild(sectionTitle);

  const transactionsList = document.createElement('div');
  transactionsList.className = 'transactions-list';
  transactionsList.style.cssText = 'max-height: 300px; overflow-y: auto;';

  if (requests.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.textContent = '目前尚未收到任何交易請求。';
    emptyState.style.cssText = 'text-align: center; color: #6b7280; padding: 24px; margin: 0;';
    transactionsList.appendChild(emptyState);
  } else {
    requests.forEach(request => {
      const buyer = getUsers().find(u => u.id === request.buyerId);
      const buyerName = buyer ? buyer.name : '未知買家';

      const requestRow = document.createElement('div');
      requestRow.className = 'transaction-row';
      requestRow.style.cssText = 'padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;';

      const rowContent = document.createElement('div');
      rowContent.style.cssText = 'display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;';

      const leftInfo = document.createElement('div');
      leftInfo.style.cssText = 'flex: 1;';

      const buyerNameEl = document.createElement('div');
      buyerNameEl.textContent = buyerName;
      buyerNameEl.style.cssText = 'font-weight: 600; color: #111827; margin-bottom: 4px;';
      leftInfo.appendChild(buyerNameEl);

      const typeChip = document.createElement('span');
      typeChip.textContent = request.type === 'purchase' ? '購買' : '以物易物';
      typeChip.style.cssText = 'display: inline-block; padding: 2px 8px; background: #e0e7ff; color: #3730a3; border-radius: 4px; font-size: 12px; margin-right: 8px;';
      leftInfo.appendChild(typeChip);

      const quantityEl = document.createElement('span');
      quantityEl.textContent = `數量：${request.quantity || 1}`;
      quantityEl.style.cssText = 'font-size: 12px; color: #6b7280;';
      leftInfo.appendChild(quantityEl);

      rowContent.appendChild(leftInfo);

      const rightInfo = document.createElement('div');
      rightInfo.style.cssText = 'text-align: right;';

      const statusChip = document.createElement('span');
      let statusText = '';
      let statusStyle = '';
      if (request.status === 'pending') {
        statusText = '待賣家回覆';
        statusStyle = 'border: 1px solid #2563eb; color: #2563eb; background: transparent;';
      } else if (request.status === 'accepted' || request.status === 'reserved') {
        statusText = request.status === 'reserved' ? '預約中' : '已接受';
        statusStyle = 'background: #ecfdf3; color: #15803d;';
      } else if (request.status === 'rejected') {
        statusText = '已拒絕';
        statusStyle = 'border: 1px solid #dc2626; color: #dc2626; background: transparent;';
      } else if (request.status === 'cancelled') {
        statusText = '已取消';
        statusStyle = 'background: #f3f4f6; color: #6b7280;';
      }
      statusChip.textContent = statusText;
      statusChip.style.cssText = `display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; ${statusStyle}`;
      rightInfo.appendChild(statusChip);

      const timeEl = document.createElement('div');
      const createdAt = new Date(request.createdAt);
      timeEl.textContent = createdAt.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      timeEl.style.cssText = 'font-size: 11px; color: #9ca3af; margin-top: 4px;';
      rightInfo.appendChild(timeEl);

      rowContent.appendChild(rightInfo);
      requestRow.appendChild(rowContent);

      // Check if item is already reserved by another request
      const activeTx = getActiveTransactionForItem(item.id);
      const isReservedByOther = activeTx && String(activeTx.buyerId) !== String(request.buyerId);
      
      if (request.status === 'pending' && !isReservedByOther) {
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = '接受';
        acceptBtn.style.cssText = 'padding: 6px 12px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;';
        acceptBtn.addEventListener('click', () => handleAcceptRequest(request.id));
        actionsDiv.appendChild(acceptBtn);

        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = '拒絕';
        rejectBtn.style.cssText = 'padding: 6px 12px; background: transparent; color: #dc2626; border: 1px solid #dc2626; border-radius: 6px; font-size: 12px; cursor: pointer;';
        rejectBtn.addEventListener('click', () => handleRejectRequest(request.id));
        actionsDiv.appendChild(rejectBtn);

        requestRow.appendChild(actionsDiv);
      } else if (isReservedByOther && request.status === 'pending') {
        const reservedMsg = document.createElement('div');
        reservedMsg.textContent = '已被其他買家預約';
        reservedMsg.style.cssText = 'font-size: 12px; color: #6b7280; margin-top: 8px; font-style: italic;';
        requestRow.appendChild(reservedMsg);
      }

      transactionsList.appendChild(requestRow);
    });
  }

  transactionsSection.appendChild(transactionsList);

  const actionCard = document.querySelector('.action-card');
  if (actionCard) {
    actionCard.appendChild(transactionsSection);
  }
}

function handleAcceptRequest(requestId) {
  const request = getRequestById(requestId);
  if (!request || !currentItem) return;
  
  const reservedAt = new Date().toISOString();
  
  // Update request status to 'reserved' (we use 'reserved' instead of 'accepted')
  const updatedRequest = updateRequest(requestId, { status: 'reserved' });
  
  // Create or update transaction
  let transaction = createTransactionFromRequest(request);
  transaction = updateTransaction(transaction.id, {
    status: 'reserved',
    reservedAt: reservedAt
  });
  
  // Set item as reserved
  setItemReserved(currentItem.id, request.buyerId, reservedAt);
  
  // Update currentItem reference
  currentItem.status = 'reserved';
  currentItem.reservedForUserId = request.buyerId;
  currentItem.reservedAt = reservedAt;
  
  // Re-render the page
  populateItemPage();
  
  // Refresh transactions section
  if (isCurrentUserSeller(currentItem)) {
    setTimeout(() => {
      showSellerView(currentItem);
    }, 100);
  }
  
  alert('已接受此交易請求，商品已預約給買家。');
}

function handleRejectRequest(requestId) {
  const updated = updateRequest(requestId, { status: 'rejected' });
  if (updated && currentItem) {
    addTransactionsSection(currentItem);
  }
}

// Handle handoff confirmation (已面交)
function handleConfirmHandoff() {
  const currentUser = getCurrentUserCompat();
  if (!currentUser || !currentItem) return;
  
  const tx = getActiveTransactionForItem(currentItem.id);
  if (!tx || tx.status !== 'reserved') return;
  
  if (getDaysSince(tx.reservedAt) > 7) {
    alert('此交易已超過 7 天，無法再標記為已面交，請重新協調交易。');
    return;
  }
  
  const now = new Date().toISOString();
  
  if (String(currentUser.id) === String(tx.sellerId) && !tx.sellerConfirmedAt) {
    updateTransaction(tx.id, { sellerConfirmedAt: now });
  } else if (String(currentUser.id) === String(tx.buyerId) && !tx.buyerConfirmedAt) {
    updateTransaction(tx.id, { buyerConfirmedAt: now });
  }
  
  // Fetch updated transaction
  const updated = getTransactionById(tx.id);
  
  if (updated.sellerConfirmedAt && updated.buyerConfirmedAt) {
    updateTransaction(updated.id, {
      status: 'completed',
      completedAt: now
    });
    setItemSold(currentItem.id, now);
    
    // Update currentItem reference
    currentItem.status = 'sold';
    currentItem.soldAt = now;
    
    alert('雙方已確認面交，交易完成！現在可以為此次交易撰寫評價。');
  } else {
    alert('已標記為已面交，等待對方確認。');
  }
  
  // Re-render UI
  populateItemPage();
  
  if (isCurrentUserSeller(currentItem)) {
    setTimeout(() => {
      showSellerView(currentItem);
    }, 100);
  }
}

// Bind handoff button
function bindHandoffButton() {
  const btn = document.getElementById('btnConfirmHandoff');
  if (!btn) return;
  
  // Remove any existing listeners by cloning the button
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener('click', handleConfirmHandoff);
}

// Review modal functions
let currentReviewTransaction = null;

function openReviewModal(transaction) {
  currentReviewTransaction = transaction;
  const modal = document.getElementById('review-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Reset stars
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.classList.remove('active', 'filled');
      btn.textContent = '☆';
    });
    const commentEl = document.getElementById('review-comment');
    if (commentEl) commentEl.value = '';
  }
}

function closeReviewModal() {
  const modal = document.getElementById('review-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  currentReviewTransaction = null;
}

function handleSubmitReview() {
  const currentUser = getCurrentUserCompat();
  if (!currentUser || !currentReviewTransaction || !currentItem) return;
  
  // Get selected rating
  const activeStar = document.querySelector('.star-btn.active');
  if (!activeStar) {
    alert('請選擇評分（1-5 星）');
    return;
  }
  
  const rating = parseInt(activeStar.dataset.value);
  const commentEl = document.getElementById('review-comment');
  const comment = commentEl ? commentEl.value.trim() : '';
  
  const toUserId = String(currentUser.id) === String(currentReviewTransaction.sellerId)
    ? currentReviewTransaction.buyerId
    : currentReviewTransaction.sellerId;
  
  const review = {
    itemId: currentItem.id,
    transactionId: currentReviewTransaction.id,
    fromUserId: currentUser.id,
    toUserId: toUserId,
    rating: rating,
    comment: comment || ''
  };
  
  createReview(review);
  closeReviewModal();
  alert('評價已送出，謝謝你的回饋！');
  
  // Re-render to show the review
  populateItemPage();
}

// Bind star rating selection
function bindStarRating() {
  const starBtns = document.querySelectorAll('.star-btn');
  starBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.dataset.value);
      starBtns.forEach((b, i) => {
        if (i < value) {
          b.classList.add('active', 'filled');
          b.textContent = '★';
        } else {
          b.classList.remove('active', 'filled');
          b.textContent = '☆';
        }
      });
    });
  });
}

function handleEditItem(item) {
  openEditItemModal(item);
}

function openEditItemModal(item) {
  const categories = [
    { id: '課本／學習用品', label: '課本／學習用品' },
    { id: '筆電／3C', label: '筆電／3C' },
    { id: '手機／平板', label: '手機／平板' },
    { id: '遊戲與主機', label: '遊戲與主機' },
    { id: '宿舍家電與家具', label: '宿舍家電與家具' },
    { id: '服飾／生活用品', label: '服飾／生活用品' },
    { id: '運動／興趣嗜好', label: '運動／興趣嗜好' },
    { id: '其他', label: '其他' }
  ];

  const modalHTML = `
    <div class="modal-overlay" id="editItemModal" style="display: flex;">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2>修改商品資訊</h2>
          <button class="modal-close" onclick="closeEditItemModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="editItemTitle">商品名稱：</label>
            <input type="text" id="editItemTitle" value="${(item.title || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;">
          </div>
          <div class="form-group">
            <label for="editItemPrice">價格：</label>
            <input type="number" id="editItemPrice" value="${item.price || 0}" min="0" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;">
          </div>
          <div class="form-group">
            <label for="editItemDescription">商品敘述：</label>
            <textarea id="editItemDescription" rows="5" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; resize: vertical;">${(typeof item.description === 'string' ? item.description : (item.description?.main || '')).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </div>
          <div class="form-group">
            <label for="editItemCategory">商品分類：</label>
            <select id="editItemCategory" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;">
              ${categories.map(cat => {
                const normalizedItemCategory = typeof normalizeCategory !== 'undefined' ? normalizeCategory(item.category) : item.category;
                return `<option value="${cat.id}" ${normalizedItemCategory === cat.id ? 'selected' : ''}>${cat.label}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="editItemTags">商品標籤（用逗號分隔）：</label>
            <input type="text" id="editItemTags" value="${((item.tags || []).join(', ')).replace(/"/g, '&quot;')}" placeholder="例如：二手, 九成新, 面交" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;">
          </div>
          <div class="form-group">
            <label for="editItemCondition">商品狀況：</label>
            <select id="editItemCondition" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;">
              <option value="全新" ${item.condition === '全新' ? 'selected' : ''}>全新</option>
              <option value="九成新" ${item.condition === '九成新' ? 'selected' : ''}>九成新</option>
              <option value="可接受使用痕跡" ${item.condition === '可接受使用痕跡' ? 'selected' : ''}>可接受使用痕跡</option>
              <option value="二手" ${item.condition === '二手' ? 'selected' : ''}>二手</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editItemPickup">交易方式說明：</label>
            <input type="text" id="editItemPickup" value="${(item.pickup?.method || '面交').replace(/"/g, '&quot;')}" placeholder="例如：面交 | 台北市信義區 | 時間可議" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit;">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeEditItemModal()">取消</button>
          <button class="btn-primary" onclick="saveItemChanges()">儲存變更</button>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById('editItemModal');
  if (existingModal) existingModal.remove();

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditItemModal() {
  const modal = document.getElementById('editItemModal');
  if (modal) modal.remove();
}

function saveItemChanges() {
  try {
    if (!currentItem) {
      alert('無法找到商品資訊，請重新載入頁面。');
      return;
    }

    const titleEl = document.getElementById('editItemTitle');
    const priceEl = document.getElementById('editItemPrice');
    const descriptionEl = document.getElementById('editItemDescription');
    const categoryEl = document.getElementById('editItemCategory');
    const tagsEl = document.getElementById('editItemTags');
    const conditionEl = document.getElementById('editItemCondition');
    const pickupEl = document.getElementById('editItemPickup');

    if (!titleEl || !priceEl || !descriptionEl || !categoryEl || !tagsEl || !conditionEl || !pickupEl) {
      alert('無法讀取表單資料，請重新開啟編輯視窗。');
      return;
    }

    const title = titleEl.value.trim();
    const price = parseFloat(priceEl.value) || 0;
    const description = descriptionEl.value.trim();
    const category = categoryEl.value;
    const tagsStr = tagsEl.value.trim();
    const condition = conditionEl.value;
    const pickup = pickupEl.value.trim();

    if (!title) {
      alert('請輸入商品名稱');
      return;
    }

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

    const updateData = {
      title,
      price,
      description,
      category,
      tags,
      condition
    };

    if (currentItem.modes && typeof currentItem.modes === 'object') {
      updateData.modes = { ...currentItem.modes };
    } else if (currentItem.mode && typeof currentItem.mode === 'object') {
      updateData.modes = {
        sale: currentItem.mode.purchase || false,
        tradeTarget: currentItem.mode.tradeMode === 'target' || currentItem.mode.tradeMode === 'both',
        tradeOpen: currentItem.mode.tradeMode === 'offer' || currentItem.mode.tradeMode === 'both'
      };
      if (currentItem.mode.tradeSummary) {
        updateData.tradeTargetNote = currentItem.mode.tradeSummary;
      }
    } else {
      updateData.modes = {
        sale: true,
        tradeTarget: false,
        tradeOpen: false
      };
    }

    if (currentItem.pickup && typeof currentItem.pickup === 'object') {
      updateData.pickup = {
        ...currentItem.pickup,
        method: pickup || currentItem.pickup.method || '面交'
      };
    } else {
      updateData.pickup = {
        method: pickup || '面交',
        location: currentItem.location || '',
        time: '時間可議'
      };
    }

    if (currentItem.sellerId) updateData.sellerId = currentItem.sellerId;
    if (currentItem.images) updateData.images = currentItem.images;
    if (currentItem.location) updateData.location = currentItem.location;
    if (currentItem.quantity !== undefined) updateData.quantity = currentItem.quantity;

    const updated = updateItem(currentItem.id, updateData);

    if (!updated) {
      alert('更新商品時發生錯誤，請稍後再試。');
      return;
    }

    currentItem = updated;
    currentItem = normalizeItem(currentItem);

    if (currentItem && !currentItem.seller && currentItem.sellerId) {
      const seller = getUsers().find(u => u.id === currentItem.sellerId);
      if (seller) {
        currentItem.seller = {
          name: seller.name,
          rating: 4.8,
          ratingText: '99.9% 好評',
          deals: 0
        };
      }
    }

    if (!currentItem.seller) {
      currentItem.seller = {
        name: 'Unknown',
        rating: 0,
        ratingText: '無評價',
        deals: 0
      };
    }

    if (!currentItem.mode) {
      currentItem.mode = {
        purchase: currentItem.modes?.sale || false,
        trade: currentItem.modes?.tradeTarget || currentItem.modes?.tradeOpen || false,
        wish: currentItem.modes?.tradeOpen || false,
        tradeMode: null,
        tradeSummary: ''
      };
    }

    populateItemPage();

    if (isCurrentUserSeller(currentItem)) {
      setTimeout(() => {
        showSellerView(currentItem);
      }, 100);
    }

    closeEditItemModal();
    alert('商品資訊已更新');
  } catch (error) {
    console.error('Error saving item changes:', error);
    alert('儲存時發生錯誤：' + error.message);
  }
}

// ========== Image Lightbox Functions ==========

/**
 * Open the image lightbox with the specified image URL
 * @param {string} imageUrl - URL of the image to display
 */
function openImageLightbox(imageUrl) {
  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('image-lightbox-img');
  
  if (!lightbox || !lightboxImg) return;
  
  lightboxImg.src = imageUrl;
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('body--no-scroll');
}

/**
 * Close the image lightbox
 */
function closeImageLightbox() {
  const lightbox = document.getElementById('image-lightbox');
  
  if (!lightbox) return;
  
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('body--no-scroll');
}

/**
 * Bind event listeners for image lightbox
 */
function bindImageLightbox() {
  const lightbox = document.getElementById('image-lightbox');
  const lightboxBackdrop = lightbox?.querySelector('.image-lightbox-backdrop');
  const lightboxClose = lightbox?.querySelector('.image-lightbox-close');
  const mainImage = document.getElementById('main-image');
  
  if (!lightbox) return;
  
  // Close button click
  if (lightboxClose) {
    lightboxClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeImageLightbox();
    });
  }
  
  // Backdrop click (outside image)
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', () => {
      closeImageLightbox();
    });
  }
  
  // Prevent closing when clicking on the image itself
  const lightboxContent = lightbox.querySelector('.image-lightbox-content');
  if (lightboxContent) {
    lightboxContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeImageLightbox();
    }
  });
  
  // Main image click handler - only the main image opens the lightbox
  if (mainImage) {
    mainImage.style.cursor = 'pointer';
    mainImage.addEventListener('click', () => {
      const currentSrc = mainImage.src;
      if (currentSrc) {
        openImageLightbox(currentSrc);
      }
    });
  }
  
  // Note: Thumbnails only switch the main image via changeImage() function
  // They do NOT open the lightbox - that behavior has been removed
}

// Make functions globally accessible
window.changeImage = changeImage;
window.saveItemChanges = saveItemChanges;
window.closeEditItemModal = closeEditItemModal;
window.updateTotal = updateTotal;
window.handleAddToCart = handleAddToCart;

// 更新購物車徽章（如果 navbar 已載入）
if (typeof updateCartBadge === 'function') {
  // 在頁面載入時更新一次
  setTimeout(() => {
    updateCartBadge();
  }, 500);
}
window.handlePurchase = handlePurchase;
window.closePurchaseModal = closePurchaseModal;
window.confirmPurchase = confirmPurchase;
window.handleTrade = handleTrade;
window.closeTradeModal = closeTradeModal;
window.handleSubmitTrade = handleSubmitTrade;
window.handleOpenChat = handleOpenChat;
window.closeChatModal = closeChatModal;
window.handleSendMessage = handleSendMessage;
window.handleCancelTransaction = handleCancelTransaction;
window.handleConfirmHandoff = handleConfirmHandoff;
window.closeReviewModal = closeReviewModal;
window.handleSubmitReview = handleSubmitReview;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function () {
  attachPurchaseMenuListeners();

  document.addEventListener('click', function (event) {
    const moreMenu = document.getElementById('purchaseMoreMenu');
    const moreBtn = document.getElementById('purchaseMoreBtn');
    if (moreMenu && moreBtn && !moreMenu.contains(event.target) && !moreBtn.contains(event.target)) {
      moreMenu.hidden = true;
    }
  });

  // Allow Enter key to send message
  const chatInput = document.getElementById('chat-message');
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleSendMessage(e);
      }
    });
  }

  // Allow Enter key in header search
  const headerSearchInput = document.getElementById('headerSearchInput');
  if (headerSearchInput) {
    headerSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleHeaderSearch();
      }
    });
  }

  // Bind image lightbox
  bindImageLightbox();

  // Bind star rating
  bindStarRating();

  // Render item page (bindHandoffButton will be called after item loads)
  renderItemPage().catch(err => {
    console.error('載入商品頁面失敗:', err);
  });
});


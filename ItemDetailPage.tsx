import React, { useState } from 'react';
import { Item, TradeMode, UserItem } from './types';
import './ItemDetailPage.css';

// Mock data for demonstration
const mockItem: Item = {
  id: 'item-001',
  title: 'Nintendo Switch OLED 白色主機 九成新',
  images: [
    'https://via.placeholder.com/600x600/0064D2/FFFFFF?text=Nintendo+Switch+1',
    'https://via.placeholder.com/600x600/0052A3/FFFFFF?text=Nintendo+Switch+2',
    'https://via.placeholder.com/600x600/003D7A/FFFFFF?text=Nintendo+Switch+3',
    'https://via.placeholder.com/600x600/002855/FFFFFF?text=Nintendo+Switch+4',
  ],
  price: 8500,
  condition: '九成新',
  description: `Nintendo Switch OLED 白色主機，使用約一年，功能完全正常。

包含：
- 主機本體（白色）
- 原廠底座
- 原廠充電器
- 原廠 Joy-Con（紅藍）
- 原廠包裝盒

外觀狀況：
- 螢幕有保護貼，無刮痕
- 機身有輕微使用痕跡
- 所有按鍵功能正常
- Joy-Con 無飄移問題

可面交或宅配，面交地點：台北市信義區`,
  category: '電玩遊戲',
  subCategory: '遊戲主機',
  tags: ['Nintendo', 'Switch', 'OLED', '遊戲主機', '二手'],
  location: '台北市信義區',
  shippingOptions: [
    { type: '面交', cost: 0, description: '台北市信義區，時間可議' },
    { type: '宅配', cost: 150, description: '7-11 店到店' },
  ],
  quantityAvailable: 1,
  seller: {
    name: 'game_lover_2024',
    rating: 4.8,
    completedDeals: 127,
    since: '2022-03-15',
  },
  allowPurchase: true,
  allowTrade: true,
  tradeMode: 'BOTH',
  tradeTargetDescription: '想換 PlayStation 5 或 Xbox Series X，也接受其他 Nintendo 主機相關商品',
  createdAt: '2024-12-15',
  viewCount: 342,
  wishCount: 8,
};

const mockUserItems: UserItem[] = [
  {
    id: 'user-item-001',
    title: 'PlayStation 5 光碟版',
    image: 'https://via.placeholder.com/150/0064D2/FFFFFF?text=PS5',
    category: '電玩遊戲',
    tags: ['PlayStation', 'PS5', '遊戲主機'],
  },
  {
    id: 'user-item-002',
    title: 'Xbox Series X',
    image: 'https://via.placeholder.com/150/0052A3/FFFFFF?text=Xbox',
    category: '電玩遊戲',
    tags: ['Xbox', '遊戲主機'],
  },
  {
    id: 'user-item-003',
    title: 'Nintendo 3DS XL',
    image: 'https://via.placeholder.com/150/003D7A/FFFFFF?text=3DS',
    category: '電玩遊戲',
    tags: ['Nintendo', '3DS', '掌機'],
  },
  {
    id: 'user-item-004',
    title: 'iPhone 13 Pro',
    image: 'https://via.placeholder.com/150/002855/FFFFFF?text=iPhone',
    category: '3C電子',
    tags: ['Apple', 'iPhone', '手機'],
  },
];

interface ImageGalleryProps {
  images: string[];
  title: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="image-gallery">
      <div className="main-image-container">
        <img
          src={images[selectedIndex]}
          alt={title}
          className="main-image"
        />
        <div className="image-badge">九成新</div>
      </div>
      <div className="thumbnail-strip">
        {images.map((img, index) => (
          <button
            key={index}
            className={`thumbnail ${index === selectedIndex ? 'active' : ''}`}
            onClick={() => setSelectedIndex(index)}
            aria-label={`View image ${index + 1}`}
          >
            <img src={img} alt={`${title} - view ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
};

interface SellerInfoCardProps {
  seller: Item['seller'];
  onMessage: () => void;
}

const SellerInfoCard: React.FC<SellerInfoCardProps> = ({ seller, onMessage }) => {
  return (
    <div className="seller-info-card">
      <div className="seller-header">
        <div className="seller-avatar">{seller.name[0].toUpperCase()}</div>
        <div className="seller-details">
          <div className="seller-name">{seller.name}</div>
          <div className="seller-rating">
            <span className="rating-stars">★★★★★</span>
            <span className="rating-value">{seller.rating}</span>
          </div>
          <div className="seller-stats">
            已完成交易 {seller.completedDeals} 筆
          </div>
          <div className="seller-since">加入時間：{seller.since}</div>
        </div>
      </div>
      <div className="seller-actions">
        <button className="btn-secondary" onClick={onMessage}>
          聯絡賣家
        </button>
        <a href={`/seller/${seller.name}`} className="btn-link">
          查看賣家其他商品
        </a>
      </div>
    </div>
  );
};

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeMode: TradeMode;
  tradeTargetDescription?: string;
  userItems: UserItem[];
  onSubmitTargetTrade: (selectedItemIds: string[]) => void;
  onSubmitOfferTrade: (selectedItemIds: string[], message: string) => void;
  onCreateTradeWish: () => void;
}

const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  tradeMode,
  tradeTargetDescription,
  userItems,
  onSubmitTargetTrade,
  onSubmitOfferTrade,
  onCreateTradeWish,
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [showTradeWishPrompt, setShowTradeWishPrompt] = useState(false);

  if (!isOpen) return null;

  // Filter items that match trade target (simple matching by category/tags)
  const matchingItems = tradeMode === 'REQUEST_TARGET'
    ? userItems.filter(item => 
        item.category === '電玩遊戲' || 
        item.tags.some(tag => tag.includes('Nintendo') || tag.includes('PlayStation') || tag.includes('Xbox'))
      )
    : userItems;

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = () => {
    if (tradeMode === 'REQUEST_TARGET') {
      if (matchingItems.length === 0) {
        setShowTradeWishPrompt(true);
      } else if (selectedItems.length > 0) {
        onSubmitTargetTrade(selectedItems);
        onClose();
      }
    } else if (tradeMode === 'REQUEST_OFFER' || tradeMode === 'BOTH') {
      if (selectedItems.length > 0) {
        onSubmitOfferTrade(selectedItems, message);
        onClose();
      }
    }
  };

  const handleCreateTradeWish = () => {
    onCreateTradeWish();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {tradeMode === 'REQUEST_TARGET' ? '以指定物品交換' : '提出交換提案'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {tradeMode === 'REQUEST_TARGET' && tradeTargetDescription && (
            <div className="trade-requirement">
              <strong>賣家需求：</strong>
              <p>{tradeTargetDescription}</p>
            </div>
          )}

          {showTradeWishPrompt ? (
            <div className="trade-wish-prompt">
              <p>你目前沒有符合條件的物品。</p>
              <p>是否要建立一筆開放式許願 (TRADE_WISH)？</p>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handleCreateTradeWish}>
                  建立開放式許願
                </button>
                <button className="btn-secondary" onClick={() => setShowTradeWishPrompt(false)}>
                  返回
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="user-items-list">
                <h3>選擇你的物品：</h3>
                {matchingItems.length === 0 ? (
                  <p className="no-items">你目前沒有符合條件的物品。</p>
                ) : (
                  <div className="items-grid">
                    {matchingItems.map(item => (
                      <div
                        key={item.id}
                        className={`item-card ${selectedItems.includes(item.id) ? 'selected' : ''}`}
                        onClick={() => handleItemToggle(item.id)}
                      >
                        <img src={item.image} alt={item.title} />
                        <div className="item-card-title">{item.title}</div>
                        <div className="item-card-checkbox">
                          {selectedItems.includes(item.id) ? '✓' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(tradeMode === 'REQUEST_OFFER' || tradeMode === 'BOTH') && (
                <div className="trade-message">
                  <label htmlFor="trade-message">給賣家的訊息（選填）：</label>
                  <textarea
                    id="trade-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="例如：希望可以當面交換，時間地點可議..."
                    rows={4}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {!showTradeWishPrompt && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={selectedItems.length === 0}
            >
              送出交換提案
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ActionPanelProps {
  item: Item;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  onPurchase: () => void;
  onTrade: () => void;
  onToggleWatchlist: () => void;
  isInWatchlist: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  item,
  quantity,
  onQuantityChange,
  onAddToCart,
  onPurchase,
  onTrade,
  onToggleWatchlist,
  isInWatchlist,
}) => {
  const canPurchase = item.allowPurchase && item.quantityAvailable > 0;
  const totalPrice = item.price * quantity;

  return (
    <div className="action-panel">
      <div className="price-section">
        <div className="price-main">NT$ {item.price.toLocaleString()}</div>
        {item.quantityAvailable > 0 && (
          <div className="quantity-selector">
            <label>數量：</label>
            <select
              value={quantity}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
              disabled={!canPurchase}
            >
              {Array.from({ length: Math.min(item.quantityAvailable, 10) }, (_, i) => i + 1).map(
                num => (
                  <option key={num} value={num}>{num}</option>
                )
              )}
            </select>
          </div>
        )}
        {quantity > 1 && (
          <div className="total-price">總計：NT$ {totalPrice.toLocaleString()}</div>
        )}
      </div>

      <div className="action-buttons">
        <button
          className={`btn-primary btn-full ${!canPurchase ? 'disabled' : ''}`}
          onClick={onAddToCart}
          disabled={!canPurchase}
          title={!canPurchase ? '此商品目前不提供直接購買' : ''}
        >
          加入購物車
        </button>

        <button
          className={`btn-primary btn-full ${!item.allowPurchase ? 'disabled' : ''}`}
          onClick={onPurchase}
          disabled={!item.allowPurchase}
          title={!item.allowPurchase ? '此商品目前不提供直接購買' : ''}
        >
          立即購買
        </button>

        <button
          className={`btn-primary btn-full ${!item.allowTrade ? 'disabled' : ''}`}
          onClick={onTrade}
          disabled={!item.allowTrade}
          title={!item.allowTrade ? '賣家未開放交換' : ''}
        >
          以物易物 (Trade)
        </button>

        <button
          className={`btn-secondary btn-full ${isInWatchlist ? 'active' : ''}`}
          onClick={onToggleWatchlist}
        >
          {isInWatchlist ? '✓ 已加入追蹤' : '加入追蹤'}
        </button>
      </div>

      <div className="shipping-section">
        <h4>運送方式：</h4>
        {item.shippingOptions.map((option, index) => (
          <div key={index} className="shipping-option">
            <strong>{option.type}</strong>
            {option.cost > 0 ? (
              <span> NT$ {option.cost}</span>
            ) : (
              <span className="free-shipping">免費</span>
            )}
            {option.description && (
              <div className="shipping-desc">{option.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ItemDetailPage: React.FC = () => {
  const [item] = useState<Item>(mockItem);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const handleAddToCart = () => {
    console.log('Add to cart:', { itemId: item.id, quantity });
    alert(`已將 ${quantity} 件商品加入購物車`);
  };

  const handlePurchase = () => {
    const total = item.price * quantity;
    const confirmed = window.confirm(
      `確認購買\n\n` +
      `商品：${item.title}\n` +
      `數量：${quantity}\n` +
      `單價：NT$ ${item.price.toLocaleString()}\n` +
      `總計：NT$ ${total.toLocaleString()}\n\n` +
      `確定要購買嗎？`
    );
    if (confirmed) {
      console.log('Purchase confirmed:', { itemId: item.id, quantity, total });
      alert('購買成功！將跳轉至付款頁面...');
    }
  };

  const handleTrade = () => {
    setIsTradeModalOpen(true);
  };

  const handleSubmitTargetTrade = (selectedItemIds: string[]) => {
    console.log('Submit target trade:', { itemId: item.id, offeredItems: selectedItemIds });
    alert('交換提案已送出！賣家將收到通知。');
  };

  const handleSubmitOfferTrade = (selectedItemIds: string[], message: string) => {
    console.log('Submit offer trade:', { itemId: item.id, offeredItems: selectedItemIds, message });
    alert('交換提案已送出！賣家將收到通知。');
  };

  const handleCreateTradeWish = () => {
    console.log('Create trade wish for item:', item.id);
    alert('已為你建立一筆開放式許願紀錄，其他賣家可針對此需求提出交換。');
  };

  const handleToggleWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    console.log('Watchlist toggled:', !isInWatchlist);
  };

  const handleOpenChat = () => {
    setIsChatModalOpen(true);
  };

  const handleSendMessage = () => {
    console.log('Send message to seller:', { seller: item.seller.name, message: chatMessage });
    alert('訊息已送出！');
    setChatMessage('');
    setIsChatModalOpen(false);
  };

  const getModeBadges = () => {
    const badges = [];
    if (item.allowPurchase) {
      badges.push({ label: '販售中', active: true });
    }
    if (item.allowTrade) {
      if (item.tradeMode === 'REQUEST_TARGET' || item.tradeMode === 'BOTH') {
        badges.push({ label: '可交換（指定目標）', active: true });
      }
      if (item.tradeMode === 'REQUEST_OFFER' || item.tradeMode === 'BOTH') {
        badges.push({ label: '開放式許願', active: true });
      }
    }
    return badges;
  };

  return (
    <div className="item-detail-page">
      {/* Header - simplified for now */}
      <header className="site-header">
        <div className="header-content">
          <div className="logo">二手交易平台</div>
          <nav className="header-nav">
            <a href="/">首頁</a>
            <a href="/categories">分類</a>
            <a href="/sell">賣東西</a>
          </nav>
          <div className="header-actions">
            <a href="/cart">購物車</a>
            <a href="/profile">我的帳號</a>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="breadcrumb">
          <a href="/">首頁</a> / <a href={`/category/${item.category}`}>{item.category}</a> /{' '}
          <a href={`/category/${item.category}/${item.subCategory}`}>{item.subCategory}</a>
        </div>

        <div className="item-layout">
          {/* Left Column - Image Gallery */}
          <div className="item-column-left">
            <ImageGallery images={item.images} title={item.title} />
          </div>

          {/* Center Column - Product Info */}
          <div className="item-column-center">
            <h1 className="item-title">{item.title}</h1>

            <div className="mode-badges">
              {getModeBadges().map((badge, index) => (
                <span key={index} className={`badge ${badge.active ? 'active' : ''}`}>
                  {badge.label}
                </span>
              ))}
            </div>

            <div className="item-attributes">
              <table className="attributes-table">
                <tbody>
                  <tr>
                    <td className="attr-label">商品狀況：</td>
                    <td>{item.condition}</td>
                  </tr>
                  <tr>
                    <td className="attr-label">所在地：</td>
                    <td>{item.location}</td>
                  </tr>
                  <tr>
                    <td className="attr-label">庫存數量：</td>
                    <td>{item.quantityAvailable} 件</td>
                  </tr>
                  <tr>
                    <td className="attr-label">標籤：</td>
                    <td>
                      <div className="tags">
                        {item.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="item-description">
              <h2>商品描述</h2>
              <div className="description-content">
                {item.description.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            {item.allowTrade && (
              <div className="trade-rules">
                <h2>交換規則</h2>
                {item.tradeMode === 'REQUEST_TARGET' && item.tradeTargetDescription && (
                  <p><strong>想換：</strong>{item.tradeTargetDescription}</p>
                )}
                {item.tradeMode === 'REQUEST_OFFER' && (
                  <p>接受開放交換，買家可提出任何商品提案</p>
                )}
                {item.tradeMode === 'BOTH' && (
                  <>
                    {item.tradeTargetDescription && (
                      <p><strong>想換：</strong>{item.tradeTargetDescription}</p>
                    )}
                    <p>也接受開放交換，買家可提出任何商品提案</p>
                  </>
                )}
              </div>
            )}

            <div className="item-stats">
              <span>瀏覽次數：{item.viewCount || 0}</span>
              <span>追蹤人數：{item.wishCount || 0}</span>
            </div>
          </div>

          {/* Right Column - Action Panel */}
          <div className="item-column-right">
            <ActionPanel
              item={item}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
              onPurchase={handlePurchase}
              onTrade={handleTrade}
              onToggleWatchlist={handleToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
            <SellerInfoCard seller={item.seller} onMessage={handleOpenChat} />
          </div>
        </div>
      </main>

      {/* Trade Modal */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        tradeMode={item.tradeMode}
        tradeTargetDescription={item.tradeTargetDescription}
        userItems={mockUserItems}
        onSubmitTargetTrade={handleSubmitTargetTrade}
        onSubmitOfferTrade={handleSubmitOfferTrade}
        onCreateTradeWish={handleCreateTradeWish}
      />

      {/* Chat Modal */}
      {isChatModalOpen && (
        <div className="modal-overlay" onClick={() => setIsChatModalOpen(false)}>
          <div className="modal-content chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>聯絡賣家：{item.seller.name}</h2>
              <button className="modal-close" onClick={() => setIsChatModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="輸入訊息..."
                rows={6}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsChatModalOpen(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSendMessage} disabled={!chatMessage.trim()}>
                送出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailPage;


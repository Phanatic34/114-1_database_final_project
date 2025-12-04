# 114-1 Database Final Project - 二手交易平台

A full-featured second-hand marketplace platform built with vanilla HTML, CSS, and JavaScript. This project implements a complete e-commerce system for buying, selling, and trading used items with transaction management, messaging, and review systems.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Key Features](#key-features)
- [Data Model](#data-model)
- [File Structure](#file-structure)
- [Usage Guide](#usage-guide)

## ✨ Features

### Core Functionality
- **User Authentication**: Registration, login, and session management
- **Item Management**: Create, edit, delete, and manage listings
- **Search & Filter**: Search by keywords, filter by categories
- **Transaction System**: Purchase requests, trade proposals, and transaction tracking
- **Messaging System**: Direct communication between buyers and sellers
- **Review System**: Post-transaction reviews and ratings (1-5 stars)
- **Image Gallery**: Product images with lightbox viewer
- **Responsive Design**: Mobile-friendly interface

### Advanced Features
- **Reservation System**: Items can be reserved when seller accepts a request
- **Handoff Confirmation**: Both parties must confirm in-person trade completion
- **7-Day Time Limit**: Handoff confirmation must occur within 7 days
- **Sold-Out Styling**: Visual indicators for sold items (grayscale, badge overlay)
- **Transaction Status Tracking**: Real-time status updates (pending → reserved → completed)
- **Recently Viewed Items**: Track and display browsing history

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: localStorage for client-side data persistence
- **Image Generation**: Pollinations.ai API for dynamic product images
- **No Frameworks**: Pure vanilla JS implementation

## 📁 Project Structure

```
.
├── index.html              # Homepage with trending items
├── item_list.html          # Item listing/search page
├── item_page.html          # Item detail page
├── sell.html               # Create new listing
├── my_items.html           # Seller's item management
├── requests.html           # Buyer's transaction requests
├── transactions.html       # Transaction history
├── messages.html           # Messaging center
├── login.html              # User login
├── register.html           # User registration
├── account.html            # User account settings
├── cart.html               # Shopping cart (placeholder)
├── chat.html               # Chat interface
├── js/
│   ├── data.js            # Data layer (localStorage management)
│   ├── item_page.js       # Item detail page logic
│   ├── images.js          # Image URL generation and fallback
│   ├── categories.js      # Category management
│   └── navbar.js          # Navigation bar logic
├── images/
│   └── no-image.png       # Fallback placeholder image
├── data/
│   └── itemsData.js       # Seed data for demo items
└── ItemDetailPage.css     # Main stylesheet
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server or build tools required - runs directly in browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Phanatic34/114-1_database_final_project.git
cd 114-1_database_final_project
```

2. Open in browser:
   - Simply open `index.html` in your web browser
   - Or use a local server (optional):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx http-server
     ```

3. Access the application:
   - Navigate to `http://localhost:8000` (if using server)
   - Or open `index.html` directly

### First Time Setup

1. **Register an account**: Click "註冊" (Register) to create a new user account
2. **Login**: Use your credentials to log in
3. **Browse items**: Explore trending items on the homepage
4. **Create listing**: Click "賣東西" (Sell Items) to post your first item

## 🎯 Key Features

### Transaction Flow

1. **Purchase Request**
   - Buyer clicks "立即購買" (Buy Now) on an item
   - Fills in quantity and optional message
   - Request is sent to seller

2. **Seller Response**
   - Seller sees request in "此商品的交易請求" section
   - Can accept or reject the request
   - When accepted, item status changes to "預約中" (Reserved)

3. **Handoff Confirmation**
   - Both buyer and seller see "已面交" (Complete Trade) button
   - Each party must independently confirm within 7 days
   - When both confirm, transaction status becomes "已完成" (Completed)
   - Item status changes to "已成交" (Sold)

4. **Review System**
   - After completion, both parties can leave reviews
   - 1-5 star rating with optional text comment
   - Reviews are stored and displayed

### Item Status System

- **active**: Item is available for purchase/trade
- **reserved**: Item is reserved for a specific buyer (after seller accepts)
- **sold**: Item transaction is completed (both parties confirmed handoff)

### Visual Indicators

- **Sold Items**: 
  - Grayscale images
  - Reduced opacity (70%)
  - "已售完" (Sold Out) badge overlay
  - Applied to all item cards (trending, recently viewed, search results)

## 📊 Data Model

### User
```javascript
{
  id: string,
  name: string,
  email: string,
  password: string,
  disabled?: boolean
}
```

### Item
```javascript
{
  id: string,
  sellerId: string,
  title: string,
  category: string,
  condition: string,
  price: number,
  description: string,
  tags: string[],
  location: string,
  quantity: number,
  modes: {
    sale: boolean,
    tradeTarget: boolean,
    tradeOpen: boolean
  },
  status: 'active' | 'reserved' | 'sold',
  images: string[],
  views: number,
  addedToCartCount: number,
  isActive: boolean,
  createdAt: string
}
```

### Transaction
```javascript
{
  id: string,
  itemId: string,
  sellerId: string,
  buyerId: string,
  type: 'purchase' | 'trade-open' | 'trade-target',
  status: 'pending' | 'declined' | 'reserved' | 'completed' | 'cancelled',
  quantity: number,
  createdAt: string,
  reservedAt?: string,
  completedAt?: string,
  sellerConfirmedAt?: string,
  buyerConfirmedAt?: string
}
```

### Review
```javascript
{
  id: string,
  itemId: string,
  transactionId: string,
  fromUserId: string,
  toUserId: string,
  rating: number, // 1-5
  comment: string,
  createdAt: string
}
```

## 📝 Usage Guide

### For Buyers

1. **Browse Items**: 
   - View trending items on homepage
   - Search by keyword or filter by category
   - Click any item card to view details

2. **Make Purchase Request**:
   - On item detail page, click "立即購買" (Buy Now)
   - Select quantity and add optional message
   - Confirm the request

3. **Track Requests**:
   - Go to "交易請求" page to see all your requests
   - Cancel pending requests if needed
   - View status updates

4. **Complete Transaction**:
   - When seller accepts, click "已面交" (Complete Trade) after meeting
   - Wait for seller to also confirm
   - Leave a review after completion

### For Sellers

1. **Create Listing**:
   - Click "賣東西" (Sell Items)
   - Fill in item details, upload images
   - Set price and trading modes
   - Publish the listing

2. **Manage Listings**:
   - Go to "我的商品" (My Items) to see all your listings
   - Edit or delete items
   - View transaction requests for each item

3. **Handle Requests**:
   - On item detail page, see "此商品的交易請求" section
   - Accept or reject buyer requests
   - When accepting, item becomes reserved

4. **Complete Transaction**:
   - Click "已面交" (Complete Trade) after meeting buyer
   - Wait for buyer to also confirm
   - Leave a review after completion

## 🔧 Technical Details

### Data Persistence
- All data stored in browser's localStorage
- Data persists across sessions
- No backend server required

### Image Handling
- Dynamic image generation using Pollinations.ai API
- Automatic fallback to local placeholder if API fails
- Image lightbox viewer for product galleries

### State Management
- Centralized data layer in `js/data.js`
- Helper functions for CRUD operations
- Status normalization for consistent data structure

## 🎨 Design Features

- **Modern UI**: Clean, card-based design
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Hover effects and transitions
- **Visual Feedback**: Status indicators, badges, and color coding
- **Accessibility**: Semantic HTML and ARIA labels

## 📌 Notes

- This is a client-side only application (no backend)
- Data is stored in browser localStorage (clears if browser data is cleared)
- Password storage is plain text (for demo purposes only)
- Image generation requires internet connection for Pollinations.ai API

## 🔮 Future Improvements

- [ ] Backend API integration
- [ ] Database persistence
- [ ] User authentication with JWT
- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Advanced search filters
- [ ] Image upload functionality
- [ ] Real-time messaging
- [ ] Admin dashboard

## 📄 License

This project is part of a database course final project (114-1).

## 👥 Contributors

- Group 22 - Database Final Project

---

**Note**: This is a standalone HTML version for quick preview. For full functionality, refer to the React version (ItemDetailPage.tsx) if available.

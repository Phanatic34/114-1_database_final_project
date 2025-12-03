# Item Detail Page - Implementation Guide

## Overview

This is the item detail page component for the second-hand trading platform. It supports three interaction modes:
- **販售 (Purchase)**: Direct purchase of items
- **交換 (Trade)**: Item-for-item trading
- **開放式許願 (Open Wish / TRADE_WISH)**: Open trade requests

## Files Created

1. **`ItemDetailPage.tsx`** - Main React component
2. **`ItemDetailPage.css`** - Styling with blue color scheme
3. **`types.ts`** - TypeScript type definitions

## Features

### Layout
- **3-column layout** (desktop): Image gallery (left), product info (center), action panel (right)
- **Responsive design**: Stacks vertically on mobile/tablet
- **Blue color scheme**: Primary color `#0064D2` matching Tixcraft style

### Components

1. **ImageGallery**
   - Main large image display
   - Thumbnail strip for image selection
   - Condition badge overlay

2. **ActionPanel**
   - Price display
   - Quantity selector
   - Action buttons:
     - Add to Cart (disabled if purchase not allowed)
     - Purchase (disabled if purchase not allowed)
     - Trade (disabled if trade not allowed)
     - Add to Watchlist (always enabled)
   - Shipping options display

3. **TradeModal**
   - Handles three trade modes:
     - **REQUEST_TARGET**: Seller wants specific items
     - **REQUEST_OFFER**: Seller accepts any proposals
     - **BOTH**: Combination of both
   - Item selection interface
   - Trade wish creation flow

4. **SellerInfoCard**
   - Seller profile display
   - Rating and stats
   - Contact seller button

### Interaction Modes

#### Purchase Mode (`allowPurchase: true`)
- "加入購物車" and "立即購買" buttons enabled
- Shows price and quantity selector
- Purchase confirmation modal

#### Trade Mode (`allowTrade: true`)
- "以物易物 (Trade)" button enabled
- Trade modal opens based on `tradeMode`:
  - **REQUEST_TARGET**: Shows seller's requirements, filters user items
  - **REQUEST_OFFER**: Allows user to select any items
  - **BOTH**: Shows requirements + allows open offers

#### Trade Wish Flow
- Triggered when user has no matching items in REQUEST_TARGET mode
- Creates a TRADE_WISH record (stubbed for now)
- Other sellers can later propose trades

## Usage

### Basic Setup

```tsx
import ItemDetailPage from './ItemDetailPage';

function App() {
  return <ItemDetailPage />;
}
```

### With Custom Data

The component currently uses mock data. To integrate with your API:

1. Replace the `mockItem` constant with props or API call
2. Replace `mockUserItems` with actual user's items from your backend
3. Update handler functions to call your API endpoints

Example:

```tsx
interface ItemDetailPageProps {
  itemId: string;
}

const ItemDetailPage: React.FC<ItemDetailPageProps> = ({ itemId }) => {
  const [item, setItem] = useState<Item | null>(null);
  
  useEffect(() => {
    // Fetch item data
    fetchItem(itemId).then(setItem);
  }, [itemId]);
  
  if (!item) return <div>Loading...</div>;
  
  // Use item data instead of mockItem
  // ...
};
```

## Data Model

See `types.ts` for complete type definitions. Key interfaces:

- **Item**: Complete item data including seller info, trade settings, etc.
- **TradeMode**: `"REQUEST_TARGET" | "REQUEST_OFFER" | "BOTH"`
- **ShippingOption**: Shipping method and cost
- **SellerInfo**: Seller profile data

## Styling

The CSS uses CSS variables for easy theming:

```css
--primary-blue: #0064D2;
--primary-blue-dark: #0052A3;
--primary-blue-light: #0078E8;
--accent-blue: #E6F2FF;
```

All buttons, badges, and highlights use the blue color scheme.

## Button States

### Enabled Buttons
- Blue background (`--primary-blue`)
- White text
- Hover effect with darker blue

### Disabled Buttons
- Grey background (`--bg-disabled`)
- Grey text (`--text-disabled`)
- No hover effect
- Tooltip on hover (via `title` attribute)

## Modal Flows

### Purchase Modal
- Shows item details, quantity, total price
- Confirmation dialog
- Stubbed payment flow

### Trade Modal
- Item selection grid
- Message input (for REQUEST_OFFER mode)
- Submit button (disabled if no items selected)
- Trade wish creation option (if no matching items)

### Chat Modal
- Simple textarea for messaging seller
- Send button (disabled if message empty)
- Stubbed to console.log for now

## Next Steps

1. **Backend Integration**
   - Replace mock data with API calls
   - Implement actual purchase flow
   - Implement trade request submission
   - Implement trade wish creation

2. **Real-time Features**
   - Connect chat to messaging system
   - Update watchlist count in real-time
   - Show live availability

3. **Enhancements**
   - Image zoom functionality
   - Related items section
   - Review/rating display
   - Share functionality

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile, tablet, desktop
- CSS Grid and Flexbox required


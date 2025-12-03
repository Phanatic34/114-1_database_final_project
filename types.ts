// Type definitions for the item detail page

export type TradeMode = "REQUEST_TARGET" | "REQUEST_OFFER" | "BOTH";

export interface ShippingOption {
  type: "面交" | "宅配";
  cost: number;
  description?: string;
}

export interface SellerInfo {
  name: string;
  rating: number;
  completedDeals: number;
  since: string; // Date string
}

export interface Item {
  id: string;
  title: string;
  images: string[];
  price: number;
  condition: string; // e.g., "全新", "九成新"
  description: string;
  category: string;
  subCategory: string;
  tags: string[];
  location: string;
  shippingOptions: ShippingOption[];
  quantityAvailable: number;
  seller: SellerInfo;
  allowPurchase: boolean;
  allowTrade: boolean;
  tradeMode: TradeMode;
  tradeTargetDescription?: string;
  createdAt?: string;
  viewCount?: number;
  wishCount?: number;
}

export interface UserItem {
  id: string;
  title: string;
  image: string;
  category: string;
  tags: string[];
}


// ================================
// TORCH SPORTS — Shared Types
// ================================

// ─── Enums ──────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  SUPPLIER = 'SUPPLIER',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  COD = 'COD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

// ─── User Types ─────────────────
export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Product Types ───────────────
export interface IProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  sku: string;
  status: ProductStatus;
  categoryId: string;
  brandId: string;
  images: string[];
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductVariant {
  id: string;
  productId: string;
  size?: string;
  color?: string;
  material?: string;
  price: number;
  sku: string;
  stock: number;
}

// ─── Order Types ─────────────────
export interface IOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  discount: number;
  paymentMethod: PaymentMethod;
  items: IOrderItem[];
  addressId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  id: string;
  orderId: string;
  productVariantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ─── Auth Types ──────────────────
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── API Response Types ──────────
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Sport Types ─────────────────
export interface ISport {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'owner' | 'manager' | 'supervisor' | 'bartender' | 'waitstaff';
  email?: string;
  phone?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  _count?: { products: number };
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  category?: Category;
  unit: string;
  stockQuantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  buyingPrice: number;
  sellingPrice: number;
  supplier?: string;
  expiryDate?: string;
  imageUrl?: string;
  barcode?: string;
  status: 'active' | 'discontinued' | 'out_of_stock';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerType: 'walkin' | 'table' | 'event' | 'takeaway';
  customerName?: string;
  tableNumber?: string;
  eventName?: string;
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded';
  orderStatus: 'received' | 'preparing' | 'ready' | 'served' | 'cancelled';
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  orders: {
    today: number;
    total: number;
  };
  revenue: {
    today: number;
    total: number;
  };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { Product, OrderItem, Category } from '../types';
import {
  FiSearch, FiPlus, FiMinus, FiTrash2, FiShoppingCart,
  FiClock, FiUser, FiAlertTriangle, FiX,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import ReceiptModal from '../components/ReceiptModal';

const categoryIcons: Record<string, string> = {
  Beers: '🍺', Spirits: '🥃', Cocktails: '🍹', 'Soft Drinks': '🥤',
  Water: '💧', Juices: '🧃', 'Energy Drinks': '⚡', Mixers: '🥂',
  Snacks: '🥜', Wines: '🍷',
};

const paymentButtons = [
  { value: 'cash', label: 'Cash', icon: '💵', color: 'bg-green-500' },
  { value: 'momo_mtn', label: 'MTN', icon: '📱', color: 'bg-yellow-500' },
  { value: 'momo_vodafone', label: 'Voda', icon: '📱', color: 'bg-red-500' },
  { value: 'momo_airteltigo', label: 'AT', icon: '📱', color: 'bg-red-600' },
  { value: 'crypto_stablecoin', label: 'Crypto', icon: '🪙', color: 'bg-purple-500' },
];

const POSPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [customerType, setCustomerType] = useState<'walkin' | 'table' | 'takeaway'>('walkin');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStats, setTodayStats] = useState({ revenue: 0, orders: 0 });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showLowStockBanner, setShowLowStockBanner] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setCart([]);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Fetch categories
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  // Fetch today's stats
  useEffect(() => {
    api.get('/analytics/dashboard').then((res) => {
      const s = res.data?.summary;
      if (s) setTodayStats({ revenue: s.todayRevenue || 0, orders: s.todayOrders || 0 });
    }).catch(() => {});
  }, [receipt]);

  const fetchProducts = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category = String(selectedCategory);
      const response = await api.get('/products', { params });
      const allProducts = response.data;
      setProducts(allProducts);

      // Check low stock
      const low = allProducts.filter((p: Product) => p.stockQuantity > 0 && p.stockQuantity <= p.reorderLevel);
      setLowStockCount(low.length);
      setShowLowStockBanner(low.length > 0);
    } catch {
      toast.error('Failed to load products');
    }
  };

  const addToCart = useCallback((product: Product) => {
    if (product.stockQuantity <= 0) {
      toast.warning(`${product.name} is out of stock`);
      return;
    }

    const price = Number(product.sellingPrice);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 300);

    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        toast.warning('Not enough stock');
        return;
      }
      setCart(cart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
          : item
      ));
    } else {
      setCart([...cart, { productId: product.id, product, quantity: 1, unitPrice: price, total: price }]);
    }
  }, [cart]);

  const updateQuantity = (productId: number, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null as any;
          return { ...item, quantity: newQty, total: newQty * item.unitPrice };
        }
        return item;
      }).filter(Boolean) as OrderItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => { setCart([]); setCustomerName(''); setTableNumber(''); };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  const processSale = async () => {
    if (cart.length === 0) { toast.warning('Cart is empty'); return; }
    setProcessing(true);
    try {
      const res = await api.post('/orders', {
        customerType,
        customerName: customerName || undefined,
        tableNumber: tableNumber || undefined,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        taxRate: 0, paymentMethod,
      });

      const order = res.data;
      setReceipt({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerType: order.customerType,
        items: cart.map((item) => ({
          name: item.product?.name || 'Item',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount || 0,
        taxAmount: order.taxAmount || 0,
        total: order.total,
        paymentMethod,
        createdAt: order.createdAt,
        staffName: user.fullName || user.username || 'Staff',
      });

      // Refresh products to get updated stock
      fetchProducts();
      setCart([]);
      setCustomerName('');
      setTableNumber('');
      toast.success('Sale completed!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadge = (product: Product) => {
    if (product.stockQuantity <= 0) return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">OUT</span>;
    if (product.stockQuantity <= product.reorderLevel) return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">LOW</span>;
    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between rounded-t-xl mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FiUser size={14} />
            <span className="text-sm font-medium">{user.fullName || user.username || 'Staff'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-blue-200 text-sm">
            <FiClock size={14} />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:inline">💰 Today: <strong>GHS {Number(todayStats.revenue).toFixed(2)}</strong></span>
          <span className="hidden sm:inline">📋 Orders: <strong>{todayStats.orders}</strong></span>
        </div>
      </div>

      {/* Low Stock Warning */}
      {showLowStockBanner && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-700 text-sm">
            <FiAlertTriangle className="text-orange-500" />
            <span><strong>{lowStockCount}</strong> product{lowStockCount > 1 ? 's' : ''} low on stock</span>
          </div>
          <button onClick={() => setShowLowStockBanner(false)} className="text-orange-400 hover:text-orange-600">
            <FiX size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search & Category Filter */}
          <div className="card mb-3 !py-2">
            <div className="flex gap-2 mb-2">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search products... (Ctrl+/ to focus)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 !py-2"
                />
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  !selectedCategory ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCategory('')}
              >
                🏪 All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {categoryIcons[cat.name] || '📦'} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stockQuantity <= 0}
                  className={`card p-3 text-left transition-all duration-200 relative
                    ${product.stockQuantity <= 0 ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm active:scale-95'}
                    ${addedProductId === product.id ? 'ring-2 ring-blue-400 scale-95' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-900 text-sm truncate pr-1">
                      {categoryIcons[product.category?.name || ''] || '📦'} {product.name}
                    </p>
                    {getStockBadge(product)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{product.unit}</p>
                  <p className="text-blue-600 font-bold mt-1 text-sm">GHS {Number(product.sellingPrice).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">Stock: {product.stockQuantity}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-full lg:w-[420px] flex flex-col">
          <div className="card flex-1 flex flex-col !p-0 overflow-hidden">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FiShoppingCart className="text-blue-600" /> Cart
              </h3>
              <div className="flex items-center gap-2">
                <span className="badge-info">{cart.length} items</span>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FiShoppingCart className="mx-auto h-12 w-12 mb-3 text-gray-300" />
                  <p className="font-medium">Cart is empty</p>
                  <p className="text-xs mt-1">Tap products to add them</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg transition-all">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">GHS {Number(item.unitPrice).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="p-1.5 hover:bg-white rounded-md transition-colors">
                        <FiMinus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="p-1.5 hover:bg-white rounded-md transition-colors">
                        <FiPlus size={12} />
                      </button>
                      <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md ml-1 transition-colors">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Section */}
            <div className="border-t p-5 space-y-3 bg-gray-50">
              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as any)}
                  className="input-field text-sm !py-1.5"
                >
                  <option value="walkin">Walk-in</option>
                  <option value="table">Table</option>
                  <option value="takeaway">Takeaway</option>
                </select>
                {customerType === 'table' && (
                  <input type="text" placeholder="Table #" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="input-field text-sm !py-1.5" />
                )}
                {customerType !== 'table' && (
                  <input type="text" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input-field text-sm !py-1.5" />
                )}
              </div>

              {/* Payment Method Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {paymentButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setPaymentMethod(btn.value)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-all text-center ${
                      paymentMethod === btn.value
                        ? `${btn.color} text-white shadow-sm ring-2 ring-offset-1 ring-blue-300`
                        : 'bg-white text-gray-600 border hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-base">{btn.icon}</span>
                    <span className="block mt-0.5">{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-blue-600">GHS {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={processSale}
                disabled={cart.length === 0 || processing}
                className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Processing...
                  </span>
                ) : (
                  `Complete Sale (Enter)`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
};

export default POSPage;

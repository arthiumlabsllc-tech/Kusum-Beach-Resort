import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Product, OrderItem, Category } from '../types';
import {
  FiSearch, FiShoppingCart,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';

const categoryIcons: Record<string, string> = {
  Beers: '🍺', Spirits: '🥃', Cocktails: '🍹', 'Soft Drinks': '🥤',
  Water: '💧', Juices: '🧃', 'Energy Drinks': '⚡', Mixers: '🥂',
  Snacks: '🥜', Wines: '🍷',
};

const POSPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [customerType, setCustomerType] = useState<'walkin' | 'table' | 'takeaway'>('walkin');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch categories
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category = String(selectedCategory);
      const response = await api.get('/products', { params });
      setProducts(response.data);
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

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setTableNumber('');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCharge = () => {
    if (cart.length === 0) return;
    setPaymentOpen(true);
  };

  const handlePaymentSubmit = async (method: string, _amountPaid: number) => {
    setPaymentMethod(method);
    setProcessing(true);
    try {
      const res = await api.post('/orders', {
        customerType,
        customerName: customerName || undefined,
        tableNumber: tableNumber || undefined,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        taxRate: 0,
        paymentMethod: method,
      });

      const order = res.data.order;
      setReceipt({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerType: order.customerType,
        items: cart.map((item) => ({
          name: item.product?.name || 'Item',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount) || 0,
        taxAmount: Number(order.taxAmount) || 0,
        total: Number(order.total),
        paymentMethod: method,
        createdAt: order.createdAt,
        staffName: user.fullName || user.username || 'Staff',
      });

      setPaymentOpen(false);
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

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStock = !onlyInStock || p.stockQuantity > 0;
    return matchesSearch && matchesStock;
  });

  return (
    <div className="flex min-h-0 flex-col lg:h-[calc(100vh-6rem)] lg:flex-row">
      {/* ===== Product Grid (Left) ===== */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="space-y-3 border-b border-gray-200 bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Category Dropdown */}
            <div className="sm:w-52">
              <select
                value={selectedCategory === '' ? '' : String(selectedCategory)}
                onChange={(e) => setSelectedCategory(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {categoryIcons[cat.name] || '📦'} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* In Stock Toggle */}
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            In stock only
          </label>
        </div>

        {/* Product Tiles */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FiShoppingCart className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                {products.length === 0 ? 'No products yet' : 'Nothing matches that'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {products.length === 0
                  ? 'Add products in Inventory'
                  : 'Try a different search or clear the category filter'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const sellable = product.stockQuantity > 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!sellable}
                    onClick={() => addToCart(product)}
                    className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors min-h-[100px] ${
                      !sellable
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                        : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {categoryIcons[product.category?.name || ''] || '📦'} {product.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {product.unit}
                      </span>
                    </span>
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <span className="text-sm font-semibold text-blue-700">
                        GHS {Number(product.sellingPrice).toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          / {product.unit}
                        </span>
                      </span>
                      <span className={`text-xs font-medium ${sellable ? 'text-gray-600' : 'text-red-600'}`}>
                        {sellable ? `${product.stockQuantity} in stock` : 'Out of stock'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Basket Panel (Right) ===== */}
      <section className="flex min-h-0 w-full flex-col bg-white lg:w-96 lg:shrink-0 lg:border-l border-gray-200">
        {/* Basket Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Basket
            <span className="ml-2 text-sm font-normal text-gray-500">
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
            </span>
          </h2>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="text-sm text-gray-500 hover:text-red-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Basket Items */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Tap a product to start a sale.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {cart.map((item) => (
                <li key={item.productId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{item.product?.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        GHS {Number(item.unitPrice).toFixed(2)} per {item.product?.unit || 'unit'}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.product?.name}`}
                      onClick={() => removeFromCart(item.productId)}
                      className="shrink-0 text-xl text-gray-400 hover:text-red-600 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-base font-semibold tabular-nums text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {/* Line Total */}
                    <span className="ml-auto text-sm font-semibold text-gray-900">
                      GHS {Number(item.total).toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Basket Footer — Totals & Charge */}
        {cart.length > 0 && (
          <div className="space-y-3 border-t border-gray-200 px-4 py-3">
            {/* Customer Type Row */}
            <div className="flex gap-2">
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="py-2 px-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 shrink-0"
              >
                <option value="walkin">Walk-in</option>
                <option value="table">Table</option>
                <option value="takeaway">Takeaway</option>
              </select>
              {customerType === 'table' ? (
                <input
                  type="text"
                  placeholder="Table number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Totals */}
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Subtotal</dt>
                <dd>GHS {subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                <dt>Total</dt>
                <dd>GHS {total.toFixed(2)}</dd>
              </div>
            </dl>

            {/* Charge Button */}
            <button
              onClick={handleCharge}
              disabled={cart.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-lg font-semibold text-white shadow-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              Charge GHS {total.toFixed(2)}
            </button>
          </div>
        )}
      </section>

      {/* ===== Payment Modal ===== */}
      <PaymentModal
        open={paymentOpen}
        total={total}
        onSubmit={handlePaymentSubmit}
        onClose={() => setPaymentOpen(false)}
        submitting={processing}
      />

      {/* ===== Receipt Modal ===== */}
      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
};

export default POSPage;

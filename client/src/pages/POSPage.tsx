import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Product, OrderItem } from '../types';
import { FiSearch, FiPlus, FiMinus, FiTrash2, FiShoppingCart } from 'react-icons/fi';
import { toast } from 'react-toastify';

const POSPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerType, setCustomerType] = useState<'walkin' | 'table' | 'takeaway'>('walkin');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const fetchProducts = async () => {
    try {
      const params: any = {};
      if (categoryFilter) params.category = categoryFilter;
      const response = await api.get('/products', { params });
      setProducts(response.data.filter((p: Product) => p.stockQuantity > 0));
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const addToCart = (product: Product) => {
    const price = Number(product.sellingPrice);
    const existing = cart.find((item) => item.productId === product.id);

    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        toast.warning('Not enough stock');
        return;
      }
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: price,
          total: price,
        },
      ]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty, total: newQty * item.unitPrice };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = 0;
  const total = subtotal + tax;

  const processSale = async () => {
    if (cart.length === 0) {
      toast.warning('Cart is empty');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/orders', {
        customerType,
        customerName: customerName || undefined,
        tableNumber: tableNumber || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        taxRate: 0,
        paymentMethod,
      });

      toast.success('Sale completed successfully!');
      setCart([]);
      setCustomerName('');
      setTableNumber('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="card mb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="card p-3 text-left hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                <p className="text-xs text-gray-500">{product.unit}</p>
                <p className="text-primary-600 font-bold mt-1">GHS {Number(product.sellingPrice).toFixed(2)}</p>
                <p className="text-xs text-gray-400">Stock: {product.stockQuantity}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-96 flex flex-col">
        <div className="card flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FiShoppingCart className="mr-2" /> Cart
            </h3>
            <span className="badge-info">{cart.length} items</span>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiShoppingCart className="mx-auto h-12 w-12 mb-2" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                    <p className="text-xs text-gray-500">GHS {Number(item.unitPrice).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <FiMinus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <FiPlus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded ml-1"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Order Details */}
          <div className="border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="input-field text-sm"
              >
                <option value="walkin">Walk-in</option>
                <option value="table">Table</option>
                <option value="takeaway">Takeaway</option>
              </select>
              {customerType === 'table' && (
                <input
                  type="text"
                  placeholder="Table #"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="input-field text-sm"
                />
              )}
            </div>

            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field text-sm"
            />

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-field text-sm"
            >
              <option value="cash">Cash</option>
              <option value="momo_mtn">MTN MoMo</option>
              <option value="momo_vodafone">Vodafone Cash</option>
              <option value="momo_airteltigo">AirtelTigo Money</option>
              <option value="crypto_stablecoin">Crypto (Stablecoin)</option>
            </select>

            {/* Totals */}
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>GHS {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 mt-1">
                <span>Total</span>
                <span>GHS {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={processSale}
              disabled={cart.length === 0 || processing}
              className="btn-primary w-full py-3"
            >
              {processing ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPage;

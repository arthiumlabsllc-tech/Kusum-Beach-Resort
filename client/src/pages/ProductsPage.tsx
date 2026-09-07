import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Category } from '../types';
import { FiSearch, FiPackage, FiAlertTriangle, FiXCircle, FiClock, FiCheckCircle, FiFilter } from 'react-icons/fi';
import { toast } from 'react-toastify';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichedProduct {
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
  stockLevel: 'out' | 'low' | 'ok';
  expiryState: 'none' | 'expired' | 'soon' | 'ok';
  daysUntilExpiry: number | null;
}

interface InventoryAlerts {
  products: EnrichedProduct[];
  summary: {
    total: number;
    lowStock: number;
    outOfStock: number;
    expiringSoon: number;
    expired: number;
  };
  lowStockProducts: EnrichedProduct[];
  outOfStockProducts: EnrichedProduct[];
  expiringProducts: EnrichedProduct[];
}

// ---------------------------------------------------------------------------
// Badge helpers — matching the pharmacy reference project's design
// ---------------------------------------------------------------------------

type StockLevel = 'out' | 'low' | 'ok';
type ExpiryState = 'none' | 'expired' | 'soon' | 'ok';

const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  out: 'Out of stock',
  low: 'Low stock',
  ok: 'In stock',
};

const STOCK_LEVEL_STYLE: Record<StockLevel, string> = {
  out: 'bg-red-100 text-red-800 border-red-200',
  low: 'bg-amber-100 text-amber-800 border-amber-200',
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const EXPIRY_LABEL: Record<ExpiryState, string> = {
  none: 'No expiry',
  expired: 'Expired',
  soon: 'Expiring soon',
  ok: 'In date',
};

const EXPIRY_STYLE: Record<ExpiryState, string> = {
  none: 'bg-gray-100 text-gray-600 border-gray-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  soon: 'bg-amber-100 text-amber-800 border-amber-200',
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

type TabFilter = 'all' | 'low' | 'out' | 'expiring';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProductsPage = () => {
  const [data, setData] = useState<InventoryAlerts | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, categoriesRes] = await Promise.all([
        api.get('/products/inventory-alerts'),
        api.get('/products/categories'),
      ]);
      setData(alertsRes.data);
      setCategories(categoriesRes.data);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived product list based on tab + search + category
  const filteredProducts = (data?.products ?? []).filter((p: EnrichedProduct) => {
    // Tab filter
    if (tab === 'low' && p.stockLevel !== 'low') return false;
    if (tab === 'out' && p.stockLevel !== 'out') return false;
    if (tab === 'expiring' && p.expiryState !== 'soon' && p.expiryState !== 'expired') return false;

    // Category filter
    if (categoryFilter && p.categoryId !== parseInt(categoryFilter, 10)) return false;

    // Search
    if (search) {
      const term = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.category?.name ?? '').toLowerCase().includes(term) ||
        (p.barcode ?? '').toLowerCase().includes(term)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const summary = data?.summary ?? { total: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0, expired: 0 };

  const tabs: { key: TabFilter; label: string; count: number; icon: React.ElementType; color: string }[] = [
    { key: 'all', label: 'All Products', count: summary.total, icon: FiPackage, color: 'text-blue-600' },
    { key: 'low', label: 'Low Stock', count: summary.lowStock, icon: FiAlertTriangle, color: 'text-amber-600' },
    { key: 'out', label: 'Out of Stock', count: summary.outOfStock, icon: FiXCircle, color: 'text-red-600' },
    { key: 'expiring', label: 'Expiring', count: summary.expiringSoon + summary.expired, icon: FiClock, color: 'text-orange-600' },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-500 mt-1">Every product, its stock level and expiry status</p>
        </div>
        <button
          onClick={fetchData}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <FiPackage className="mr-2" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <FiPackage size={14} /> Total
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
            <FiCheckCircle size={14} /> In Stock
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {summary.total - summary.lowStock - summary.outOfStock}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1">
            <FiAlertTriangle size={14} /> Low Stock
          </div>
          <p className="text-2xl font-bold text-amber-700">{summary.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
            <FiXCircle size={14} /> Out of Stock
          </div>
          <p className="text-2xl font-bold text-red-700">{summary.outOfStock}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 text-xs font-medium mb-1">
            <FiClock size={14} /> Expiring
          </div>
          <p className="text-2xl font-bold text-orange-700">{summary.expiringSoon + summary.expired}</p>
        </div>
      </div>

      {/* Expiring / Expired Banner */}
      {summary.expired > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <FiXCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {summary.expired} product{summary.expired > 1 ? 's' : ''} expired
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Remove these from shelves immediately. They can no longer be sold.
            </p>
          </div>
        </div>
      )}

      {summary.expiringSoon > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <FiClock className="text-amber-600 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {summary.expiringSoon} product{summary.expiringSoon > 1 ? 's' : ''} expiring within 90 days
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Consider discounting or returning these items before they expire.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={14} className={tab === t.key ? t.color : ''} />
            {t.label}
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, category or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                </option>
              ))}
            </select>
            {(search || categoryFilter || tab !== 'all') && (
              <button
                onClick={() => { setSearch(''); setCategoryFilter(''); setTab('all'); }}
                className="px-3 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg flex items-center gap-1"
              >
                <FiFilter size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FiPackage className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}

        {filteredProducts.map((product: EnrichedProduct) => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Name + badges */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STOCK_LEVEL_STYLE[product.stockLevel]}`}>
                    {STOCK_LEVEL_LABEL[product.stockLevel]}
                  </span>
                  {product.expiryState !== 'none' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${EXPIRY_STYLE[product.expiryState]}`}>
                      {EXPIRY_LABEL[product.expiryState]}
                    </span>
                  )}
                  {product.status === 'discontinued' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
                      Discontinued
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {product.unit}
                  {product.category?.name ? ` · ${product.category.name}` : ''}
                  {product.expiryDate && product.expiryState !== 'none'
                    ? ` · expires ${formatDate(product.expiryDate)}`
                    : ''}
                  {product.daysUntilExpiry !== null && product.daysUntilExpiry >= 0 && product.expiryState !== 'none'
                    ? ` (${product.daysUntilExpiry}d left)`
                    : ''}
                  {product.daysUntilExpiry !== null && product.daysUntilExpiry < 0
                    ? ` (${Math.abs(product.daysUntilExpiry)}d ago)`
                    : ''}
                </p>
              </div>

              {/* Right: Stock + Price */}
              <div className="shrink-0 text-right">
                <p className="text-base font-semibold text-gray-900">
                  {product.stockQuantity}{' '}
                  <span className="text-xs font-normal text-gray-500">units</span>
                </p>
                <p className="text-xs text-gray-500">
                  GHS {product.sellingPrice.toFixed(2)} · Reorder at {product.reorderLevel}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      {filteredProducts.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          Showing {filteredProducts.length} of {data?.products.length ?? 0} products
        </p>
      )}
    </div>
  );
};

export default ProductsPage;

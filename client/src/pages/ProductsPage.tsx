import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Product, Category } from '../types';
import { FiSearch, FiFilter, FiPlus, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    fetchData();
  }, [categoryFilter, showLowStock]);

  const fetchData = async () => {
    try {
      const params: any = {};
      if (categoryFilter) params.category = categoryFilter;
      if (showLowStock) params.lowStock = 'true';

      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products', { params }),
        api.get('/products/categories'),
      ]);

      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (product: Product) => {
    if (product.stockQuantity === 0) {
      return <span className="badge-danger">Out of Stock</span>;
    }
    if (product.stockQuantity <= product.reorderLevel) {
      return <span className="badge-warning">Low Stock</span>;
    }
    return <span className="badge-success">In Stock</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-500 mt-1">{products.length} products in inventory</p>
        </div>
        <button className="btn-primary mt-4 sm:mt-0 flex items-center">
          <FiPlus className="mr-2" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
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
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowLowStock(!showLowStock)}
              className={`btn-secondary flex items-center ${showLowStock ? 'bg-yellow-100 border-yellow-300' : ''}`}
            >
              <FiAlertTriangle className="mr-2" /> Low Stock
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price (GHS)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.unit}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {product.category?.icon} {product.category?.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{product.stockQuantity}</div>
                    <div className="text-xs text-gray-500">
                      Reorder: {product.reorderLevel}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      GHS {Number(product.sellingPrice).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cost: GHS {Number(product.buyingPrice).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(product)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;

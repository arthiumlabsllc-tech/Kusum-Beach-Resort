import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';

const ReportsPage = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'sales' ? '/reports/sales' : '/reports/inventory';
      const response = await api.get(endpoint);
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-500 mt-1">Business insights and inventory reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            activeTab === 'sales' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Sales Report
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            activeTab === 'inventory' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inventory Report
        </button>
      </div>

      {activeTab === 'sales' && reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-primary-600">
                GHS {reportData.summary?.totalRevenue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-green-600">{reportData.summary?.totalOrders || 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Avg Order Value</p>
              <p className="text-3xl font-bold text-orange-600">
                GHS {reportData.summary?.avgOrderValue?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
            <div className="space-y-2">
              {reportData.topProducts?.slice(0, 10).map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <span className="w-6 text-sm text-gray-400">{index + 1}.</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">{product.quantity} sold</span>
                    <span className="ml-4 font-medium text-primary-600">GHS {product.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-3xl font-bold text-blue-600">{reportData.summary?.totalProducts || 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Cost Value</p>
              <p className="text-2xl font-bold text-gray-600">
                GHS {reportData.summary?.totalCostValue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Retail Value</p>
              <p className="text-2xl font-bold text-green-600">
                GHS {reportData.summary?.totalRetailValue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Potential Profit</p>
              <p className="text-2xl font-bold text-primary-600">
                GHS {reportData.summary?.potentialProfit?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Low Stock Alert */}
          {reportData.lowStock?.length > 0 && (
            <div className="card border-yellow-200 bg-yellow-50">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Low Stock Alert</h3>
              <div className="space-y-1">
                {reportData.lowStock.map((product: any) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-yellow-800">{product.name}</span>
                    <span className="font-medium text-yellow-900">{product.stockQuantity} remaining</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Out of Stock */}
          {reportData.outOfStock?.length > 0 && (
            <div className="card border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Out of Stock</h3>
              <div className="space-y-1">
                {reportData.outOfStock.map((product: any) => (
                  <div key={product.id} className="text-sm text-red-800">
                    {product.name} ({product.category?.name})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

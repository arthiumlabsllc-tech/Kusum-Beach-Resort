import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { FiPackage, FiAlertTriangle, FiXCircle, FiShoppingCart, FiDollarSign } from 'react-icons/fi';

interface DashboardData {
  summary: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    todayOrders: number;
    todayRevenue: number;
    totalRevenue: number;
    activeAlerts: number;
  };
}

const DashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = data?.summary;

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: FiPackage,
      color: 'bg-blue-500',
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStock || 0,
      icon: FiAlertTriangle,
      color: 'bg-yellow-500',
    },
    {
      title: 'Out of Stock',
      value: stats?.outOfStock || 0,
      icon: FiXCircle,
      color: 'bg-red-500',
    },
    {
      title: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: FiShoppingCart,
      color: 'bg-green-500',
    },
    {
      title: "Today's Revenue",
      value: `GHS ${Number(stats?.todayRevenue || 0).toFixed(2)}`,
      icon: FiDollarSign,
      color: 'bg-primary-500',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Welcome to Kusum Beach Management Platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/pos" className="block w-full btn-primary text-center py-3">
              New Sale (POS)
            </Link>
            <Link to="/inventory" className="block w-full btn-secondary text-center py-3">
              View Inventory
            </Link>
            <Link to="/orders" className="block w-full btn-secondary text-center py-3">
              View Orders
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Revenue</h3>
          <div className="text-center py-8">
            <p className="text-4xl font-bold text-primary-600">
              GHS {Number(stats?.totalRevenue || 0).toFixed(2)}
            </p>
            <p className="text-gray-500 mt-2">All-time revenue</p>
            <p className="text-sm text-gray-400 mt-1">
              {stats?.todayOrders || 0} orders today
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Order } from '../types';
import { format } from 'date-fns';
import { FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/orders', { params });
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'served': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'refunded': return 'badge-info';
      default: return 'badge-info';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-gray-500 mt-1">{orders.length} orders</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field mt-4 sm:mt-0 sm:w-48"
        >
          <option value="">All Status</option>
          <option value="received">Received</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="served">Served</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-primary-600">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{order.customerName || 'Walk-in'}</div>
                    <div className="text-xs text-gray-500 capitalize">{order.customerType}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.items.length} items</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">GHS {Number(order.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={getPaymentStatusColor(order.paymentStatus)}>{order.paymentStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusColor(order.orderStatus)}`}>{order.orderStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(order.createdAt), 'HH:mm, MMM d')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      <FiEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">No orders found</div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{selectedOrder.orderNumber}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">X</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Customer:</span> {selectedOrder.customerName || 'Walk-in'}</div>
                <div><span className="text-gray-500">Type:</span> {selectedOrder.customerType}</div>
                <div><span className="text-gray-500">Total:</span> GHS {Number(selectedOrder.total).toFixed(2)}</div>
                <div><span className="text-gray-500">Status:</span> {selectedOrder.orderStatus}</div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Items</h4>
                {selectedOrder.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm py-1">
                    <span>{item.product?.name} x{item.quantity}</span>
                    <span>GHS {Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

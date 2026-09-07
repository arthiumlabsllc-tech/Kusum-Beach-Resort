import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { FiBell, FiCheck, FiClock } from 'react-icons/fi';

interface Alert {
  id: number;
  productId: number;
  alertType: 'warning' | 'critical' | 'out_of_stock';
  message: string;
  isAcknowledged: boolean;
  createdAt: string;
  product?: { name: string; category?: { name: string } };
}

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  useEffect(() => { fetchAlerts(); }, [tab]);

  const fetchAlerts = async () => {
    try {
      if (tab === 'active') {
        const res = await api.get('/alerts');
        setAlerts(res.data);
      } else {
        const res = await api.get('/alerts/logs');
        setAlerts(res.data.data || []);
      }
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const acknowledge = async (id: number) => {
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch {
      toast.error('Failed to acknowledge');
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'out_of_stock': return 'border-red-500 bg-red-100';
      default: return 'border-yellow-300 bg-yellow-50';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'out_of_stock': return '🚨';
      default: return '⚠️';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
          <p className="text-gray-500 mt-1">{alerts.filter(a => !a.isAcknowledged).length} active alerts</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('active')} className={`px-4 py-2 rounded-lg font-medium text-sm ${tab === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <FiBell className="inline mr-2" />Active Alerts
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg font-medium text-sm ${tab === 'history' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <FiClock className="inline mr-2" />History
        </button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <FiBell className="mx-auto h-12 w-12 mb-2 text-gray-300" />
            <p>No {tab === 'active' ? 'active' : ''} alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`card border-l-4 ${getAlertColor(alert.alertType)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getAlertIcon(alert.alertType)}</span>
                    <span className={`badge ${alert.alertType === 'warning' ? 'badge-warning' : 'badge-danger'}`}>
                      {alert.alertType.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                  {alert.product && (
                    <p className="text-xs text-gray-500 mt-1">
                      Product: {alert.product.name} | Category: {alert.product.category?.name}
                    </p>
                  )}
                </div>
                {!alert.isAcknowledged && (
                  <button onClick={() => acknowledge(alert.id)} className="btn-primary text-xs px-3 py-1 flex items-center">
                    <FiCheck className="mr-1" /> Acknowledge
                  </button>
                )}
                {alert.isAcknowledged && (
                  <span className="badge-success text-xs">Acknowledged</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;

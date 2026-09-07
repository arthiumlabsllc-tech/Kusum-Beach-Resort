import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiSettings, FiUser, FiSave } from 'react-icons/fi';

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'general' | 'profile' | 'alerts'>('general');

  useEffect(() => {
    if (tab === 'general') fetchSettings();
  }, [tab]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      await api.put(`/settings/${key}`, { value });
      toast.success('Setting saved');
    } catch {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading && tab === 'general') {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">Manage system configuration</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('general')} className={`px-4 py-2 rounded-lg font-medium text-sm ${tab === 'general' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <FiSettings className="inline mr-2" />General
        </button>
        <button onClick={() => setTab('profile')} className={`px-4 py-2 rounded-lg font-medium text-sm ${tab === 'profile' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <FiUser className="inline mr-2" />Profile
        </button>
      </div>

      {tab === 'general' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">System Settings</h3>
          <div className="space-y-4">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <label className="w-48 text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => updateSetting(key, e.target.value)}
                  className="input-field flex-1"
                />
                <button
                  onClick={() => saveSetting(key, value)}
                  disabled={saving}
                  className="btn-primary text-sm px-3 py-2"
                >
                  <FiSave className="inline" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">User Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={user?.fullName || ''} className="input-field" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={user?.username || ''} className="input-field" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input type="text" value={user?.role || ''} className="input-field capitalize" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="text" value={user?.email || ''} className="input-field" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={user?.phone || ''} className="input-field" readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

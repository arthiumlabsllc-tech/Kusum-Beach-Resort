import { useState, useEffect } from 'react';
import api from '../lib/api';
import { User } from '../types';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const StaffPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      case 'bartender': return 'bg-orange-100 text-orange-800';
      case 'waitstaff': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-500 mt-1">{users.length} team members</p>
        </div>
        <button className="btn-primary">Add Staff Member</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                        <span className="text-primary-700 font-medium text-sm">
                          {user.fullName?.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, HH:mm') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-success">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffPage;

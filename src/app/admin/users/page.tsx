'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface User {
  id: number;
  email: string;
  name: string;
  companyName: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  subscriptions: Array<{
    id: number;
    status: string;
    billingCycle: string;
    plan: {
      name: string;
      price: number;
    };
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    isActive: true
  });

  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      setError('Admin access required');
      setLoading(false);
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?adminId=${currentUser.id}`);
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const action = editingUser ? 'update' : 'create';
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: currentUser.id,
          action,
          userId: editingUser?.id,
          ...userData
        })
      });

      const result = await response.json();
      if (result.success) {
        fetchUsers();
        setShowModal(false);
        setEditingUser(null);
        setUserData({ name: '', email: '', password: '', role: 'USER', isActive: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: currentUser.id,
          action: 'toggleActive',
          userId: user.id
        })
      });

      const result = await response.json();
      if (result.success) {
        fetchUsers();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users?adminId=${currentUser.id}&userId=${userId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        fetchUsers();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserData({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
    setShowModal(true);
  };

  if (loading && users.length === 0) {
    return (
      <DashboardLayout title="Admin - User Management">
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </DashboardLayout>
    );
  }

  if (error && currentUser.role !== 'ADMIN') {
    return (
      <DashboardLayout title="Admin - User Management">
        <div className="p-8 text-center text-red-500">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin - User Management">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage all registered users and their subscriptions</p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setUserData({ name: '', email: '', password: '', role: 'USER', isActive: true });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add User
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name || 'N/A'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {user.companyName || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'ADMIN' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.subscriptions?.[0] ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.subscriptions[0].plan.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.subscriptions[0].billingCycle} - ${user.subscriptions[0].plan.price}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">No subscription</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password {editingUser && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userData.password}
                  onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={userData.role}
                  onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={userData.isActive}
                    onChange={(e) => setUserData({ ...userData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

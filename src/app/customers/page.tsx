'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Customer } from '@/lib/types';

interface CustomerWithJobs extends Customer {
    _count?: {
        jobs: number;
    };
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<CustomerWithJobs[]>([]);
    const [allCustomers, setAllCustomers] = useState<CustomerWithJobs[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Fetch customers from API on mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/customers?limit=10000');
            const result = await response.json();
            if (result.success && result.data) {
                setAllCustomers(result.data);
                setCustomers(result.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Apply filters
    useEffect(() => {
        let filtered = allCustomers;

        if (searchTerm) {
            filtered = filtered.filter(customer =>
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((customer as any).addressLine1 || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setCustomers(filtered);
        setPage(1);
    }, [searchTerm, allCustomers]);

    // Get paginated data
    const paginatedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(customers.length / pageSize);

    // Stats - using all customers
    const stats = {
        total: allCustomers.length,
        active: allCustomers.filter(c => c.isActive).length,
    };

    // Handle select all
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCustomers(new Set(paginatedCustomers.map(c => c.id)));
        } else {
            setSelectedCustomers(new Set());
        }
    };

    // Handle individual select
    const handleSelect = (id: number) => {
        const newSelected = new Set(selectedCustomers);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedCustomers(newSelected);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedCustomers.size === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) {
            try {
                let deletedCount = 0;
                const idsToDelete = Array.from(selectedCustomers);
                for (const id of idsToDelete) {
                    const response = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
                    if (response.ok) deletedCount++;
                }
                setCustomers(customers.filter(c => !selectedCustomers.has(c.id)));
                setAllCustomers(allCustomers.filter(c => !selectedCustomers.has(c.id)));
                setSelectedCustomers(new Set());
                alert(`Successfully deleted ${deletedCount} customer(s)`);
            } catch (error) {
                console.error('Error deleting customers:', error);
            }
        }
    };

    // Handle Add
    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newCustomer = {
            name: formData.get('name') as string,
            contactPerson: formData.get('contactPerson') as string || undefined,
            email: formData.get('email') as string || undefined,
            phone: formData.get('phone') as string || undefined,
            addressLine1: formData.get('addressLine1') as string || undefined,
            addressLine2: formData.get('addressLine2') as string || undefined,
            vatNumber: formData.get('vatNumber') as string || undefined,
            notes: formData.get('notes') as string || undefined,
        };

        try {
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer),
            });
            const result = await response.json();
            if (result.success) {
                setAllCustomers([...allCustomers, result.data]);
                setCustomers([...customers, result.data]);
                setShowAddModal(false);
            }
        } catch (error) {
            console.error('Error adding customer:', error);
        }
    };

    // Handle Edit
    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingCustomer || editingCustomer.id === undefined) return;

        const formData = new FormData(e.currentTarget);

        const updatedCustomer = {
            id: editingCustomer.id,
            name: formData.get('name') as string,
            contactPerson: formData.get('contactPerson') as string || undefined,
            email: formData.get('email') as string || undefined,
            phone: formData.get('phone') as string || undefined,
            addressLine1: formData.get('addressLine1') as string || undefined,
            addressLine2: formData.get('addressLine2') as string || undefined,
            vatNumber: formData.get('vatNumber') as string || undefined,
            notes: formData.get('notes') as string || undefined,
        };

        try {
            const response = await fetch('/api/customers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCustomer),
            });
            const result = await response.json();
            if (result.success) {
                setAllCustomers(allCustomers.map(c => c.id === updatedCustomer.id ? result.data : c));
                setCustomers(customers.map(c => c.id === updatedCustomer.id ? result.data : c));
                setShowEditModal(false);
                setEditingCustomer(null);
            }
        } catch (error) {
            console.error('Error updating customer:', error);
        }
    };

    // Handle Delete
    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                const response = await fetch(`/api/customers?id=${id}`, {
                    method: 'DELETE',
                });
                const result = await response.json();
                if (result.success) {
                    setAllCustomers(allCustomers.filter(c => c.id !== id));
                    setCustomers(customers.filter(c => c.id !== id));
                    setSelectedCustomers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(id);
                        return newSet;
                    });
                }
            } catch (error) {
                console.error('Error deleting customer:', error);
            }
        }
    };

    const isAllSelected = paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomers.has(c.id));

    return (
        <DashboardLayout title="Customer Directory">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Directory</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your customer database and track relationships.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Customer
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Customers</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.active.toLocaleString()}</p>
                    </div>
                </div>

                {/* Search & Bulk Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Search customers by name, contact, email, phone, or address..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {selectedCustomers.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Selected ({selectedCustomers.size})
                        </button>
                    )}
                </div>

                {/* Customers Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading customers...</div>
                    ) : paginatedCustomers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            {customers.length === 0 ? 'No customers found. Add customers to get started.' : 'No customers match your search.'}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <th className="p-4 w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="p-4">Customer Name</th>
                                            <th className="p-4">Contact Person</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Phone</th>
                                            <th className="p-4">Address</th>
                                            <th className="p-4">VAT Number</th>
                                            <th className="p-4 w-24"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {paginatedCustomers.map((customer) => (
                                            <tr key={customer.id} className={`bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedCustomers.has(customer.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCustomers.has(customer.id)}
                                                        onChange={() => handleSelect(customer.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                                            {customer.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{customer.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{customer.contactPerson || '-'}</td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{customer.email || '-'}</td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{customer.phone || '-'}</td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {(customer as any).addressLine1 || '-'}
                                                    {(customer as any).addressLine2 && <><br />{(customer as any).addressLine2}</>}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{customer.vatNumber || '-'}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleEdit(customer)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" title="Edit">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Delete">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span>Show</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                    >
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={250}>250</option>
                                        <option value={500}>500</option>
                                    </select>
                                    <span>of {customers.length.toLocaleString()} customers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Customer</h2>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                                        <input name="name" type="text" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Company or Customer Name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                                        <input name="contactPerson" type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Contact Person Name" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                            <input name="email" type="email" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="email@example.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                            <input name="phone" type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="+8801XXXXXXXXX" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                                        <input name="addressLine1" type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="House/Road/Area" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                                        <input name="addressLine2" type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="City, District" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Number</label>
                                        <input name="vatNumber" type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="VAT Registration No." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                        <textarea name="notes" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Additional notes..."></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Add Customer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && editingCustomer && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Customer</h2>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                                        <input name="name" type="text" required defaultValue={editingCustomer.name} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                                        <input name="contactPerson" type="text" defaultValue={editingCustomer.contactPerson || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                            <input name="email" type="email" defaultValue={editingCustomer.email || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                            <input name="phone" type="text" defaultValue={editingCustomer.phone || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                                        <input name="addressLine1" type="text" defaultValue={editingCustomer.addressLine1 || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                                        <input name="addressLine2" type="text" defaultValue={editingCustomer.addressLine2 || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Number</label>
                                        <input name="vatNumber" type="text" defaultValue={editingCustomer.vatNumber || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                        <textarea name="notes" rows={3} defaultValue={editingCustomer.notes || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
                                    <button type="button" onClick={() => { setShowEditModal(false); setEditingCustomer(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

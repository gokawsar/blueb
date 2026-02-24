'use client';

import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Inventory } from '@/lib/types';

// CSV Parser for upc_25.csv format
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSVToInventory(csvText: string): Partial<Inventory>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const results: Partial<Inventory>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(',')) continue;

        const values = parseCSVLine(line);
        if (values.length < 4 || !values[0]) continue;

        // Parse VAT percentage (remove % sign)
        const vatStr = values[5]?.replace('%', '').trim() || '0';
        const vatRate = parseFloat(vatStr) || 0;

        results.push({
            sku: values[0] || '',
            name: values[1]?.replace(/"/g, '').trim() || '',
            details: values[2]?.replace(/"/g, '').trim() || '',
            unit: values[3]?.toLowerCase().trim() || 'nos',
            itemType: (values[4]?.toLowerCase().trim() === 'service' ? 'Service' : 'Supply') as 'Supply' | 'Service',
            vatRate,
            standardPrice: parseFloat(values[6]) || 0,
            unitRateExVat: parseFloat(values[7]) || 0,
            vatAmount: parseFloat(values[8]) || 0,
            finalRate: parseFloat(values[9]) || 0,
            discountedPrice: parseFloat(values[9]) || 0,
            discountPercentCsv: parseFloat(values[10]?.replace('%', '')) || 0,
            stockQuantity: 0,
            minStock: 0,
            buyPrice: 0,
            isActive: true,
        });
    }

    return results;
}

export default function InventoryPage() {
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [allInventory, setAllInventory] = useState<Inventory[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<Inventory> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [importResult, setImportResult] = useState<{ success: boolean; message: string; showResult?: boolean } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch inventory from API on mount
    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/inventory?limit=10000');
            const result = await response.json();
            if (result.success && result.data) {
                setAllInventory(result.data);
                setInventory(result.data);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Apply filters and pagination
    useEffect(() => {
        let filtered = allInventory;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.details || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply type filter
        if (typeFilter) {
            filtered = filtered.filter(item => item.itemType === typeFilter);
        }

        setInventory(filtered);
        setPage(1); // Reset to first page when filters change
    }, [searchTerm, typeFilter, allInventory]);

    // Get paginated data
    const paginatedInventory = inventory.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(inventory.length / pageSize);

    // Stats - using all inventory, not filtered
    const stats = {
        total: allInventory.length,
        supply: allInventory.filter(i => i.itemType === 'Supply').length,
        service: allInventory.filter(i => i.itemType === 'Service').length,
        lowStock: allInventory.filter(i => i.stockQuantity > 0 && i.stockQuantity < 100).length,
    };

    // Handle select all (visible page only)
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    // Handle individual select
    const handleSelect = (id: number) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
            try {
                let deletedCount = 0;
                const idsToDelete = Array.from(selectedItems);
                for (const id of idsToDelete) {
                    const response = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
                    if (response.ok) deletedCount++;
                }
                setInventory(inventory.filter(item => !selectedItems.has(item.id)));
                setAllInventory(allInventory.filter(item => !selectedItems.has(item.id)));
                setSelectedItems(new Set());
                alert(`Successfully deleted ${deletedCount} item(s)`);
            } catch (error) {
                console.error('Error deleting items:', error);
            }
        }
    };

    // Handle Add
    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newItem = {
            sku: formData.get('sku') as string,
            name: formData.get('name') as string,
            details: formData.get('details') as string || undefined,
            unit: formData.get('unit') as string,
            itemType: formData.get('itemType') as 'Supply' | 'Service',
            vatRate: parseFloat(formData.get('vatRate') as string) || 0,
            buyPrice: parseFloat(formData.get('buyPrice') as string) || 0,
            standardPrice: parseFloat(formData.get('standardPrice') as string) || 0,
            discountedPrice: parseFloat(formData.get('discountedPrice') as string) || 0,
            stockQuantity: parseFloat(formData.get('stockQuantity') as string) || 0,
            minStock: parseFloat(formData.get('minStock') as string) || 0,
            isActive: true,
        };

        try {
            const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem),
            });
            const result = await response.json();
            if (result.success) {
                setAllInventory([...allInventory, result.data]);
                setInventory([...inventory, result.data]);
                setShowAddModal(false);
            }
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    // Handle Edit
    const handleEdit = (item: Inventory) => {
        setEditingItem(item);
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingItem || editingItem.id === undefined) return;

        const formData = new FormData(e.currentTarget);

        const updatedItem = {
            id: editingItem.id,
            sku: formData.get('sku') as string,
            name: formData.get('name') as string,
            details: formData.get('details') as string || undefined,
            unit: formData.get('unit') as string,
            itemType: formData.get('itemType') as 'Supply' | 'Service',
            vatRate: parseFloat(formData.get('vatRate') as string) || 0,
            buyPrice: parseFloat(formData.get('buyPrice') as string) || 0,
            standardPrice: parseFloat(formData.get('standardPrice') as string) || 0,
            discountedPrice: parseFloat(formData.get('discountedPrice') as string) || 0,
            stockQuantity: parseFloat(formData.get('stockQuantity') as string) || 0,
            minStock: parseFloat(formData.get('minStock') as string) || 0,
            isActive: editingItem.isActive ?? true,
        };

        try {
            const response = await fetch('/api/inventory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedItem),
            });
            const result = await response.json();
            if (result.success) {
                setAllInventory(allInventory.map(item => item.id === updatedItem.id ? result.data : item));
                setInventory(inventory.map(item => item.id === updatedItem.id ? result.data : item));
                setShowEditModal(false);
                setEditingItem(null);
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    // Handle Delete
    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const response = await fetch(`/api/inventory?id=${id}`, {
                    method: 'DELETE',
                });
                const result = await response.json();
                if (result.success) {
                    setAllInventory(allInventory.filter(item => item.id !== id));
                    setInventory(inventory.filter(item => item.id !== id));
                    setSelectedItems(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(id);
                        return newSet;
                    });
                }
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    // Handle CSV Import
    const handleImportCSV = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const file = formData.get('csvFile') as File;

        if (!file) {
            setImportResult({ success: false, message: 'Please select a CSV file', showResult: true });
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target?.result as string;
            const parsedItems = parseCSVToInventory(csvText);

            if (parsedItems.length === 0) {
                setImportResult({ success: false, message: 'No valid items found in CSV', showResult: true });
                return;
            }

            try {
                // Import items one by one through API
                let importedCount = 0;
                let skippedCount = 0;

                for (const item of parsedItems) {
                    // Check if SKU already exists
                    const existingItem = allInventory.find(i => i.sku === item.sku);
                    if (existingItem) {
                        skippedCount++;
                        continue;
                    }

                    const response = await fetch('/api/inventory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item),
                    });
                    const result = await response.json();
                    if (result.success) {
                        importedCount++;
                    }
                }

                // Refresh inventory from server
                await fetchInventory();

                setImportResult({
                    success: true,
                    message: `Successfully imported ${importedCount} new items. ${skippedCount} duplicates skipped.`,
                    showResult: true
                });
            } catch (error) {
                console.error('Error importing CSV:', error);
                setImportResult({ success: false, message: 'Error importing CSV file', showResult: true });
            }
        };
        reader.readAsText(file);
    };

    // Close import result
    const closeImportResult = () => {
        setImportResult(null);
        setShowImportModal(false);
    };

    // Handle File Select
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const typeColors: Record<string, string> = {
        Supply: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        Service: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    };

    const isAllSelected = paginatedInventory.length > 0 && paginatedInventory.every(item => selectedItems.has(item.id));

    return (
        <DashboardLayout title="Inventory Management">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory & Rate List</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your SKU list, pricing, and stock levels.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowImportModal(true); setImportResult(null); }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import CSV
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add SKU
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total SKUs</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Supply Items</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.supply.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Services</p>
                        <p className="text-2xl font-bold text-emerald-600">{stats.service.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
                        <p className="text-2xl font-bold text-orange-500">{stats.lowStock.toLocaleString()}</p>
                    </div>
                </div>

                {/* Search & Filters & Bulk Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Search by SKU, name, or details..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="Supply">Supply</option>
                        <option value="Service">Service</option>
                    </select>
                    {selectedItems.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Selected ({selectedItems.size})
                        </button>
                    )}
                </div>

                {/* Inventory Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading inventory...</div>
                    ) : paginatedInventory.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            {inventory.length === 0 ? 'No inventory items. Add or import items to get started.' : 'No items match your search.'}
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
                                            <th className="p-4">SKU Code</th>
                                            <th className="p-4">Item Name</th>
                                            <th className="p-4">Unit</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">VAT %</th>
                                            <th className="p-4 text-right">Purchase (৳)</th>
                                            <th className="p-4 text-right">Std. Price (৳)</th>
                                            <th className="p-4 text-right">Disc. Price (৳)</th>
                                            <th className="p-4 text-right">Stock</th>
                                            <th className="p-4 w-24"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {paginatedInventory.map((item) => (
                                            <tr key={item.id} className={`bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.has(item.id)}
                                                        onChange={() => handleSelect(item.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="p-4 text-sm font-medium text-blue-600">{item.sku}</td>
                                                <td className="p-4 text-sm">
                                                    <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                    {item.details && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{item.details}</div>}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{item.unit}</td>
                                                <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[item.itemType]}`}>{item.itemType}</span></td>
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{item.vatRate}%</td>
                                                <td className="p-4 text-sm text-right text-gray-600 dark:text-gray-300">{item.buyPrice.toFixed(2)}</td>
                                                <td className="p-4 text-sm text-right font-medium text-gray-900 dark:text-white">{item.standardPrice.toFixed(2)}</td>
                                                <td className="p-4 text-sm text-right font-medium text-green-600 dark:text-green-400">{item.discountedPrice.toFixed(2)}</td>
                                                <td className="p-4 text-sm text-right">
                                                    <span className={item.stockQuantity < item.minStock ? 'text-orange-500 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                                                        {item.stockQuantity}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" title="Edit">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Delete">
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
                                        <option value={100}>100</option>
                                        <option value={250}>250</option>
                                        <option value={500}>500</option>
                                        <option value={1000}>1000</option>
                                    </select>
                                    <span>of {inventory.length.toLocaleString()} items</span>
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
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New SKU</h2>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU Code *</label>
                                            <input name="sku" type="text" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="e.g., 25001" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                                            <select name="unit" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                                <option value="nos">Nos</option>
                                                <option value="sft">Sq. Ft</option>
                                                <option value="rft">Rft</option>
                                                <option value="cum">Cum</option>
                                                <option value="kg">Kg</option>
                                                <option value="day">Day</option>
                                                <option value="job">Job</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
                                        <input name="name" type="text" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Item name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
                                        <input name="details" type="text" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Additional details" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                                            <select name="itemType" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                                <option value="Supply">Supply</option>
                                                <option value="Service">Service</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Rate (%)</label>
                                            <input name="vatRate" type="number" step="0.01" defaultValue="0" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
                                            <input name="buyPrice" type="number" step="0.01" defaultValue="0" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standard Price *</label>
                                            <input name="standardPrice" type="number" step="0.01" required defaultValue="0" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discounted Price</label>
                                            <input name="discountedPrice" type="number" step="0.01" defaultValue="0" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                                            <input name="stockQuantity" type="number" defaultValue="0" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock Level</label>
                                            <input name="minStock" type="number" defaultValue="0" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Add Item</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && editingItem && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit SKU</h2>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU Code *</label>
                                            <input name="sku" type="text" required defaultValue={editingItem.sku} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                                            <select name="unit" defaultValue={editingItem.unit || 'nos'} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                                <option value="nos">Nos</option>
                                                <option value="sft">Sq. Ft</option>
                                                <option value="rft">Rft</option>
                                                <option value="cum">Cum</option>
                                                <option value="kg">Kg</option>
                                                <option value="day">Day</option>
                                                <option value="job">Job</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
                                        <input name="name" type="text" required defaultValue={editingItem.name} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
                                        <input name="details" type="text" defaultValue={editingItem.details || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                                            <select name="itemType" required defaultValue={editingItem.itemType || 'Supply'} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                                <option value="Supply">Supply</option>
                                                <option value="Service">Service</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Rate (%)</label>
                                            <input name="vatRate" type="number" step="0.01" defaultValue={editingItem.vatRate || 0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
                                            <input name="buyPrice" type="number" step="0.01" defaultValue={editingItem.buyPrice || 0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standard Price *</label>
                                            <input name="standardPrice" type="number" step="0.01" required defaultValue={editingItem.standardPrice || 0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discounted Price</label>
                                            <input name="discountedPrice" type="number" step="0.01" defaultValue={editingItem.discountedPrice || 0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                                            <input name="stockQuantity" type="number" defaultValue={editingItem.stockQuantity || 0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock Level</label>
                                            <input name="minStock" type="number" defaultValue={editingItem.minStock || 0} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
                                    <button type="button" onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Import CSV Modal */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Import from CSV</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload your upc_25.csv file to import inventory items.</p>
                            </div>
                            <form onSubmit={handleImportCSV}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select CSV File</label>
                                        <input ref={fileInputRef} type="file" name="csvFile" accept=".csv" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected CSV Format:</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU, Items Name, Details, Unit, Item_Type, VAT, Max_Unit_Rate, Unit_Rate_Excl_VAT, Vat_Amnt, Final_Rate, Discount_percent, Discount_amount</p>
                                    </div>
                                    {importResult && importResult.showResult && (
                                        <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                            {importResult.message}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
                                    <button type="button" onClick={closeImportResult} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Import</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

'use client';

import { Inventory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface InventoryModalProps {
    isOpen: boolean;
    inventory: Inventory[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onAddItem: (item: Inventory) => void;
    onClose: () => void;
}

export default function InventoryModal({
    isOpen,
    inventory,
    searchTerm,
    onSearchChange,
    onAddItem,
    onClose,
}: InventoryModalProps) {
    if (!isOpen) return null;

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Items from Inventory</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Search by SKU or item name..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-4 overflow-y-auto max-h-96">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                <th className="p-3">SKU</th>
                                <th className="p-3">Item Name</th>
                                <th className="p-3">Unit</th>
                                <th className="p-3 text-right">Buy Price</th>
                                <th className="p-3 text-right">Std. Price</th>
                                <th className="p-3 text-right">Disc. Price</th>
                                <th className="p-3 text-right">Stock</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredInventory.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="p-3 text-sm font-medium text-blue-600">{item.sku}</td>
                                    <td className="p-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                                    <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{item.unit}</td>
                                    <td className="p-3 text-sm text-right text-gray-500 dark:text-gray-400">{formatCurrency(item.buyPrice)}</td>
                                    <td className="p-3 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.standardPrice)}</td>
                                    <td className="p-3 text-sm text-right text-emerald-600">{item.discountedPrice ? formatCurrency(item.discountedPrice) : '-'}</td>
                                    <td className="p-3 text-sm text-right">
                                        <span className={item.stockQuantity === 0 ? 'text-red-500' : item.stockQuantity < 100 ? 'text-orange-500' : 'text-gray-900 dark:text-white'}>
                                            {item.stockQuantity === 0 ? 'N/A' : item.stockQuantity.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => onAddItem(item)}
                                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                        >
                                            Add
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredInventory.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">No items found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

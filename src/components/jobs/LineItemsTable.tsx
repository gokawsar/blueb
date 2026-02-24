'use client';

import { useState, useRef, useEffect } from 'react';
import { JobItem, Inventory, Measurement } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface LineItemsTableProps {
    items: JobItem[];
    inventory: Inventory[];
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    onItemChange: (index: number, field: keyof JobItem, value: string | number | boolean) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onAddInventoryItem?: (invItem: Inventory, closeModal?: boolean) => void;
    onOpenSizeNoter?: (index: number) => void;
}

export default function LineItemsTable({
    items,
    inventory,
    searchTerm = '',
    onSearchChange,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onAddInventoryItem,
    onOpenSizeNoter,
}: LineItemsTableProps) {
    // Filter inventory based on search
    const filteredInventory = searchTerm
        ? inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase()))
        ).slice(0, 10)
        : [];

    // Handle selecting an inventory item
    const handleSelectInventory = (invItem: Inventory) => {
        if (onAddInventoryItem) {
            onAddInventoryItem(invItem, false);
        }
        if (onSearchChange) {
            onSearchChange('');
        }
    };

    // Check if item has size measurements
    const hasSize = (item: JobItem) => {
        return item.widthFeet || item.widthInches || item.heightFeet || item.heightInches;
    };

    // Check if item has multiple measurements (from measurements array or measurementsJson)
    const hasMultipleMeasurements = (item: JobItem) => {
        // First check measurements array from database
        if (item.measurements && item.measurements.length > 0) {
            return true;
        }
        // Fallback to measurementsJson
        if (item.measurementsJson) {
            try {
                const parsed = JSON.parse(item.measurementsJson);
                return Array.isArray(parsed) && parsed.length > 0;
            } catch {
                return false;
            }
        }
        return false;
    };

    // Parse measurements from array or JSON
    const parseMeasurements = (item: JobItem): Measurement[] => {
        // First check measurements array from database
        if (item.measurements && item.measurements.length > 0) {
            return item.measurements;
        }
        // Fallback to measurementsJson
        if (item.measurementsJson) {
            try {
                const parsed = JSON.parse(item.measurementsJson);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                // Ignore parse errors
            }
        }
        // Fallback to single measurement
        if (hasSize(item)) {
            return [{
                widthFeet: item.widthFeet || 0,
                widthInches: item.widthInches || 0,
                heightFeet: item.heightFeet || 0,
                heightInches: item.heightInches || 0,
                quantity: item.quantity || 1,
                description: item.workDescription || '',
                calculatedSqft: item.calculatedSqft || 0,
            }];
        }
        return [];
    };

    // Calculate total sqft from measurements
    const calculateTotalSqft = (item: JobItem): number => {
        const measurements = parseMeasurements(item);
        return measurements.reduce((sum, m) => sum + (m.calculatedSqft || 0), 0);
    };

    // Format size display
    const formatSizeDisplay = (item: JobItem) => {
        if (!hasSize(item)) return null;
        const w = item.widthFeet || 0;
        const wi = item.widthInches || 0;
        const h = item.heightFeet || 0;
        const hi = item.heightInches || 0;
        return `${w}'-${wi}" x ${h}'-${hi}"`;
    };

    // Handle quantity change
    const handleQuantityChange = (index: number, value: string) => {
        const newQuantity = Number(value);
        onItemChange(index, 'quantity', newQuantity);
    };

    // Handle import measurement to quantity
    const handleImportMeasurementToQty = (index: number, item: JobItem) => {
        const totalSqft = calculateTotalSqft(item);
        if (totalSqft > 0) {
            onItemChange(index, 'quantity', totalSqft);
        }
    };

    return (
        <div className="space-y-3">
            {/* Line Items List */}
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        {/* Main row - Three sub-sections */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                                {item.serialNumber}
                            </div>

                            <div className="flex-1 space-y-2">
                                {/* Sub-section 1: Name (editable) */}
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={item.workDescription}
                                        onChange={(e) => onItemChange(index, 'workDescription', e.target.value)}
                                        placeholder="Item name"
                                    />
                                </div>

                                {/* Sub-section 2: Details (editable) */}
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Details</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={item.details || ''}
                                        onChange={(e) => onItemChange(index, 'details', e.target.value)}
                                        placeholder="Item details (optional)"
                                    />
                                </div>

                                {/* Sub-section 3: Size section */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Size Display/Button */}
                                    {hasMultipleMeasurements(item) ? (
                                        <div className="w-full">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-purple-600">Measurements:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenSizeNoter && onOpenSizeNoter(index)}
                                                    className="text-xs text-purple-600 hover:text-purple-700 underline"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                            {/* Show all measurement lines */}
                                            <div className="bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 p-2 space-y-1">
                                                {parseMeasurements(item).map((m, mIdx) => (
                                                    <div key={mIdx} className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-700 dark:text-gray-200">
                                                            {m.widthFeet}'-{m.widthInches}" x {m.heightFeet}'-{m.heightInches}" x {m.quantity} =
                                                            <span className="font-medium text-purple-600">{m.calculatedSqft} sft</span>
                                                            {m.description && <span className="ml-2 text-gray-500">({m.description})</span>}
                                                        </span>
                                                    </div>
                                                ))}
                                                {/* Total line */}
                                                <div className="border-t border-gray-300 dark:border-gray-500 pt-1 mt-1 flex justify-between text-xs font-semibold">
                                                    <span className="text-gray-700 dark:text-gray-200">Total:</span>
                                                    <span className="text-purple-600">{calculateTotalSqft(item)} sft</span>
                                                </div>
                                            </div>
                                            {/* Import measurement to qty button */}
                                            <button
                                                type="button"
                                                onClick={() => handleImportMeasurementToQty(index, item)}
                                                className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Import measurement to qty
                                            </button>
                                        </div>
                                    ) : hasSize(item) ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                Size: <span className="font-medium">{formatSizeDisplay(item)}</span>
                                                {item.calculatedSqft && <span className="ml-1 text-purple-600">({item.calculatedSqft} sft)</span>}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => onOpenSizeNoter && onOpenSizeNoter(index)}
                                                className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                                                title="Edit Size"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onOpenSizeNoter && onOpenSizeNoter(index)}
                                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                            </svg>
                                            Add Size
                                        </button>
                                    )}

                                    {/* Copy total sft to qty button - only show if has measurements */}
                                    {hasSize(item) && (
                                        <button
                                            type="button"
                                            onClick={() => handleImportMeasurementToQty(index, item)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Copy {calculateTotalSqft(item)} sft to qty
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Quantity, Unit, Price and Total inputs */}
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-16">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                                    />
                                </div>
                                <div className="w-16">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={item.unit}
                                        onChange={(e) => onItemChange(index, 'unit', e.target.value)}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={item.unitPrice}
                                        onChange={(e) => onItemChange(index, 'unitPrice', e.target.value)}
                                    />
                                </div>
                                <div className="w-24 text-right">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total</label>
                                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(item.total)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(index)}
                                    className="mt-4 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    disabled={items.length === 1}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Item Button */}
            <button
                type="button"
                onClick={onAddItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
                + Add Line Item
            </button>
        </div>
    );
}

'use client';

import { Measurement } from '@/lib/types';

interface SizeNoterModalProps {
    isOpen: boolean;
    measurements: Measurement[];
    onAddMeasurement: () => void;
    onUpdateMeasurement: (index: number, field: keyof Measurement, value: string | number) => void;
    onRemoveMeasurement: (index: number) => void;
    onAddToLineItems: () => void;
    onSave?: () => void;
    onClose: () => void;
}

// Calculate square feet from feet and inches
const calculateSqft = (widthFeet: number, widthInches: number, heightFeet: number, heightInches: number, quantity: number): number => {
    const totalWidth = widthFeet + (widthInches / 12);
    const totalHeight = heightFeet + (heightInches / 12);
    return Number((totalWidth * totalHeight * quantity).toFixed(2));
};

// Format size for display
const formatSize = (widthFeet: number, widthInches: number, heightFeet: number, heightInches: number, quantity: number): string => {
    return `${widthFeet}'-${widthInches}" x ${heightFeet}'-${heightInches}" x ${quantity}pc = ${calculateSqft(widthFeet, widthInches, heightFeet, heightInches, quantity)} sft`;
};

export default function SizeNoterModal({
    isOpen,
    measurements,
    onAddMeasurement,
    onUpdateMeasurement,
    onRemoveMeasurement,
    onAddToLineItems,
    onSave,
    onClose,
}: SizeNoterModalProps) {
    if (!isOpen) return null;

    // Calculate total sft from all measurements
    const totalSft = measurements.reduce((sum, m) => {
        return sum + calculateSqft(m.widthFeet, m.widthInches, m.heightFeet, m.heightInches, m.quantity);
    }, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Size Noter - Measurement Tool</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Add measurements using feet and inches. Width × Height × Quantity will be calculated as sft automatically.
                    </p>

                    {/* Measurement Table */}
                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                    <th className="p-2">Width (ft)</th>
                                    <th className="p-2">Width (in)</th>
                                    <th className="p-2">Height (ft)</th>
                                    <th className="p-2">Height (in)</th>
                                    <th className="p-2">Pcs</th>
                                    <th className="p-2">Sft</th>
                                    <th className="p-2">Description</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {measurements.map((m, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                value={m.widthFeet}
                                                onChange={(e) => onUpdateMeasurement(idx, 'widthFeet', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="11"
                                                step="1"
                                                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                value={m.widthInches}
                                                onChange={(e) => onUpdateMeasurement(idx, 'widthInches', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                value={m.heightFeet}
                                                onChange={(e) => onUpdateMeasurement(idx, 'heightFeet', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="11"
                                                step="1"
                                                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                value={m.heightInches}
                                                onChange={(e) => onUpdateMeasurement(idx, 'heightInches', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                value={m.quantity}
                                                onChange={(e) => onUpdateMeasurement(idx, 'quantity', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2 text-sm font-medium text-gray-900 dark:text-white text-center">
                                            {calculateSqft(m.widthFeet, m.widthInches, m.heightFeet, m.heightInches, m.quantity)}
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                placeholder="Description"
                                                value={m.description || ''}
                                                onChange={(e) => onUpdateMeasurement(idx, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <button
                                                onClick={() => onRemoveMeasurement(idx)}
                                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Total Row */}
                            {measurements.length > 0 && (
                                <tfoot>
                                    <tr className="bg-purple-50 dark:bg-purple-900/30 border-t-2 border-purple-200 dark:border-purple-700">
                                        <td colSpan={5} className="p-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                                            Total:
                                        </td>
                                        <td className="p-2 text-center text-sm font-bold text-purple-600 dark:text-purple-400">
                                            {totalSft.toFixed(2)} sft
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    <button
                        onClick={onAddMeasurement}
                        className="w-full mb-4 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                    >
                        + Add Measurement
                    </button>

                    {/* Preview of what will be added */}
                    {measurements.length > 0 && (
                        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">Preview:</p>
                            <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                                {measurements.map((m, idx) => (
                                    <p key={idx}>{formatSize(m.widthFeet, m.widthInches, m.heightFeet, m.heightInches, m.quantity)}</p>
                                ))}
                                <p className="font-semibold pt-1 border-t border-purple-200 dark:border-purple-700">
                                    Total: {totalSft.toFixed(2)} sft
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        {onSave && (
                            <button
                                onClick={onSave}
                                disabled={measurements.length === 0}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                            >
                                Save
                            </button>
                        )}
                        <button
                            onClick={onAddToLineItems}
                            disabled={measurements.length === 0}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                        >
                            Add to Line Items
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

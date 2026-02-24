'use client';

import { useState, useEffect } from 'react';
import { JobExpense } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface ExpenseModalProps {
    isOpen: boolean;
    jobId: number | null;
    expenses: JobExpense[];
    onAddExpense: (expense: Omit<JobExpense, 'id' | 'jobId' | 'createdAt' | 'updatedAt'>) => void;
    onUpdateExpense: (id: number, expense: Partial<JobExpense>) => void;
    onDeleteExpense: (id: number) => void;
    onClose: () => void;
}

export default function ExpenseModal({
    isOpen,
    jobId,
    expenses,
    onAddExpense,
    onUpdateExpense,
    onDeleteExpense,
    onClose,
}: ExpenseModalProps) {
    const [localExpenses, setLocalExpenses] = useState<JobExpense[]>([]);
    const [loading, setLoading] = useState(false);

    // Load expenses when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalExpenses(expenses.length > 0 ? [...expenses] : [
                { id: Date.now(), jobId: jobId || 0, description: '', category: 'Material', amount: 0 }
            ]);
        }
    }, [isOpen, expenses, jobId]);

    const handleAddLine = () => {
        setLocalExpenses([
            ...localExpenses,
            { id: Date.now(), jobId: jobId || 0, description: '', category: 'Material', amount: 0 }
        ]);
    };

    const handleRemoveLine = async (index: number) => {
        const expense = localExpenses[index];
        if (expense.id && expense.id > 1000000000) {
            // It's a new unsaved expense (timestamp-based ID), just remove from local
            setLocalExpenses(localExpenses.filter((_, i) => i !== index));
        } else if (expense.id) {
            // It's an existing expense, call delete and wait for it
            try {
                await onDeleteExpense(expense.id);
                setLocalExpenses(localExpenses.filter((_, i) => i !== index));
            } catch (error) {
                console.error('Error deleting expense:', error);
            }
        } else {
            // No ID at all, just remove from local
            setLocalExpenses(localExpenses.filter((_, i) => i !== index));
        }
    };

    const handleChange = (index: number, field: keyof JobExpense, value: string | number) => {
        const newExpenses = [...localExpenses];
        newExpenses[index] = { ...newExpenses[index], [field]: value };
        setLocalExpenses(newExpenses);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Filter out empty expenses (no description and no amount)
            const validExpenses = localExpenses.filter(e => e.description.trim() || e.amount > 0);

            // Save each expense
            for (const expense of validExpenses) {
                if (expense.id && expense.id < 1000000000) {
                    // Existing expense - update
                    await onUpdateExpense(expense.id, {
                        description: expense.description,
                        category: expense.category,
                        amount: expense.amount,
                    });
                } else {
                    // New expense - add
                    await onAddExpense({
                        description: expense.description,
                        category: expense.category,
                        amount: expense.amount,
                    });
                }
            }

            onClose();
        } catch (error) {
            console.error('Error saving expenses:', error);
            alert('Failed to save expenses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const totalExpenses = localExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Job Expenses
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Add expenses related to this job (Material, Labor, Transport, etc.)
                    </p>

                    {/* Expense Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 w-1/2">
                                        Description
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Category
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Amount (৳)
                                    </th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {localExpenses.map((expense, index) => (
                                    <tr key={expense.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Enter description..."
                                                value={expense.description}
                                                onChange={(e) => handleChange(index, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <select
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={expense.category}
                                                onChange={(e) => handleChange(index, 'category', e.target.value)}
                                            >
                                                <option value="Material">Material</option>
                                                <option value="Labor">Labor</option>
                                                <option value="Transport">Transport</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                value={expense.amount || ''}
                                                onChange={(e) => handleChange(index, 'amount', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLine(index)}
                                                className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                                title="Remove"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Add New Line Button */}
                    <button
                        type="button"
                        onClick={handleAddLine}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Line
                    </button>

                    {/* Total */}
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Expenses</span>
                            <span className="text-lg font-bold text-orange-600">{formatCurrency(totalExpenses)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Expenses'}
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Job } from '@/lib/types';
import { formatCurrency, numberToWords } from '@/lib/utils';
import { useSettings } from '@/lib/settingsContext';

interface Customer {
    id: number;
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
}

interface Topsheet {
    id: number;
    topsheetNumber: string;
    date: string;
    customerId: number | null;
    customerName: string;
    customerAddress1: string | null;
    customerAddress2: string | null;
    jobDetail: string | null;
    status: string;
    notes: string | null;
    jobs: Job[];
}

export default function TopsheetEditPage() {
    const router = useRouter();
    const params = useParams();
    const topsheetId = params?.id ? parseInt(params.id as string) : null;
    
    const [topsheet, setTopsheet] = useState<Topsheet | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allJobs, setAllJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assignedJobIds, setAssignedJobIds] = useState<number[]>([]);
    const [editingChallanDate, setEditingChallanDate] = useState<number | null>(null);
    const [challanDateValue, setChallanDateValue] = useState<string>('');
    
    // Duplicate Challan Date Modal
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateJobs, setDuplicateJobs] = useState<Job[]>([]);
    const [pendingChallanDateJob, setPendingChallanDateJob] = useState<number | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        topsheetNumber: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        notes: '',
    });

    // Fetch topsheet data
    const fetchTopsheet = useCallback(async () => {
        if (!topsheetId) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/topsheets?id=${topsheetId}`);
            const result = await response.json();
            if (result.success) {
                const data = result.data;
                setTopsheet(data);
                setFormData({
                    topsheetNumber: data.topsheetNumber,
                    date: new Date(data.date).toISOString().split('T')[0],
                    customerId: data.customerId?.toString() || '',
                    notes: data.notes || '',
                });
                // Get assigned job IDs - keep the order as they appear in topsheet.jobs
                const jobIds = data.jobs?.map((j: Job) => j.id) || [];
                setAssignedJobIds(jobIds);
            }
        } catch (error) {
            console.error('Error fetching topsheet:', error);
        } finally {
            setLoading(false);
        }
    }, [topsheetId]);

    // Fetch customers
    const fetchCustomers = useCallback(async () => {
        try {
            const response = await fetch('/api/customers');
            const result = await response.json();
            if (result.success) {
                setCustomers(result.data);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    }, []);

    // Fetch all jobs
    const fetchAllJobs = useCallback(async () => {
        try {
            const response = await fetch('/api/jobs?limit=1000');
            const result = await response.json();
            if (result.success) {
                setAllJobs(result.data);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    }, []);

    useEffect(() => {
        fetchTopsheet();
        fetchCustomers();
        fetchAllJobs();
    }, [fetchTopsheet, fetchCustomers, fetchAllJobs]);

    // Get selected customer name for subject line
    const getSelectedCustomerName = () => {
        if (!formData.customerId) return '';
        const customer = customers.find(c => c.id === parseInt(formData.customerId));
        return customer?.name || '';
    };

    // Get assigned jobs
    const getAssignedJobs = () => {
        return assignedJobIds
            .map(id => allJobs.find(job => job.id === id))
            .filter((job): job is Job => job !== undefined);
    };

    // Get unassigned jobs (not assigned to any topsheet)
    const getUnassignedJobs = () => {
        return allJobs.filter(job => 
            !job.topsheetId || (topsheetId && job.topsheetId === topsheetId)
        ).filter(job => !assignedJobIds.includes(job.id!));
    };

    // Add job to assigned
    const addJobToAssigned = (jobId: number) => {
        setAssignedJobIds(prev => [...prev, jobId]);
    };

    // Remove job from assigned
    const removeJobFromAssigned = (jobId: number) => {
        setAssignedJobIds(prev => prev.filter(id => id !== jobId));
    };

    // Move job up in order
    const moveJobUp = (index: number) => {
        if (index === 0) return;
        const newOrder = [...assignedJobIds];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setAssignedJobIds(newOrder);
    };

    // Move job down in order
    const moveJobDown = (index: number) => {
        if (index === assignedJobIds.length - 1) return;
        const newOrder = [...assignedJobIds];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setAssignedJobIds(newOrder);
    };

    // Check for jobs with the same challan date
    const checkDuplicateChallanDate = (challanDate: string, jobId: number) => {
        const jobsWithSameDate = allJobs.filter(job => {
            if (!job.challanDate || job.id === jobId) return false;
            const jobChallanDate = new Date(job.challanDate).toISOString().split('T')[0];
            return jobChallanDate === challanDate;
        });
        
        if (jobsWithSameDate.length > 0) {
            setDuplicateJobs(jobsWithSameDate);
            setPendingChallanDateJob(jobId);
            setShowDuplicateModal(true);
        } else {
            // No duplicates, proceed with update
            handleChallanDateUpdateDirect(jobId);
        }
    };

    // Handle challan date update directly (without duplicate check)
    const handleChallanDateUpdateDirect = async (jobId: number) => {
        try {
            const response = await fetch('/api/jobs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: jobId,
                    challanDate: challanDateValue ? new Date(challanDateValue) : undefined
                }),
            });

            const result = await response.json();
            if (result.success) {
                // Update local state
                setAllJobs(prev => prev.map(job => 
                    job.id === jobId 
                        ? { ...job, challanDate: challanDateValue ? new Date(challanDateValue) : undefined }
                        : job
                ));
                setEditingChallanDate(null);
            }
        } catch (error) {
            console.error('Error updating challan date:', error);
            alert('Failed to update challan date');
        }
    };

    // Handle confirm duplicate - proceed with update anyway
    const handleConfirmDuplicate = () => {
        if (pendingChallanDateJob !== null) {
            handleChallanDateUpdateDirect(pendingChallanDateJob);
        }
        setShowDuplicateModal(false);
        setDuplicateJobs([]);
        setPendingChallanDateJob(null);
    };

    // Modified handleChallanDateUpdate to check for duplicates first
    const handleChallanDateUpdate = async (jobId: number) => {
        if (challanDateValue) {
            checkDuplicateChallanDate(challanDateValue, jobId);
        } else {
            handleChallanDateUpdateDirect(jobId);
        }
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.customerId) {
            alert('Please select a customer');
            return;
        }
        
        setSaving(true);
        
        try {
            const payload = {
                topsheetNumber: formData.topsheetNumber,
                date: formData.date,
                customerId: parseInt(formData.customerId),
                notes: formData.notes,
                jobIds: assignedJobIds,
            };

            const response = await fetch('/api/topsheets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: topsheetId, ...payload }),
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Topsheet updated successfully!');
                router.push('/topsheets');
            } else {
                alert(result.error || 'Failed to update topsheet');
            }
        } catch (error) {
            console.error('Error updating topsheet:', error);
            alert('Failed to update topsheet');
        } finally {
            setSaving(false);
        }
    };

    // Format currency
    const formatDate = (dateStr: string | Date) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Calculate totals - recalculate from items to ensure accuracy
    const assignedJobs = getAssignedJobs();
    const totalAmount = assignedJobs.reduce((sum, job) => {
        // Recalculate from items if available
        if (job.items && job.items.length > 0) {
            return sum + job.items.reduce((itemSum, item) => itemSum + (item.total || 0), 0);
        }
        return sum + (job.totalAmount || 0);
    }, 0);

    if (loading) {
        return (
            <DashboardLayout title="Edit Topsheet">
                <div className="p-8 text-center text-gray-500">Loading...</div>
            </DashboardLayout>
        );
    }

    if (!topsheet) {
        return (
            <DashboardLayout title="Edit Topsheet">
                <div className="p-8 text-center text-gray-500">Topsheet not found</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Edit Topsheet">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Topsheet</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Update topsheet details and assigned jobs.</p>
                    </div>
                    <button
                        onClick={() => router.push('/topsheets')}
                        className="btn-3d btn-3d-secondary"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Topsheets
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Topsheet Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Topsheet Details</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Topsheet Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={formData.topsheetNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, topsheetNumber: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Select Customer
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    value={formData.customerId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                                >
                                    <option value="">-- Select a Customer --</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Jobs */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Assigned Jobs ({assignedJobs.length})
                        </h2>
                        
                        {assignedJobs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
                                No jobs assigned yet. Add jobs from the unassigned jobs section below.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            <th className="p-3">Actions</th>
                                            <th className="p-3">Sl.</th>
                                            <th className="p-3">Work Details</th>
                                            <th className="p-3">Work Location</th>
                                            <th className="p-3">Bill No.</th>
                                            <th className="p-3">Challan Date</th>
                                            <th className="p-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {assignedJobs.map((job, index) => (
                                            <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveJobUp(index)}
                                                            disabled={index === 0}
                                                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Move Up"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveJobDown(index)}
                                                            disabled={index === assignedJobs.length - 1}
                                                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Move Down"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeJobFromAssigned(job.id!)}
                                                            className="p-1 text-gray-400 hover:text-red-600"
                                                            title="Remove"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                                                    {job.jobDetail || job.subject || '-'}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {job.workLocation || '-'}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {job.refNumber}
                                                </td>
                                                <td className="p-3 text-sm">
                                                    {editingChallanDate === job.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="date"
                                                                className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                value={challanDateValue}
                                                                onChange={(e) => setChallanDateValue(e.target.value)}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleChallanDateUpdate(job.id!)}
                                                                className="text-green-600 hover:text-green-800"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingChallanDate(null)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setEditingChallanDate(job.id!);
                                                                setChallanDateValue(job.challanDate ? new Date(job.challanDate).toISOString().split('T')[0] : '');
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            {job.challanDate ? formatDate(job.challanDate) : 'Set Date'}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                                    {formatCurrency(job.totalAmount || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {/* Summary */}
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {assignedJobs.length} job(s) assigned
                                </span>
                                <div className="text-right">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Total: </span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unassigned Jobs */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Unassigned Jobs ({getUnassignedJobs().length})
                        </h2>
                        
                        {getUnassignedJobs().length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
                                No unassigned jobs available. All jobs are already assigned to topsheets.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            <th className="p-3">Action</th>
                                            <th className="p-3">Job Ref</th>
                                            <th className="p-3">Work Details</th>
                                            <th className="p-3">Work Location</th>
                                            <th className="p-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {getUnassignedJobs().map((job) => (
                                            <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="p-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => addJobToAssigned(job.id!)}
                                                        className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                                                    >
                                                        Add
                                                    </button>
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {job.refNumber}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {job.jobDetail || job.subject || '-'}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {job.workLocation || '-'}
                                                </td>
                                                <td className="p-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                                    {formatCurrency(job.totalAmount || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Notes and Summary Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Notes */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
                            <textarea
                                rows={4}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Any additional notes..."
                            />
                        </div>
                        
                        {/* Total Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount:</span>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Amount in Words:</span>
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-900 dark:text-white text-sm">
                                        {totalAmount > 0 ? `${numberToWords(totalAmount)} Taka Only` : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={() => router.push('/topsheets')}
                            className="btn-3d btn-3d-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-3d btn-3d-primary"
                        >
                            {saving ? 'Saving...' : 'Update Topsheet'}
                        </button>
                    </div>
                </form>

                {/* Duplicate Challan Date Modal */}
                {showDuplicateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Same Challan Date Found
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowDuplicateModal(false);
                                        setDuplicateJobs([]);
                                        setPendingChallanDateJob(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                The following jobs already have the same Challan Date. Do you want to continue?
                            </p>
                            <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Job Ref</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Location</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Customer</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {duplicateJobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{job.refNumber || `#${job.id}`}</td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{job.workLocation || 'N/A'}</td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{job.customer?.name || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowDuplicateModal(false);
                                        setDuplicateJobs([]);
                                        setPendingChallanDateJob(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDuplicate}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg"
                                >
                                    Continue Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Job } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/lib/settingsContext';
import { generateTopsheetPDFBlob } from '@/components/jobs/TopsheetPDF';

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
    _count?: {
        jobs: number;
    };
    // Computed fields from API
    grandTotal?: number;
    totalExpenses?: number;
    totalProfit?: number;
}

export default function TopsheetsPage() {
    const router = useRouter();
    const { settings } = useSettings();
    const [topsheets, setTopsheets] = useState<Topsheet[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTopsheet, setEditingTopsheet] = useState<Topsheet | null>(null);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
    
    // Form state
    const [formData, setFormData] = useState({
        topsheetNumber: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        notes: '',
    });

    // Duplicate Challan Date Modal states (for job assignment)
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateJobs, setDuplicateJobs] = useState<Job[]>([]);
    const [pendingJobUpdate, setPendingJobUpdate] = useState<{ jobId: number; challanDate: string } | null>(null);

    const pdfRef = useRef<HTMLIFrameElement>(null);

    // Fetch topsheets
    const fetchTopsheets = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/topsheets');
            const result = await response.json();
            if (result.success) {
                setTopsheets(result.data);
            }
        } catch (error) {
            console.error('Error fetching topsheets:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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

    // Fetch available jobs (not assigned to any topsheet) plus assigned ones
    const fetchAvailableJobs = useCallback(async (assignedJobIds: number[] = []) => {
        try {
            const response = await fetch('/api/jobs?limit=1000');
            const result = await response.json();
            if (result.success) {
                // Filter jobs: either not assigned OR assigned to this topsheet
                const availableJobs = result.data.filter((job: Job) => 
                    !job.topsheetId || assignedJobIds.includes(job.id!)
                );
                setAvailableJobs(availableJobs);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    }, []);

    useEffect(() => {
        fetchTopsheets();
    }, [fetchTopsheets]);

    useEffect(() => {
        if (showModal) {
            fetchCustomers();
            // Pass assigned job IDs when editing
            fetchAvailableJobs(editingTopsheet ? selectedJobs : []);
        }
    }, [showModal, fetchCustomers, fetchAvailableJobs, editingTopsheet, selectedJobs]);

    // Generate topsheet number
    const generateTopsheetNumber = () => {
        const prefix = 'TS';
        const types = ['2.4', '3.1', '3.2', 'M'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const num = Math.floor(Math.random() * 100) + 1;
        return `${prefix}-${randomType}.${num}`;
    };

    // Handle customer selection
    const handleCustomerChange = (customerId: string) => {
        setFormData(prev => ({ ...prev, customerId }));
    };

    // Get selected customer name for subject line
    const getSelectedCustomerName = () => {
        if (!formData.customerId) return '';
        const customer = customers.find(c => c.id === parseInt(formData.customerId));
        return customer?.name || '';
    };

    // Get default subject line
    const getDefaultSubjectLine = () => {
        const customerName = getSelectedCustomerName();
        if (!customerName) return '';
        return `Subject: Topsheet of working at different locations of ${customerName}`;
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.customerId) {
            alert('Please select a customer');
            return;
        }
        
        try {
            const payload = {
                topsheetNumber: formData.topsheetNumber,
                date: formData.date,
                customerId: parseInt(formData.customerId),
                notes: formData.notes,
                jobIds: selectedJobs,
            };

            let response;
            if (editingTopsheet) {
                response = await fetch('/api/topsheets', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingTopsheet.id, ...payload }),
                });
            } else {
                response = await fetch('/api/topsheets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const result = await response.json();
            
            if (result.success) {
                setShowModal(false);
                resetForm();
                fetchTopsheets();
            } else {
                alert(result.error || 'Failed to save topsheet');
            }
        } catch (error) {
            console.error('Error saving topsheet:', error);
            alert('Failed to save topsheet');
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            topsheetNumber: '',
            date: new Date().toISOString().split('T')[0],
            customerId: '',
            notes: '',
        });
        setSelectedJobs([]);
        setEditingTopsheet(null);
    };

    // Edit topsheet
    const handleEdit = async (topsheet: Topsheet) => {
        // Fetch full topsheet with jobs
        try {
            const response = await fetch(`/api/topsheets?id=${topsheet.id}`);
            const result = await response.json();
            if (result.success) {
                const fullTopsheet = result.data;
                // Get job IDs that are already assigned to this topsheet FIRST
                const assignedJobIds = fullTopsheet.jobs?.map((j: Job) => j.id) || [];
                
                // Set state before opening modal
                setEditingTopsheet(fullTopsheet);
                setSelectedJobs(assignedJobIds);
                
                setFormData({
                    topsheetNumber: fullTopsheet.topsheetNumber,
                    date: new Date(fullTopsheet.date).toISOString().split('T')[0],
                    customerId: fullTopsheet.customerId?.toString() || '',
                    notes: fullTopsheet.notes || '',
                });
                
                // Fetch jobs including the assigned ones
                await fetchAvailableJobs(assignedJobIds);
                setShowModal(true);
            }
        } catch (error) {
            console.error('Error fetching topsheet:', error);
        }
    };

    // Delete topsheet
    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this topsheet? Jobs will be unassigned.')) {
            return;
        }

        try {
            const response = await fetch(`/api/topsheets?id=${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                fetchTopsheets();
            } else {
                alert(result.error || 'Failed to delete topsheet');
            }
        } catch (error) {
            console.error('Error deleting topsheet:', error);
            alert('Failed to delete topsheet');
        }
    };

    // Toggle topsheet status
    const handleStatusToggle = async (topsheet: Topsheet) => {
        const newStatus = topsheet.status === 'SUBMITTED' ? 'DRAFT' : 'SUBMITTED';
        
        try {
            const response = await fetch('/api/topsheets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: topsheet.id, 
                    status: newStatus 
                }),
            });
            const result = await response.json();
            if (result.success) {
                fetchTopsheets();
            } else {
                alert(result.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    // Toggle job selection
    const toggleJob = (jobId: number) => {
        setSelectedJobs(prev => 
            prev.includes(jobId) 
                ? prev.filter(id => id !== jobId)
                : [...prev, jobId]
        );
    };

    // Format date
    const formatDate = (dateStr: string | Date) => {
        const d = new Date(dateStr);
        
        // Get date format settings
        const dateFormat = settings?.dateFormat?.format || 'BD';
        
        if (dateFormat === 'US') {
            return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } else {
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };

    return (
        <DashboardLayout title="Topsheet Management">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topsheet Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage topsheets for job submissions.</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setFormData(prev => ({ ...prev, topsheetNumber: generateTopsheetNumber() }));
                            setShowModal(true);
                        }}
                        className="btn-3d btn-3d-primary"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Topsheet
                    </button>
                </div>

                {/* Topsheets List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="p-4">Topsheet No.</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 hidden md:table-cell">Customer</th>
                                    <th className="p-4 text-center">Jobs</th>
                                    <th className="p-4 text-right">Grand Total</th>
                                    <th className="p-4 text-right">Expenses</th>
                                    <th className="p-4 text-right">Profit</th>
                                    <th className="p-4 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            Loading topsheets...
                                        </td>
                                    </tr>
                                ) : topsheets.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            No topsheets found. Create your first topsheet!
                                        </td>
                                    </tr>
                                ) : (
                                    topsheets.map((topsheet) => {
                                        // Use calculated totals from API
                                        const grandTotal = topsheet.grandTotal || 0;
                                        const totalExpenses = topsheet.totalExpenses || 0;
                                        const totalProfit = topsheet.totalProfit || 0;
                                        
                                        return (
                                        <tr key={topsheet.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4">
                                                <button
                                                    onClick={() => router.push(`/topsheets/edit/${topsheet.id}`)}
                                                    className="table-ref-btn"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    {topsheet.topsheetNumber}
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusToggle(topsheet)}
                                                        className={`toggle-switch ${topsheet.status === 'SUBMITTED' ? 'toggle-switch-active' : ''}`}
                                                        aria-label="Toggle status"
                                                    />
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${topsheet.status === 'SUBMITTED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                        {topsheet.status === 'SUBMITTED' ? 'Submitted' : 'Draft'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                                {formatDate(topsheet.date)}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">
                                                {topsheet.customerName}
                                            </td>
                                            <td className="p-4 text-sm text-center">
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                                    {topsheet._count?.jobs || topsheet.jobs?.length || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(grandTotal)}
                                            </td>
                                            <td className="p-4 text-sm text-right font-medium text-orange-600">
                                                {formatCurrency(totalExpenses)}
                                            </td>
                                            <td className="p-4 text-sm text-right font-medium">
                                                <span className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(totalProfit)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                // Fetch full topsheet with jobs
                                                                const response = await fetch(`/api/topsheets?id=${topsheet.id}`);
                                                                const result = await response.json();
                                                                
                                                                if (result.success && result.data) {
                                                                    const blob = await generateTopsheetPDFBlob(result.data, {
                                                                        settings: {
                                                                            company: {
                                                                                name: settings?.company?.name || 'AMK Enterprise',
                                                                                tagline: settings?.company?.tagline || 'General Order & Supplier',
                                                                            },
                                                                            dateFormat: {
                                                                                format: settings?.dateFormat?.format || 'BD',
                                                                                showPrefix: settings?.dateFormat?.showPrefix,
                                                                                prefixText: settings?.dateFormat?.prefixText,
                                                                            },
                                                                        },
                                                                    });
                                                                    
                                                                    // Download the blob
                                                                    const url = window.URL.createObjectURL(blob);
                                                                    const a = document.createElement('a');
                                                                    a.href = url;
                                                                    a.download = `Topsheet-${topsheet.topsheetNumber}.pdf`;
                                                                    document.body.appendChild(a);
                                                                    a.click();
                                                                    window.URL.revokeObjectURL(url);
                                                                    document.body.removeChild(a);
                                                                } else {
                                                                    alert('Failed to load topsheet data');
                                                                }
                                                            } catch (err) {
                                                                console.error('Error generating PDF:', err);
                                                                alert('Failed to generate PDF');
                                                            }
                                                        }}
                                                        className="table-action-btn table-action-export"
                                                        title="Export PDF"
                                                    >
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        PDF
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(`/api/topsheets/export?id=${topsheet.id}`, '_blank')}
                                                        className="table-action-btn table-action-export"
                                                        title="Export Excel"
                                                    >
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        Excel
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(topsheet.id)}
                                                        className="table-action-btn table-action-delete"
                                                    >
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {editingTopsheet ? 'Edit Topsheet' : 'Create New Topsheet'}
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Topsheet Number *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        value={formData.topsheetNumber}
                                        onChange={(e) => setFormData(prev => ({ ...prev, topsheetNumber: e.target.value }))}
                                        placeholder="TS-2.4.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Date *
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
                                        Select Customer *
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        value={formData.customerId}
                                        onChange={(e) => handleCustomerChange(e.target.value)}
                                    >
                                        <option value="">-- Select a Customer --</option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Any additional notes..."
                                    />
                                </div>
                            </div>

                            {/* Job Selection */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                                    Assign Jobs to Topsheet
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Select jobs that are not assigned to any topsheet yet.
                                </p>
                                
                                {availableJobs.length === 0 ? (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center text-gray-500 dark:text-gray-400">
                                        No unassigned jobs available. All jobs are already assigned to topsheets.
                                    </div>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                    <th className="p-3 w-10"></th>
                                                    <th className="p-3">Job Ref</th>
                                                    <th className="p-3">Subject</th>
                                                    <th className="p-3">Location</th>
                                                    <th className="p-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {availableJobs.map((job) => (
                                                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="p-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedJobs.includes(job.id!)}
                                                                onChange={() => toggleJob(job.id!)}
                                                                className="w-4 h-4 text-blue-600 rounded"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-sm text-blue-600 font-medium">
                                                            {job.refNumber}
                                                        </td>
                                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                                                            {job.subject}
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
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    {selectedJobs.length} job(s) selected
                                </p>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="btn-3d btn-3d-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn-3d btn-3d-primary"
                            >
                                {editingTopsheet ? 'Update Topsheet' : 'Create Topsheet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

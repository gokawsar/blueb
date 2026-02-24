'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Job, JobStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { generateBulkPDFBlob } from '@/components/jobs/DocumentPDF';
import { useSettings } from '@/lib/settingsContext';

const statusColors: Record<JobStatus, string> = {
    BILL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    QUOTATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    CHALLAN: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

export default function JobsPage() {
    const router = useRouter();
    const { settings } = useSettings();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [showGenerateMenu, setShowGenerateMenu] = useState(false);
    const [generatingDocs, setGeneratingDocs] = useState(false);
    const generateMenuRef = useRef<HTMLDivElement>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Stats
    const [stats, setStats] = useState({
        totalJobs: 0,
        totalRevenue: 0,
        pendingBills: 0,
    });

    // Modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [jobToDelete, setJobToDelete] = useState<number | null>(null);
    
    // PDF generation options
    const [includePad, setIncludePad] = useState(false);
    const [includeSignature, setIncludeSignature] = useState(false);

    // Fetch jobs from API
    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', limit.toString());
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);

            const response = await fetch(`/api/jobs?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setJobs(result.data);
                setTotal(result.total);
                setTotalPages(result.totalPages);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/jobs?limit=1000');
            const result = await response.json();

            if (result.success) {
                const allJobs = result.data;
                const totalRevenue = allJobs
                    .filter((j: Job) => j.status === 'BILL')
                    .reduce((sum: number, j: Job) => sum + (j.totalAmount || 0), 0);
                const pendingBills = allJobs.filter((j: Job) =>
                    j.status === 'QUOTATION' || j.status === 'CHALLAN'
                ).length;

                setStats({
                    totalJobs: allJobs.length,
                    totalRevenue,
                    pendingBills,
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedJobs([]);
        } else {
            setSelectedJobs(jobs.map(job => job.id!));
        }
        setSelectAll(!selectAll);
    };

    const toggleJob = (id: number) => {
        if (selectedJobs.includes(id)) {
            setSelectedJobs(selectedJobs.filter(jobId => jobId !== id));
        } else {
            setSelectedJobs([...selectedJobs, id]);
        }
    };

    const handleDelete = async () => {
        if (!jobToDelete) return;

        try {
            const response = await fetch(`/api/jobs?id=${jobToDelete}`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (result.success) {
                fetchJobs();
                fetchStats();
            } else {
                alert('Failed to delete job');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        } finally {
            setShowDeleteModal(false);
            setJobToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedJobs.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedJobs.length} selected job(s)?`)) {
            return;
        }

        try {
            for (const id of selectedJobs) {
                await fetch(`/api/jobs?id=${id}`, { method: 'DELETE' });
            }
            fetchJobs();
            fetchStats();
            setSelectedJobs([]);
            setSelectAll(false);
        } catch (error) {
            console.error('Error bulk deleting jobs:', error);
            alert('Failed to delete jobs');
        }
    };

    const handleEdit = (id: number) => {
        router.push(`/jobs/edit/${id}`);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (generateMenuRef.current && !generateMenuRef.current.contains(event.target as Node)) {
                setShowGenerateMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle bulk PDF download - uses @react-pdf/renderer like view job page
    const handleBulkPrint = async (docType: 'bill' | 'quotation' | 'challan') => {
        if (selectedJobs.length === 0) {
            alert('Please select at least one job to print');
            return;
        }

        setShowGenerateMenu(false);
        setGeneratingDocs(true);

        // Get all selected jobs - allow any status to be printed
        const selectedJobsData = jobs.filter(j => selectedJobs.includes(j.id!));
        
        // Use all selected jobs regardless of status
        const compatibleJobs = selectedJobsData;

        if (compatibleJobs.length === 0) {
            alert('No jobs selected. Please select at least one job.');
            setGeneratingDocs(false);
            return;
        }

        try {
            // Generate PDF using @react-pdf/renderer with settings from configuration
            const pdfSettings = {
                company: {
                    name: settings?.company?.name || 'AMK Enterprise',
                    tagline: settings?.company?.tagline || 'General Order & Supplier',
                    email: settings?.company?.email || 'info@amkenterprise.com',
                    phone: settings?.company?.phone || '+880 2 222 111 333',
                },
                invoice: {
                    ...settings?.invoice,
                    topMargin: settings?.invoice?.topMargin || 20,
                    bottomMargin: settings?.invoice?.bottomMargin || 20,
                },
                signature: {
                    enabled: includeSignature,
                    imageUrl: '/images/Sig_Seal.png',
                    size: settings?.signature?.size || 60,
                },
                dateFormat: {
                    format: settings?.dateFormat?.format || 'BD',
                    showPrefix: settings?.dateFormat?.showPrefix ?? true,
                    prefixText: settings?.dateFormat?.prefixText || 'Date: ',
                },
            };
            
            const blob = await generateBulkPDFBlob(compatibleJobs as Job[], docType, {
                includePad: includePad,
                includeSignature: includeSignature,
                settings: pdfSettings,
            });

            // Download the PDF
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bulk-${docType}s-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating bulk PDF:', error);
            alert('Failed to generate PDF');
        } finally {
            setGeneratingDocs(false);
        }
    };

    const selectedCount = selectedJobs.length;

    // Format date
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <DashboardLayout title="Jobs Management">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalJobs}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Bills</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pendingBills}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Create, manage, and track all your jobs, quotations, and bills.</p>
                    </div>
                    <button
                        onClick={() => router.push('/jobs/create')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Job
                    </button>
                </div>

                {/* Jobs Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    {/* Table Header & Actions */}
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Jobs</h2>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                                {total} total
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative" ref={generateMenuRef}>
                                <button
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                    onClick={() => setShowGenerateMenu(!showGenerateMenu)}
                                    disabled={generatingDocs}
                                >
                                    {generatingDocs ? (
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    {generatingDocs ? 'Generating...' : 'Generate PDF'}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {showGenerateMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                                        {/* Options */}
                                        <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                                            <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={includePad}
                                                    onChange={(e) => setIncludePad(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-200">Include Pad</span>
                                            </label>
                                            <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={includeSignature}
                                                    onChange={(e) => setIncludeSignature(e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-200">Include Signature</span>
                                            </label>
                                        </div>
                                        <button 
                                            onClick={() => handleBulkPrint('bill')}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg"
                                        >
                                            Download Bill(s) PDF
                                        </button>
                                        <button 
                                            onClick={() => handleBulkPrint('quotation')}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            Download Quotation(s) PDF
                                        </button>
                                        <button 
                                            onClick={() => handleBulkPrint('challan')}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-b-lg"
                                        >
                                            Download Challan(s) PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => {
                                    if (selectedJobs.length === 0) {
                                        alert('Please select at least one job to generate a topsheet');
                                        return;
                                    }
                                    router.push('/topsheets');
                                }}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/30"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Generate Topsheet
                            </button>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative flex-1 max-w-md">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                                placeholder="Search jobs by ref, customer, subject..."
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <select
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Status</option>
                            <option value="BILL">Bill</option>
                            <option value="QUOTATION">Quotation</option>
                            <option value="CHALLAN">Challan</option>
                        </select>
                        {selectedCount > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete ({selectedCount})
                            </button>
                        )}
                    </div>

                    {/* Selected Jobs Bar */}
                    {selectedCount > 0 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {selectedCount} job{selectedCount > 1 ? 's' : ''} selected
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium"
                                        onClick={toggleSelectAll}
                                    >
                                        {selectAll ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                        className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                                        onClick={() => {
                                            setSelectedJobs([]);
                                            setSelectAll(false);
                                        }}
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="p-4 w-12 text-center">
                                        <input
                                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="p-4">Job Ref</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Location</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Topsheet</th>
                                    <th className="p-4 text-right">Expenses</th>
                                    <th className="p-4 text-right">Grand Total</th>
                                    <th className="p-4 text-right">Profit</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={13} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            Loading jobs...
                                        </td>
                                    </tr>
                                ) : jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            No jobs found. Create your first job!
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                            <td className="p-4 text-center">
                                                <input
                                                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                                    type="checkbox"
                                                    checked={selectedJobs.includes(job.id!)}
                                                    onChange={() => toggleJob(job.id!)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    className="table-ref-btn"
                                                    onClick={() => router.push(`/jobs/${job.id}`)}
                                                >
                                                    {job.refNumber}
                                                </button>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(job.date)}</td>
                                            <td className="p-4 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate" title={job.subject}>
                                                {job.subject}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                                        {job.customer?.name?.charAt(0) || '?'}
                                                    </div>
                                                    {job.customer?.name || '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={job.workLocation || ''}>
                                                {job.workLocation || '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <select
                                                    className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${job.status === 'BILL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                                            job.status === 'CHALLAN' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                                                                job.status === 'QUOTATION' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                                                    'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                                        }`}
                                                    value={job.status || 'NONE'}
                                                    onChange={async (e) => {
                                                        const newStatus = e.target.value as 'BILL' | 'CHALLAN' | 'QUOTATION' | 'NONE';
                                                        try {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            const response = await fetch('/api/jobs', {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                        id: job.id,
                                                                        status: newStatus === 'NONE' ? null : newStatus,
                                                                        quotationDate: newStatus === 'QUOTATION' ? today : (newStatus === 'NONE' ? null : job.quotationDate),
                                                                        challanDate: newStatus === 'CHALLAN' ? today : (newStatus === 'NONE' ? null : job.challanDate),
                                                                        billDate: newStatus === 'BILL' ? today : (newStatus === 'NONE' ? null : job.billDate),
                                                                    }),
                                                            });
                                                            if (response.ok) {
                                                                fetchJobs();
                                                                fetchStats();
                                                            }
                                                        } catch (error) {
                                                            console.error('Error updating job status:', error);
                                                        }
                                                    }}
                                                >
                                                    <option value="NONE">-</option>
                                                    <option value="QUOTATION">Quotation</option>
                                                    <option value="CHALLAN">Challan</option>
                                                    <option value="BILL">Bill</option>
                                                </select>
                                            </td>
                                            <td className="p-4 text-center">
                                                {job.topsheetId ? (
                                                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                                                        Assigned
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right text-sm font-semibold text-orange-600">
                                                {formatCurrency(job.totalExpenses || 0)}
                                            </td>
                                            <td className="p-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(job.totalAmount || 0)}
                                            </td>
                                            <td className="p-4 text-right text-sm font-bold">
                                                <span className={(job.totalAmount - (job.totalExpenses || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency((job.totalAmount || 0) - (job.totalExpenses || 0))}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(job.id!)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => { setJobToDelete(job.id!); setShowDeleteModal(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Show
                                <select
                                    className="mx-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                    value={limit}
                                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                >
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={250}>250</option>
                                    <option value={500}>500</option>
                                    <option value={1000}>1000</option>
                                </select>
                                entries
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Showing <span className="font-medium text-gray-900 dark:text-white">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-900 dark:text-white">{total}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                                disabled={page === 1}
                                onClick={() => setPage(1)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={`px-3 py-1 border rounded-lg text-sm ${page === pageNum
                                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            <button
                                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                                disabled={page === totalPages}
                                onClick={() => setPage(totalPages)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete this job? This action cannot be undone and all associated line items will also be deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowDeleteModal(false); setJobToDelete(null); }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

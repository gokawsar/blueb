'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency } from '@/lib/utils';

// Status colors
const statusColors: Record<string, string> = {
    BILL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    QUOTATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    CHALLAN: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

// Month names
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface MonthlyProfit {
    revenue: number;
    expenses: number;
    profit: number;
    topsheets: any[];
    allTopsheets: any[];
    jobs: any[];
}

interface DashboardData {
    year: number;
    totalJobsCount: number;
    totalRevenue: number;
    jobsByMonth: Record<string, { count: number; totalAmount: number; jobs: any[] }>;
    monthlyProfit: Record<string, MonthlyProfit>;
    annualRevenue: number;
    annualExpenses: number;
    annualProfit: number;
    currentMonthProfit: MonthlyProfit;
    currentMonth: string;
    jobsByStatus: Record<string, number>;
    topsheetsCount: number;
    allTopsheetsCount: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(months[new Date().getMonth()]);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            // Check cookie first
            const cookies = document.cookie.split(';');
            let userFromCookie = null;
            
            for (const cookie of cookies) {
                const parts = cookie.trim().split('=');
                if (parts[0] === 'user') {
                    try {
                        userFromCookie = JSON.parse(decodeURIComponent(parts.slice(1).join('=')));
                    } catch (e) {
                        console.error('Failed to parse user cookie:', e);
                    }
                    break;
                }
            }

            // Fallback to localStorage
            const userFromStorage = localStorage.getItem('user');
            
            if (userFromCookie || userFromStorage) {
                setIsAuthenticated(true);
            } else {
                // Not authenticated, redirect to login
                router.push('/login');
            }
        };
        
        checkAuth();
    }, [router]);

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/dashboard?year=${currentYear}`);
            const result = await response.json();
            if (result.success) {
                setDashboardData(result.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [currentYear]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Get current month data
    const currentMonthData: MonthlyProfit = dashboardData?.monthlyProfit[selectedMonth] || { revenue: 0, expenses: 0, profit: 0, topsheets: [], allTopsheets: [], jobs: [] };
    const currentMonthJobs = dashboardData?.jobsByMonth[selectedMonth] || { count: 0, totalAmount: 0, jobs: [] };

    if (loading || !isAuthenticated) {
        return (
            <DashboardLayout title="Dashboard Overview">
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading dashboard data...' : 'Redirecting to login...'}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Dashboard Overview">
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header with Year Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of jobs and profits for {currentYear}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentYear(y => y - 1)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold">
                            {currentYear}
                        </span>
                        <button
                            onClick={() => setCurrentYear(y => y + 1)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Jobs */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-blue-500 transition-colors" onClick={() => router.push('/jobs')}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                    {dashboardData?.totalJobsCount || 0}
                                </h3>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-sm">
                            <span className="text-blue-600 font-medium">{dashboardData?.jobsByStatus.QUOTATION || 0} Quotation</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-orange-600 font-medium">{dashboardData?.jobsByStatus.CHALLAN || 0} Challan</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-emerald-600 font-medium">{dashboardData?.jobsByStatus.BILL || 0} Bill</span>
                        </div>
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            Click to view all jobs <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </div>

                    {/* Annual Revenue */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual Revenue</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                    {formatCurrency(dashboardData?.annualRevenue || 0)}
                                </h3>
                            </div>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Annual Expenses: </span>
                            <span className="text-red-600 font-medium ml-1">{formatCurrency(dashboardData?.annualExpenses || 0)}</span>
                        </div>
                    </div>

                    {/* Annual Profit */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-purple-500 transition-colors" onClick={() => router.push('/topsheets')}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual Profit</p>
                                <h3 className={`text-2xl font-bold mt-2 ${(dashboardData?.annualProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(dashboardData?.annualProfit || 0)}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg ${(dashboardData?.annualProfit || 0) >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Submitted Topsheets: </span>
                            <span className="text-gray-900 dark:text-white font-medium ml-1">{dashboardData?.topsheetsCount || 0}</span>
                        </div>
                        <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            Click to view topsheets <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </div>

                    {/* Current Month Profit */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{selectedMonth} Profit</p>
                                <h3 className={`text-2xl font-bold mt-2 ${currentMonthData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(currentMonthData.profit)}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg ${currentMonthData.profit >= 0 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Revenue: </span>
                            <span className="text-gray-900 dark:text-white font-medium ml-1">{formatCurrency(currentMonthData.revenue)}</span>
                        </div>
                    </div>
                </div>

                {/* Calendar View and Profit Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Calendar View */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Jobs Calendar - {currentYear}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly view of jobs</p>
                        </div>
                        
                        {/* Month Selector */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {months.map((month) => {
                                    const monthData = dashboardData?.jobsByMonth[month] || { count: 0, totalAmount: 0 };
                                    const isSelected = selectedMonth === month;
                                    return (
                                        <button
                                            key={month}
                                            onClick={() => setSelectedMonth(month)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {month.substring(0, 3)}
                                            <span className={`ml-1 ${isSelected ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                ({monthData.count})
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Month Jobs */}
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedMonth} Jobs</h3>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Total: {formatCurrency(currentMonthJobs.totalAmount)}
                                </span>
                            </div>
                            
                            {currentMonthJobs.jobs && currentMonthJobs.jobs.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {currentMonthJobs.jobs.map((job: any) => (
                                        <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                                                    {job.refNumber?.slice(-3) || '#'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{job.refNumber}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{job.customerName || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(job.totalAmount)}</p>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
                                                    {job.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No jobs in {selectedMonth}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Profit View */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topsheet Profit View - {currentYear}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly expected profit from submitted topsheets</p>
                        </div>

                        {/* Month Profit List */}
                        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                            {months.map((month) => {
                                const monthProfit: MonthlyProfit = dashboardData?.monthlyProfit[month] || { revenue: 0, expenses: 0, profit: 0, topsheets: [], allTopsheets: [], jobs: [] };
                                const isSelected = selectedMonth === month;
                                const hasSubmitted = monthProfit.topsheets && monthProfit.topsheets.length > 0;
                                const hasAll = monthProfit.allTopsheets && monthProfit.allTopsheets.length > 0;
                                return (
                                    <button
                                        key={month}
                                        onClick={() => setSelectedMonth(month)}
                                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                                : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-900 dark:text-white">{month}</span>
                                            <div className="text-right">
                                                <span className={`font-bold ${monthProfit.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(monthProfit.profit)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>Rev: {formatCurrency(monthProfit.revenue)}</span>
                                            <span>Exp: {formatCurrency(monthProfit.expenses)}</span>
                                        </div>
                                        {(hasSubmitted || hasAll) && (
                                            <div className="mt-1 flex gap-2 text-xs">
                                                {hasSubmitted && (
                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                        {monthProfit.topsheets.length} submitted
                                                    </span>
                                                )}
                                                {hasAll && (
                                                    <span className="text-orange-600 dark:text-orange-400">
                                                        ({monthProfit.allTopsheets.length} total)
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected Month Details */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{selectedMonth} Details</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(currentMonthData.revenue)}</p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(currentMonthData.expenses)}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${currentMonthData.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Profit</p>
                                    <p className={`text-lg font-bold ${currentMonthData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(currentMonthData.profit)}
                                    </p>
                                </div>
                            </div>
                            
                            {currentMonthData.topsheets && currentMonthData.topsheets.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Submitted Topsheets:</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {currentMonthData.topsheets.map((ts: any) => (
                                            <div key={ts.id} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                                <span>{ts.topsheetNumber}</span>
                                                <span className="font-medium">{formatCurrency(ts.profit)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Annual Summary Chart Placeholder */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Annual Profit Summary - {currentYear}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly profit distribution</p>
                    </div>
                    <div className="p-6">
                        <div className="flex items-end justify-between h-48 gap-2">
                            {months.map((month) => {
                                const monthProfit = dashboardData?.monthlyProfit[month] || { profit: 0 };
                                const maxProfit = Math.max(...Object.values(dashboardData?.monthlyProfit || {}).map((m: any) => Math.abs(m.profit)), 1);
                                const height = Math.max((Math.abs(monthProfit.profit) / maxProfit) * 100, 2);
                                const isSelected = selectedMonth === month;
                                
                                return (
                                    <button
                                        key={month}
                                        onClick={() => setSelectedMonth(month)}
                                        className={`flex-1 rounded-t transition-all ${isSelected ? 'bg-blue-600' : monthProfit.profit >= 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                                        style={{ height: `${height}%` }}
                                        title={`${month}: ${formatCurrency(monthProfit.profit)}`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-2">
                            {months.map((month) => (
                                <button
                                    key={month}
                                    onClick={() => setSelectedMonth(month)}
                                    className={`text-xs ${selectedMonth === month ? 'text-blue-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {month.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Mock report data
const mockMonthlyData = [
    { month: 'Jan', revenue: 45000, jobs: 12 },
    { month: 'Feb', revenue: 52000, jobs: 15 },
    { month: 'Mar', revenue: 48000, jobs: 11 },
    { month: 'Apr', revenue: 61000, jobs: 18 },
    { month: 'May', revenue: 55000, jobs: 14 },
    { month: 'Jun', revenue: 67000, jobs: 20 },
    { month: 'Jul', revenue: 72000, jobs: 22 },
    { month: 'Aug', revenue: 69000, jobs: 19 },
    { month: 'Sep', revenue: 78000, jobs: 24 },
    { month: 'Oct', revenue: 85000, jobs: 26 },
    { month: 'Nov', revenue: 92000, jobs: 28 },
    { month: 'Dec', revenue: 98000, jobs: 30 },
];

const mockTopCustomers = [
    { name: 'Wayne Enterprises', revenue: 890000, jobs: 22 },
    { name: 'Stark Industries', revenue: 125000, jobs: 8 },
    { name: 'Massive Dynamic', revenue: 89000, jobs: 12 },
    { name: 'Hooli', revenue: 45000, jobs: 4 },
    { name: 'Umbrella Corporation', revenue: 67000, jobs: 7 },
];

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState('this-year');

    const maxRevenue = Math.max(...mockMonthlyData.map(d => d.revenue));

    return (
        <DashboardLayout title="Reports & Analytics">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Track revenue, jobs, and business performance.</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="this-month">This Month</option>
                            <option value="last-month">Last Month</option>
                            <option value="this-quarter">This Quarter</option>
                            <option value="this-year">This Year</option>
                            <option value="all-time">All Time</option>
                        </select>
                        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">৳ 8,72,000</h3>
                            </div>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                +18.2%
                            </span>
                            <span className="text-gray-400 ml-2">vs last year</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">199</h3>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                +12.5%
                            </span>
                            <span className="text-gray-400 ml-2">vs last year</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Job Value</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">৳ 43,819</h3>
                            </div>
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                +5.1%
                            </span>
                            <span className="text-gray-400 ml-2">vs last year</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Bills</p>
                                <h3 className="text-2xl font-bold text-orange-500 mt-2">24</h3>
                            </div>
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-orange-500 font-medium">৳ 3,45,000</span>
                            <span className="text-gray-400 ml-2">pending value</span>
                        </div>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Monthly Revenue Overview</h2>
                    <div className="h-64 flex items-end gap-2">
                        {mockMonthlyData.map((data, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer"
                                    style={{ height: `${(data.revenue / maxRevenue) * 200}px`, minHeight: '20px' }}
                                    title={`${data.month}: ৳ ${data.revenue.toLocaleString()}`}
                                ></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{data.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Customers */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Customers by Revenue</h2>
                        <div className="space-y-4">
                            {mockTopCustomers.map((customer, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">{customer.name}</span>
                                            <span className="text-sm font-semibold text-emerald-600">৳ {customer.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${(customer.revenue / mockTopCustomers[0].revenue) * 100}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{customer.jobs} jobs</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                            {[
                                { action: 'Bill generated', detail: 'JB-2023-010 for Wayne Enterprises', time: '2 hours ago', type: 'bill' },
                                { action: 'New quotation', detail: 'JB-2023-011 for Stark Industries', time: '4 hours ago', type: 'quote' },
                                { action: 'Payment received', detail: '৳ 52,000 from Acme Corp', time: 'Yesterday', type: 'payment' },
                                { action: 'Challan created', detail: 'JB-2023-009 for Cyberdyne', time: 'Yesterday', type: 'challan' },
                                { action: 'Customer added', detail: 'New customer: Massive Dynamic', time: '2 days ago', type: 'customer' },
                            ].map((activity, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'bill' ? 'bg-emerald-100 text-emerald-600' :
                                            activity.type === 'quote' ? 'bg-blue-100 text-blue-600' :
                                                activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                                                    activity.type === 'challan' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-purple-100 text-purple-600'
                                        }`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.detail}</p>
                                    </div>
                                    <span className="text-xs text-gray-400">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

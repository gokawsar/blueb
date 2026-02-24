import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 60;

// GET - Fetch dashboard data including jobs by month and topsheet profits
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        
        // Fetch all jobs with their items and expenses for the current year
        const jobs = await prisma.job.findMany({
            where: {
                date: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31, 23, 59, 59),
                },
            },
            include: {
                customer: true,
                items: true,
                expenses: {
                    where: { isActive: true }
                },
                topsheet: true,
            },
            orderBy: { date: 'asc' },
        });

        // Fetch all topsheets with their jobs for the current year (all statuses)
        const allTopsheets = await prisma.topsheet.findMany({
            where: {
                date: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31, 23, 59, 59),
                },
            },
            include: {
                jobs: {
                    include: {
                        items: true,
                        expenses: {
                            where: { isActive: true }
                        },
                    },
                },
            },
            orderBy: { date: 'asc' },
        });

        console.log('All topsheets for year', year, ':', allTopsheets.length);
        if (allTopsheets.length > 0) {
            console.log('First topsheet jobs count:', allTopsheets[0].jobs?.length || 0);
            if (allTopsheets[0].jobs && allTopsheets[0].jobs.length > 0) {
                console.log('First job items count:', allTopsheets[0].jobs[0].items?.length || 0);
                console.log('First job expenses count:', allTopsheets[0].jobs[0].expenses?.length || 0);
                console.log('First job totalAmount:', allTopsheets[0].jobs[0].totalAmount);
                console.log('First job totalExpenses:', allTopsheets[0].jobs[0].totalExpenses);
            }
        }

        // Separate submitted and all topsheets
        const submittedTopsheets = allTopsheets.filter(ts => ['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(ts.status));

        // Calculate jobs by month
        const jobsByMonth: Record<string, { count: number; totalAmount: number; jobs: any[] }> = {};
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        months.forEach(month => {
            jobsByMonth[month] = { count: 0, totalAmount: 0, jobs: [] };
        });

        jobs.forEach(job => {
            const monthIndex = new Date(job.date).getMonth();
            const monthName = months[monthIndex];
            
            // Recalculate job total from items
            let jobTotal = 0;
            if (job.items && job.items.length > 0) {
                jobTotal = job.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            } else {
                jobTotal = Number(job.totalAmount) || 0;
            }
            
            jobsByMonth[monthName].count++;
            jobsByMonth[monthName].totalAmount += jobTotal;
            jobsByMonth[monthName].jobs.push({
                id: job.id,
                refNumber: job.refNumber,
                subject: job.subject,
                jobDetail: job.jobDetail,
                date: job.date,
                status: job.status,
                workLocation: job.workLocation,
                totalAmount: jobTotal,
                customerName: job.customer?.name,
            });
        });

        // Calculate monthly profit from JOBS only (this is the source of truth)
        // Topsheets are just for reference/counting
        const monthlyProfit: Record<string, { revenue: number; expenses: number; profit: number; topsheets: any[]; allTopsheets: any[]; jobs: any[] }> = {};
        
        months.forEach(month => {
            monthlyProfit[month] = { revenue: 0, expenses: 0, profit: 0, topsheets: [], allTopsheets: [], jobs: [] };
        });

        // Calculate from ALL JOBS - this is the PRIMARY source of profit data
        jobs.forEach(job => {
            const monthIndex = new Date(job.date).getMonth();
            const monthName = months[monthIndex];
            
            // Calculate job revenue from items or fallback to totalAmount
            let jobRevenue = 0;
            if (job.items && job.items.length > 0) {
                jobRevenue = job.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            }
            if (jobRevenue === 0) {
                jobRevenue = Number(job.totalAmount) || 0;
            }
            
            // Calculate job expenses from job expenses or fallback to totalExpenses
            let jobExpenses = 0;
            if (job.expenses && job.expenses.length > 0) {
                jobExpenses = job.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
            }
            if (jobExpenses === 0) {
                jobExpenses = Number(job.totalExpenses) || 0;
            }
            
            const jobProfit = jobRevenue - jobExpenses;
            
            // Add to monthly profit
            monthlyProfit[monthName].revenue += jobRevenue;
            monthlyProfit[monthName].expenses += jobExpenses;
            monthlyProfit[monthName].profit += jobProfit;
            
            monthlyProfit[monthName].jobs.push({
                id: job.id,
                refNumber: job.refNumber,
                revenue: jobRevenue,
                expenses: jobExpenses,
                profit: jobProfit,
            });
        });

        // Add topsheets info separately (for reference only - NOT for profit calculation)
        submittedTopsheets.forEach(topsheet => {
            const monthIndex = new Date(topsheet.date).getMonth();
            const monthName = months[monthIndex];
            
            monthlyProfit[monthName].topsheets.push({
                id: topsheet.id,
                topsheetNumber: topsheet.topsheetNumber,
                date: topsheet.date,
                status: topsheet.status,
                jobsCount: topsheet.jobs?.length || 0,
            });
        });

        allTopsheets.forEach(topsheet => {
            const monthIndex = new Date(topsheet.date).getMonth();
            const monthName = months[monthIndex];
            
            monthlyProfit[monthName].allTopsheets.push({
                id: topsheet.id,
                topsheetNumber: topsheet.topsheetNumber,
                date: topsheet.date,
                status: topsheet.status,
                jobsCount: topsheet.jobs?.length || 0,
            });
        });

        // Calculate annual totals from JOBS (not from topsheets)
        const annualRevenue = Object.values(monthlyProfit).reduce((sum, m) => sum + m.revenue, 0);
        const annualExpenses = Object.values(monthlyProfit).reduce((sum, m) => sum + m.expenses, 0);
        const annualProfit = annualRevenue - annualExpenses;

        // Get current month data
        const currentMonth = months[new Date().getMonth()];
        const currentMonthProfit = monthlyProfit[currentMonth];

        // Get overall stats
        const totalJobsCount = jobs.length;
        const totalRevenue = jobs.reduce((sum, job) => {
            let jobTotal = 0;
            if (job.items && job.items.length > 0) {
                jobTotal = job.items.reduce((s, item) => s + (Number(item.total) || 0), 0);
            } else {
                jobTotal = Number(job.totalAmount) || 0;
            }
            return sum + jobTotal;
        }, 0);

        // Count jobs by status
        const jobsByStatus: Record<string, number> = {
            QUOTATION: jobs.filter(j => j.status === 'QUOTATION').length,
            CHALLAN: jobs.filter(j => j.status === 'CHALLAN').length,
            BILL: jobs.filter(j => j.status === 'BILL').length,
        };

        return NextResponse.json({
            success: true,
            data: {
                year,
                totalJobsCount,
                totalRevenue,
                jobsByMonth,
                monthlyProfit,
                annualRevenue,
                annualExpenses,
                annualProfit,
                currentMonthProfit,
                currentMonth,
                jobsByStatus,
                topsheetsCount: submittedTopsheets.length,
                allTopsheetsCount: allTopsheets.length,
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}

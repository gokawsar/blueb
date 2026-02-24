import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

// Increase payload size limit
export const maxDuration = 60;

// GET - Fetch all topsheets or single topsheet
export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const topsheet = await prisma.topsheet.findUnique({
                where: { id: parseInt(id), userId },
                include: {
                    jobs: {
                        include: {
                            customer: true,
                            items: true,
                            expenses: {
                                where: { isActive: true }
                            }
                        },
                        orderBy: { id: 'asc' }
                    }
                }
            });

            if (!topsheet) {
                return NextResponse.json({ success: false, error: 'Topsheet not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, data: topsheet });
        }

        // Get all topsheets with jobs for total amount calculation
        const topsheets = await prisma.topsheet.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { jobs: true }
                },
                jobs: {
                    include: {
                        items: true,
                        expenses: {
                            where: { isActive: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate totals for each topsheet
        const topsheetsWithTotals = topsheets.map(topsheet => {
            // Recalculate grandTotal from line items to ensure accuracy
            let grandTotal = 0;
            topsheet.jobs.forEach(job => {
                if (job.items && job.items.length > 0) {
                    grandTotal += job.items.reduce((sum, item) => sum + (item.total || 0), 0);
                } else {
                    grandTotal += job.totalAmount || 0;
                }
            });
            
            const totalExpenses = topsheet.jobs.reduce((sum, job) => {
                const jobExpenses = job.expenses.reduce((eSum, exp) => eSum + (exp.amount || 0), 0);
                return sum + jobExpenses;
            }, 0);
            const totalProfit = grandTotal - totalExpenses;
            
            return {
                ...topsheet,
                grandTotal,
                totalExpenses,
                totalProfit
            };
        });

        return NextResponse.json({ success: true, data: topsheetsWithTotals });
    } catch (error) {
        console.error('Error fetching topsheets:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch topsheets' }, { status: 500 });
    }
}

// POST - Create new topsheet
export async function POST(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const body = await request.json();
        const { topsheetNumber, date, customerId, notes, jobIds } = body;

        if (!topsheetNumber || !date || !customerId) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Check if topsheetNumber already exists for this user
        const existing = await prisma.topsheet.findUnique({
            where: { topsheetNumber, userId }
        });

        if (existing) {
            return NextResponse.json({ success: false, error: 'Topsheet number already exists' }, { status: 400 });
        }

        // Fetch customer details
        const customer = await prisma.customer.findUnique({
            where: { id: customerId, userId }
        });

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 400 });
        }

        // Generate default job detail
        const jobDetail = `Job Detail: Topsheet of working at different locations of ${customer.name}`;

        // Create topsheet with optional job assignments
        const topsheet = await prisma.topsheet.create({
            data: {
                topsheetNumber,
                date: new Date(date),
                customerId: customerId,
                customerName: customer.name,
                customerAddress1: customer.addressLine1,
                customerAddress2: customer.addressLine2,
                jobDetail: jobDetail,
                notes: notes || null,
                status: 'DRAFT',
                userId,
                ...(jobIds && jobIds.length > 0 && {
                    jobs: {
                        connect: jobIds.map((id: number) => ({ id }))
                    }
                })
            },
            include: {
                jobs: true
            }
        });

        return NextResponse.json({ success: true, data: topsheet });
    } catch (error) {
        console.error('Error creating topsheet:', error);
        return NextResponse.json({ success: false, error: 'Failed to create topsheet' }, { status: 500 });
    }
}

// PUT - Update topsheet
export async function PUT(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const body = await request.json();
        const { id, topsheetNumber, date, customerId, notes, status, jobIds } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Topsheet ID required' }, { status: 400 });
        }

        // If updating topsheet number, check for duplicates
        if (topsheetNumber) {
            const existing = await prisma.topsheet.findFirst({
                where: { 
                    topsheetNumber,
                    userId,
                    NOT: { id }
                }
            });

            if (existing) {
                return NextResponse.json({ success: false, error: 'Topsheet number already exists' }, { status: 400 });
            }
        }

        // Build update data
        const updateData: any = {};
        if (topsheetNumber) updateData.topsheetNumber = topsheetNumber;
        if (date) updateData.date = new Date(date);
        if (notes !== undefined) updateData.notes = notes;
        if (status) updateData.status = status;

        // Handle customer change
        if (customerId) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId, userId }
            });

            if (customer) {
                updateData.customerId = customerId;
                updateData.customerName = customer.name;
                updateData.customerAddress1 = customer.addressLine1;
                updateData.customerAddress2 = customer.addressLine2;
                // Generate default job detail
                updateData.jobDetail = `Job Detail: Topsheet of working at different locations of ${customer.name}`;
            }
        }

        // Handle job assignments
        if (jobIds !== undefined) {
            // Disconnect all current jobs
            await prisma.job.updateMany({
                where: { topsheetId: id, userId },
                data: { topsheetId: null }
            });

            // Connect new jobs
            if (jobIds.length > 0) {
                await prisma.job.updateMany({
                    where: { id: { in: jobIds }, userId },
                    data: { topsheetId: id }
                });
            }
        }

        const topsheet = await prisma.topsheet.update({
            where: { id, userId },
            data: updateData,
            include: {
                jobs: true
            }
        });

        return NextResponse.json({ success: true, data: topsheet });
    } catch (error) {
        console.error('Error updating topsheet:', error);
        return NextResponse.json({ success: false, error: 'Failed to update topsheet' }, { status: 500 });
    }
}

// DELETE - Delete topsheet
export async function DELETE(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Topsheet ID required' }, { status: 400 });
        }

        // First, unlink all jobs from this topsheet
        await prisma.job.updateMany({
            where: { topsheetId: parseInt(id), userId },
            data: { topsheetId: null }
        });

        // Delete the topsheet
        await prisma.topsheet.delete({
            where: { id: parseInt(id), userId }
        });

        return NextResponse.json({ success: true, message: 'Topsheet deleted successfully' });
    } catch (error) {
        console.error('Error deleting topsheet:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete topsheet' }, { status: 500 });
    }
}

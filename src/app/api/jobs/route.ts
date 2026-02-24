import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateRefNumber, numberToWords, calculateLineItem } from '@/lib/utils';
import { JobItem, Measurement } from '@/lib/types';
import { getUserIdFromRequest } from '@/lib/auth';

// GET all jobs or single job by ID
export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        // If ID is provided, return single job
        if (id) {
            const job = await prisma.job.findUnique({
                where: { id: Number(id), userId },
                include: {
                    customer: true,
                    topsheet: true,
                    items: {
                        include: {
                            measurements: {
                                orderBy: { sortOrder: 'asc' }
                            }
                        }
                    },
                    expenses: {
                        where: { isActive: true },
                        orderBy: { createdAt: 'asc' }
                    },
                },
            });

            if (!job) {
                return NextResponse.json(
                    { success: false, error: 'Job not found' },
                    { status: 404 }
                );
            }

            // Calculate total expenses - expenses are already filtered by isActive in the query
            const totalExpenses = job.expenses.reduce((sum: number, exp: { amount: number }) => sum + (exp.amount || 0), 0);
            
            // Recalculate totalAmount from line items to ensure accuracy
            let calculatedTotalAmount = 0;
            if (job.items && job.items.length > 0) {
                calculatedTotalAmount = job.items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);
            }
            
            // Use calculated total if items exist, otherwise fall back to stored value
            const finalTotalAmount = calculatedTotalAmount > 0 ? calculatedTotalAmount : (job.totalAmount || 0);
            const expectedProfit = finalTotalAmount - totalExpenses;

            // Build response with explicit field override
            const responseData = {
                id: job.id,
                refNumber: job.refNumber,
                subject: job.subject,
                jobDetail: job.jobDetail,
                date: job.date,
                status: job.status,
                topsheetId: job.topsheetId,
                customerId: job.customerId,
                workLocation: job.workLocation,
                subtotal: job.subtotal,
                totalVat: job.totalVat,
                totalAmount: finalTotalAmount,
                discountPercent: job.discountPercent,
                discountAmount: job.discountAmount,
                amountInWords: job.amountInWords,
                billNumber: job.billNumber,
                bblBillNumber: job.bblBillNumber,
                challanNumber: job.challanNumber,
                billDate: job.billDate,
                challanDate: job.challanDate,
                quotationDate: job.quotationDate,
                notes: job.notes,
                termsConditions: job.termsConditions,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                customer: job.customer,
                topsheet: job.topsheet,
                items: job.items,
                expenses: job.expenses,
                totalExpenses,
                expectedProfit,
            };

            return NextResponse.json({
                success: true,
                data: responseData,
            });
        }

        // Otherwise return list
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = { userId };

        if (search) {
            where.OR = [
                { refNumber: { contains: search } },
                { subject: { contains: search } },
                { customer: { name: { contains: search } } },
                { workLocation: { contains: search } },
            ];
        }

        if (status) {
            where.status = status;
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: true,
                    topsheet: true,
                    items: {
                        include: {
                            measurements: {
                                orderBy: { sortOrder: 'asc' }
                            }
                        }
                    },
                    expenses: {
                        where: { isActive: true },
                        orderBy: { createdAt: 'asc' }
                    },
                },
            }),
            prisma.job.count({ where }),
        ]);

        // Add totalExpenses and expectedProfit to each job
        const jobsWithExpenses = jobs.map(job => {
            // Expenses are already filtered by isActive in the Prisma query
            const totalExpenses = job.expenses.reduce((sum: number, exp: { amount: number }) => sum + (exp.amount || 0), 0);
            
            // Recalculate totalAmount from line items to ensure accuracy
            let calculatedTotalAmount = 0;
            if (job.items && job.items.length > 0) {
                calculatedTotalAmount = job.items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);
            }
            
            // Use calculated total if items exist, otherwise fall back to stored value
            const finalTotalAmount = calculatedTotalAmount > 0 ? calculatedTotalAmount : (job.totalAmount || 0);
            const expectedProfit = finalTotalAmount - totalExpenses;
            
            // Create a new object with explicit fields to override any database values
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(job)) {
                result[key] = (job as Record<string, unknown>)[key];
            }
            result.totalExpenses = totalExpenses;
            result.expectedProfit = expectedProfit;
            result.totalAmount = finalTotalAmount; // Override with calculated value
            return result;
        });

        return NextResponse.json({
            success: true,
            data: jobsWithExpenses,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch jobs' },
            { status: 500 }
        );
    }
}

// POST create new job with line items
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

        const {
            subject,
            jobDetail,
            date,
            customerId,
            workLocation,
            status = 'QUOTATION',
            items = [],
            notes,
            termsConditions,
            discountPercent = 0,
            quotationDate,
            challanDate,
            billDate,
            billNumber,
            bblBillNumber,
            challanNumber,
        } = body;

        // Generate reference number
        const refNumber = generateRefNumber();

        // Calculate totals
        let subtotal = 0;
        let totalVat = 0;

        const calculatedItems = items.map((item: JobItem, index: number) => {
            const calculated = calculateLineItem({ ...item, serialNumber: index + 1 });
            subtotal += calculated.subtotal;
            totalVat += calculated.vatAmount;
            return {
                ...calculated,
                inventoryId: item.inventoryId || null,
                sku: item.sku || null,
                skuName: item.skuName || null,
                details: item.details || null,
                widthFeet: item.widthFeet || null,
                widthInches: item.widthInches || null,
                heightFeet: item.heightFeet || null,
                heightInches: item.heightInches || null,
                calculatedSqft: item.calculatedSqft || null,
                autoCalculateSqft: item.autoCalculateSqft || false,
                measurementsJson: item.measurementsJson || null,
                measurements: item.measurements || [],
            };
        });

        const discountAmount = subtotal * (discountPercent / 100);
        const afterDiscount = subtotal - discountAmount;
        const totalAmount = afterDiscount + totalVat;

        // Create job with items in a transaction
        const job = await prisma.$transaction(async (tx) => {
            const newJob = await tx.job.create({
                data: {
                    refNumber,
                    subject,
                    jobDetail,
                    date: new Date(date),
                    status,
                    customerId: Number(customerId),
                    workLocation,
                    subtotal,
                    totalVat,
                    totalAmount,
                    discountPercent,
                    discountAmount,
                    amountInWords: numberToWords(totalAmount),
                    notes,
                    termsConditions,
                    quotationDate: quotationDate ? new Date(quotationDate) : null,
                    challanDate: challanDate ? new Date(challanDate) : null,
                    billDate: billDate ? new Date(billDate) : null,
                    billNumber: billNumber || null,
                    bblBillNumber: bblBillNumber || null,
                    challanNumber: challanNumber || null,
                    userId, // Multi-tenant: link to user
                    items: {
                        create: calculatedItems.map((item: JobItem) => ({
                            serialNumber: item.serialNumber,
                            workDescription: item.workDescription,
                            details: item.details || null,
                            quantity: item.quantity,
                            unit: item.unit,
                            inventoryId: item.inventoryId || null,
                            sku: item.sku || null,
                            skuName: item.skuName || null,
                            unitPrice: item.unitPrice,
                            buyPrice: item.buyPrice,
                            discountPercent: item.discountPercent,
                            discountAmount: item.discountAmount,
                            subtotal: item.subtotal,
                            vatRate: item.vatRate,
                            vatAmount: item.vatAmount,
                            total: item.total,
                            widthFeet: item.widthFeet || 0,
                            widthInches: item.widthInches || 0,
                            heightFeet: item.heightFeet || 0,
                            heightInches: item.heightInches || 0,
                            calculatedSqft: item.calculatedSqft || 0,
                            autoCalculateSqft: item.autoCalculateSqft || false,
                            measurementsJson: item.measurementsJson || null,
                            measurements: {
                                create: (item.measurements || []).map((m: Measurement, idx: number) => ({
                                    widthFeet: m.widthFeet || 0,
                                    widthInches: m.widthInches || 0,
                                    heightFeet: m.heightFeet || 0,
                                    heightInches: m.heightInches || 0,
                                    quantity: m.quantity || 1,
                                    calculatedSqft: m.calculatedSqft || 0,
                                    description: m.description || null,
                                    sortOrder: idx,
                                }))
                            }
                        })),
                    },
                },
                include: {
                    customer: true,
                    topsheet: true,
                    items: {
                        include: {
                            measurements: {
                                orderBy: { sortOrder: 'asc' }
                            }
                        }
                    },
                    expenses: {
                        where: { isActive: true },
                        orderBy: { createdAt: 'asc' }
                    },
                },
            });

            // Calculate total expenses - expenses are already filtered by isActive in the query
            const totalExpenses = newJob.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            // Recalculate totalAmount from line items to ensure accuracy
            let calculatedTotalAmount = 0;
            if (newJob.items && newJob.items.length > 0) {
                calculatedTotalAmount = newJob.items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);
            }
            
            // Use calculated total if items exist, otherwise fall back to stored value
            const finalTotalAmount = calculatedTotalAmount > 0 ? calculatedTotalAmount : (newJob.totalAmount || 0);
            const expectedProfit = finalTotalAmount - totalExpenses;

            return {
                ...newJob,
                totalExpenses,
                expectedProfit,
                totalAmount: finalTotalAmount,
            };
        });

        return NextResponse.json(
            { success: true, data: job, message: 'Job created successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create job' },
            { status: 500 }
        );
    }
}

// PUT update job with line items
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
        const {
            id,
            items: newItems,
            customerName, // Extract to remove from jobData
            createdAt, // Extract to remove from jobData
            updatedAt, // Extract to remove from jobData
            customer, // Extract to remove from jobData
            ...jobData
        } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Job ID is required' },
                { status: 400 }
            );
        }

        // Get the existing job to preserve customerId if not provided
        const existingJob = await prisma.job.findUnique({
            where: { id: Number(id), userId },
            select: { customerId: true, subtotal: true, totalVat: true, totalAmount: true, discountPercent: true, discountAmount: true }
        });

        // Use existing customerId if not provided in update
        const customerId = jobData.customerId ? Number(jobData.customerId) : existingJob?.customerId;

        if (!customerId) {
            return NextResponse.json(
                { success: false, error: 'Customer ID is required' },
                { status: 400 }
            );
        }

        // Check if this is a status-only update (no items being updated)
        const isStatusOnlyUpdate = !newItems || (Array.isArray(newItems) && newItems.length === 0);

        // Calculate totals from items
        let subtotal = existingJob?.subtotal || 0;
        let totalVat = existingJob?.totalVat || 0;
        let discountPercent = jobData.discountPercent ?? existingJob?.discountPercent ?? 0;
        let discountAmount = existingJob?.discountAmount || 0;
        let totalAmount = existingJob?.totalAmount || 0;

        const calculatedItems = (newItems || []).map((item: JobItem, index: number) => {
            const calculated = calculateLineItem({ ...item, serialNumber: index + 1 });
            subtotal += calculated.subtotal;
            totalVat += calculated.vatAmount;
            return {
                ...calculated,
                measurementsJson: item.measurementsJson || null,
                measurements: item.measurements || [],
            };
        });

        // Only recalculate totals when items are being updated
        if (!isStatusOnlyUpdate) {
            discountAmount = subtotal * (discountPercent / 100);
            const afterDiscount = subtotal - discountAmount;
            totalAmount = afterDiscount + totalVat;
        }

        const job = await prisma.$transaction(async (tx) => {
            // Check if this is a status-only update (no items being updated)
            const isStatusOnlyUpdate = !newItems || (Array.isArray(newItems) && newItems.length === 0);

            // Only delete and recreate items if items are being updated
            if (!isStatusOnlyUpdate) {
                // Delete existing items (cascade will delete measurements)
                await tx.jobItem.deleteMany({
                    where: { jobId: Number(id) },
                });
            }

            // Update job and create new items
            const updateData: Record<string, unknown> = {
                subtotal,
                totalVat,
                totalAmount,
                discountPercent,
                discountAmount,
                amountInWords: numberToWords(totalAmount),
            };

            // Only update fields that are provided and defined
            if (jobData.refNumber !== undefined) updateData.refNumber = jobData.refNumber;
            if (jobData.subject !== undefined) updateData.subject = jobData.subject;
            if (jobData.jobDetail !== undefined) updateData.jobDetail = jobData.jobDetail;
            if (jobData.date !== undefined) updateData.date = new Date(jobData.date);
            if (jobData.status !== undefined) updateData.status = jobData.status;
            if (jobData.workLocation !== undefined) updateData.workLocation = jobData.workLocation;
            if (jobData.notes !== undefined) updateData.notes = jobData.notes;
            if (jobData.termsConditions !== undefined) updateData.termsConditions = jobData.termsConditions;
            if (jobData.quotationDate !== undefined) updateData.quotationDate = jobData.quotationDate ? new Date(jobData.quotationDate) : null;
            if (jobData.challanDate !== undefined) updateData.challanDate = jobData.challanDate ? new Date(jobData.challanDate) : null;
            if (jobData.billDate !== undefined) updateData.billDate = jobData.billDate ? new Date(jobData.billDate) : null;
            if (jobData.billNumber !== undefined) updateData.billNumber = jobData.billNumber || null;
            if (jobData.bblBillNumber !== undefined) updateData.bblBillNumber = jobData.bblBillNumber || null;
            if (jobData.challanNumber !== undefined) updateData.challanNumber = jobData.challanNumber || null;

            updateData.customerId = customerId;

            // Add items only if items are being updated
            if (!isStatusOnlyUpdate && calculatedItems.length > 0) {
                updateData.items = {
                    create: calculatedItems.map((item: JobItem) => ({
                        serialNumber: item.serialNumber,
                        workDescription: item.workDescription,
                        details: item.details || null,
                        quantity: item.quantity,
                        unit: item.unit,
                        inventoryId: item.inventoryId || null,
                        sku: item.sku || null,
                        skuName: item.skuName || null,
                        unitPrice: item.unitPrice,
                        buyPrice: item.buyPrice,
                        discountPercent: item.discountPercent,
                        discountAmount: item.discountAmount,
                        subtotal: item.subtotal,
                        vatRate: item.vatRate,
                        vatAmount: item.vatAmount,
                        total: item.total,
                        widthFeet: item.widthFeet || 0,
                        widthInches: item.widthInches || 0,
                        heightFeet: item.heightFeet || 0,
                        heightInches: item.heightInches || 0,
                        calculatedSqft: item.calculatedSqft || 0,
                        autoCalculateSqft: item.autoCalculateSqft || false,
                        measurementsJson: item.measurementsJson || null,
                        measurements: {
                            create: (item.measurements || []).map((m: Measurement, idx: number) => ({
                                widthFeet: m.widthFeet || 0,
                                widthInches: m.widthInches || 0,
                                heightFeet: m.heightFeet || 0,
                                heightInches: m.heightInches || 0,
                                quantity: m.quantity || 1,
                                calculatedSqft: m.calculatedSqft || 0,
                                description: m.description || null,
                                sortOrder: idx,
                            }))
                        }
                    })),
                };
            }

            const updatedJob = await tx.job.update({
                where: { id: Number(id), userId },
                data: updateData,
                include: {
                    customer: true,
                    topsheet: true,
                    items: {
                        include: {
                            measurements: {
                                orderBy: { sortOrder: 'asc' }
                            }
                        }
                    },
                    expenses: {
                        where: { isActive: true },
                        orderBy: { createdAt: 'asc' }
                    },
                },
            });

            // Calculate total expenses - expenses are already filtered by isActive in the query
            const totalExpenses = updatedJob.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            // Recalculate totalAmount from line items to ensure accuracy
            let calculatedTotalAmount = 0;
            if (updatedJob.items && updatedJob.items.length > 0) {
                calculatedTotalAmount = updatedJob.items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);
            }
            
            // Use calculated total if items exist, otherwise fall back to stored value
            const finalTotalAmount = calculatedTotalAmount > 0 ? calculatedTotalAmount : (updatedJob.totalAmount || 0);
            const expectedProfit = finalTotalAmount - totalExpenses;

            return {
                ...updatedJob,
                totalExpenses,
                expectedProfit,
                totalAmount: finalTotalAmount,
            };
        });

        return NextResponse.json(
            { success: true, data: job, message: 'Job updated successfully' }
        );
    } catch (error) {
        console.error('Error updating job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update job' },
            { status: 500 }
        );
    }
}

// DELETE job
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
            return NextResponse.json(
                { success: false, error: 'Job ID is required' },
                { status: 400 }
            );
        }

        // Delete job (items will be cascade deleted)
        await prisma.job.delete({
            where: { id: Number(id), userId },
        });

        return NextResponse.json(
            { success: true, message: 'Job deleted successfully' }
        );
    } catch (error) {
        console.error('Error deleting job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete job' },
            { status: 500 }
        );
    }
}

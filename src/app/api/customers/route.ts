import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ApiResponse, Customer } from '@/lib/types';

// GET all customers
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
                    { location: { contains: search } },
                    { addressLine1: { contains: search } },
                    { addressLine2: { contains: search } },
                ],
            }
            : {};

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { jobs: true },
                    },
                },
            }),
            prisma.customer.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: customers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}

// POST create new customer
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const customer = await prisma.customer.create({
            data: {
                name: body.name,
                contactPerson: body.contactPerson,
                email: body.email,
                phone: body.phone,
                address: body.address,
                addressLine1: body.addressLine1,
                addressLine2: body.addressLine2,
                location: body.location,
                vatNumber: body.vatNumber,
                notes: body.notes,
            },
        });

        return NextResponse.json(
            { success: true, data: customer, message: 'Customer created successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}

// PUT update customer
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        const customer = await prisma.customer.update({
            where: { id: Number(id) },
            data,
        });

        return NextResponse.json(
            { success: true, data: customer, message: 'Customer updated successfully' }
        );
    } catch (error) {
        console.error('Error updating customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update customer' },
            { status: 500 }
        );
    }
}

// DELETE customer
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Customer ID is required' },
                { status: 400 }
            );
        }

        // Hard delete - actually remove from database
        await prisma.customer.delete({
            where: { id: Number(id) },
        });

        return NextResponse.json(
            { success: true, message: 'Customer deleted successfully' }
        );
    } catch (error) {
        console.error('Error deleting customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete customer' },
            { status: 500 }
        );
    }
}

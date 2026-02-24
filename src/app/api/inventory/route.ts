import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseCSVToInventory, inventoryToCSV } from '@/lib/utils';

// GET all inventory items
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};

        if (search) {
            where.OR = [
                { sku: { contains: search } },
                { name: { contains: search } },
                { details: { contains: search } },
            ];
        }

        if (type) {
            where.itemType = type;
        }

        const [items, total] = await Promise.all([
            prisma.inventory.findMany({
                where,
                skip,
                take: limit,
                orderBy: { sku: 'asc' },
            }),
            prisma.inventory.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch inventory' },
            { status: 500 }
        );
    }
}

// POST create new inventory item or bulk import
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type');

        // Check if it's a CSV import
        if (contentType?.includes('text/csv') || contentType?.includes('text/plain')) {
            const csvText = await request.text();
            const items = parseCSVToInventory(csvText);

            if (items.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No valid items found in CSV' },
                    { status: 400 }
                );
            }

            // Bulk create inventory items
            const created = await prisma.inventory.createMany({
                data: items.map(item => ({
                    sku: item.sku,
                    name: item.name,
                    details: item.details,
                    unit: item.unit,
                    itemType: item.itemType,
                    vatRate: item.vatRate,
                    buyPrice: item.buyPrice,
                    standardPrice: item.standardPrice,
                    discountedPrice: item.discountedPrice || 0,
                    stockQuantity: item.stockQuantity || 0,
                    category: item.category,
                    brand: item.brand,
                })),
                skipDuplicates: true,
            });

            return NextResponse.json(
                {
                    success: true,
                    data: { count: created.count },
                    message: `${created.count} items imported successfully`
                },
                { status: 201 }
            );
        }

        // Regular JSON create
        const body = await request.json();

        const item = await prisma.inventory.create({
            data: {
                sku: body.sku,
                name: body.name,
                details: body.details,
                unit: body.unit,
                itemType: body.itemType,
                vatRate: body.vatRate || 0,
                buyPrice: body.buyPrice || 0,
                standardPrice: body.standardPrice || 0,
                discountedPrice: body.discountedPrice,
                stockQuantity: body.stockQuantity || 0,
                minStock: body.minStock || 0,
                category: body.category,
                brand: body.brand,
                remarks: body.remarks,
            },
        });

        return NextResponse.json(
            { success: true, data: item, message: 'Item created successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating inventory item:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create inventory item' },
            { status: 500 }
        );
    }
}

// PUT update inventory item
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        const item = await prisma.inventory.update({
            where: { id: Number(id) },
            data,
        });

        return NextResponse.json(
            { success: true, data: item, message: 'Item updated successfully' }
        );
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update inventory item' },
            { status: 500 }
        );
    }
}

// DELETE inventory item
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Item ID is required' },
                { status: 400 }
            );
        }

        // Hard delete - actually remove from database
        await prisma.inventory.delete({
            where: { id: Number(id) },
        });

        return NextResponse.json(
            { success: true, message: 'Item deleted successfully' }
        );
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete inventory item' },
            { status: 500 }
        );
    }
}

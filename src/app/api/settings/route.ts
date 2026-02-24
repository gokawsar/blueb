import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch all settings or single setting
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const key = searchParams.get('key');

        if (key) {
            // Get single setting
            const setting = await prisma.settings.findUnique({
                where: { key },
            });

            if (!setting) {
                return NextResponse.json({ 
                    success: true, 
                    data: null,
                    message: 'Setting not found' 
                });
            }

            return NextResponse.json({
                success: true,
                data: JSON.parse(setting.value),
            });
        }

        // Get all settings
        const settings = await prisma.settings.findMany();

        const settingsObject: Record<string, unknown> = {};
        settings.forEach(s => {
            settingsObject[s.key] = JSON.parse(s.value);
        });

        return NextResponse.json({
            success: true,
            data: settingsObject,
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

// POST - Create or update a setting
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key, value, description } = body;

        if (!key || value === undefined) {
            return NextResponse.json(
                { success: false, error: 'Key and value are required' },
                { status: 400 }
            );
        }

        // Upsert - create if not exists, update if exists
        const setting = await prisma.settings.upsert({
            where: { key },
            update: {
                value: JSON.stringify(value),
                description,
                updatedAt: new Date(),
            },
            create: {
                key,
                value: JSON.stringify(value),
                description,
            },
        });

        return NextResponse.json({
            success: true,
            data: JSON.parse(setting.value),
            message: 'Setting saved successfully'
        });
    } catch (error) {
        console.error('Error saving setting:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save setting' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a setting
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json(
                { success: false, error: 'Key is required' },
                { status: 400 }
            );
        }

        await prisma.settings.delete({
            where: { key },
        });

        return NextResponse.json({
            success: true,
            message: 'Setting deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting setting:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete setting' },
            { status: 500 }
        );
    }
}

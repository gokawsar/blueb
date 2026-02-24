import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Increase payload size limit for file uploads
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!type || !['pad', 'signature'].includes(type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Must be "pad" or "signature"' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file format. Allowed: PNG, JPG, JPEG, GIF, WEBP' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: 'File too large. Maximum size is 10MB' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadsDir, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'png';
        const filename = `${type}_${timestamp}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Return the public URL
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}

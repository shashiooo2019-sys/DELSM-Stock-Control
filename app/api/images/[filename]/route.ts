import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const resolvedParams = await params;
    const rawFilename = resolvedParams.filename || '';
    const sanitizedFilename = path.basename(rawFilename);

    if (!sanitizedFilename) {
      return new NextResponse('Filename required', { status: 400 });
    }

    let filePath = path.join(process.cwd(), 'public', 'uploads', sanitizedFilename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', 'inventory', sanitizedFilename);
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    let contentType = 'image/jpeg';
    if (sanitizedFilename.endsWith('.png')) contentType = 'image/png';
    else if (sanitizedFilename.endsWith('.webp')) contentType = 'image/webp';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error serving image file:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

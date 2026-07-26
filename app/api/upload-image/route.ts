import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let articleNumber = '';
    let imageBuffer: Buffer | null = null;
    let extension = 'webp';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      articleNumber = (formData.get('article_number') as string) || '';
      
      if (!file || !articleNumber) {
        return NextResponse.json({ error: 'Missing file or article_number' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      if (file.type.includes('png')) extension = 'png';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) extension = 'jpg';
      else if (file.type.includes('webp')) extension = 'webp';
    } else {
      const body = await req.json();
      articleNumber = body.article_number;
      const base64Data = body.image_base64 || body.image_data;

      if (!articleNumber || !base64Data) {
        return NextResponse.json({ error: 'Missing article_number or image_base64' }, { status: 400 });
      }

      const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const mime = matches[1].toLowerCase();
        extension = mime === 'jpeg' ? 'jpg' : mime;
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(base64Data, 'base64');
      }
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const sanitizedArticle = articleNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedArticle}.${extension}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    // Provide both /api/images URL and /uploads URL
    const imageUrl = `/api/images/${fileName}?t=${Date.now()}`;

    return NextResponse.json({ 
      success: true, 
      image_url: imageUrl,
      fileName
    });

  } catch (err: any) {
    console.error('Error saving image to app files:', err);
    return NextResponse.json({ error: err.message || 'Failed to save image' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const articleNumber = searchParams.get('article_number');

    if (!articleNumber) {
      return NextResponse.json({ error: 'Missing article_number' }, { status: 400 });
    }

    const sanitizedArticle = articleNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (fs.existsSync(uploadsDir)) {
      ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => {
        const filePath = path.join(uploadsDir, `${sanitizedArticle}.${ext}`);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn('Could not delete file:', filePath, e);
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting image from app files:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete image' }, { status: 500 });
  }
}

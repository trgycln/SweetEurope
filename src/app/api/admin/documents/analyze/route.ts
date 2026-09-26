import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/ai/document-analyzer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Sadece PDF formatı desteklenmektedir.' }, { status: 400 });
    }

    // Convert the uploaded File to a Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call the AI Document Analyzer
    const aiAnalysis = await analyzeDocument(buffer, file.name);

    return NextResponse.json(aiAnalysis, { status: 200 });

  } catch (error: any) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: error.message || 'Analiz sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}

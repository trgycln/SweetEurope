import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfToDrive } from '@/lib/google-drive/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const aiDataString = formData.get('aiData') as string;

    if (!file || !aiDataString) {
      return NextResponse.json({ error: 'Dosya veya onaylanmış AI verisi eksik.' }, { status: 400 });
    }

    let aiData;
    try {
      aiData = JSON.parse(aiDataString);
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz AI verisi formatı.' }, { status: 400 });
    }

    // Convert file to Buffer
    // Not: Dosya memory'de Buffer olarak işlendiği için sunucuda fiziki bir temp dosya oluşmaz. 
    // Bu yüzden fs.unlinkSync ile silinecek bir temp dosyası bulunmamaktadır.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: userSession, error: userError } = await supabase.auth.getUser();
    if (userError || !userSession.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    // 1. Get next sequence number BEFORE uploading to Drive
    const { data: nextNo, error: seqError } = await supabase.rpc('get_next_dosya_no');
    
    if (seqError || nextNo === null) {
      console.error('Sequence Error:', seqError);
      return NextResponse.json({ error: 'Dosya numarası (sequence) alınamadı. Lütfen veritabanı RPC fonksiyonunun tanımlı olduğundan emin olun.' }, { status: 500 });
    }

    // 2. Generate final file name with sequence number
    let safeOnerilenAd = aiData.onerilen_dosya_adi || file.name;
    if (safeOnerilenAd.toLowerCase().endsWith('.pdf')) {
      safeOnerilenAd = safeOnerilenAd.slice(0, -4);
    }
    const finalFileName = `${nextNo}_${safeOnerilenAd}.pdf`;

    // 3. Upload to Google Drive with finalFileName
    const driveUpload = await uploadPdfToDrive(buffer, finalFileName, file.type);

    // 4. Save to Supabase
    const { data: insertedDoc, error: dbError } = await supabase
      .from('belgeler')
      .insert({
        dosya_no: nextNo,
        ad: finalFileName,
        kategori: aiData.kategori || 'gelen_evrak_dosyasi',
        evrak_turu: aiData.evrak_turu,
        ai_ozet: aiData.ozet,
        ai_etiketler: aiData.etiketler,
        kritik_bilgiler: aiData.kritik_bilgiler,
        evrak_tarihi: aiData.tarih || null,
        drive_file_id: driveUpload.driveFileId,
        drive_url: driveUpload.webViewLink,
        olusturma_tarihi: new Date().toISOString(),
        yukleyen_id: userSession.user.id
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Supabase Error:', dbError);
      return NextResponse.json({ error: 'Veritabanına kaydedilirken hata oluştu.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, documentId: insertedDoc.id }, { status: 200 });

  } catch (error: any) {
    console.error('Confirm API error:', error);
    return NextResponse.json(
      { error: error.message || 'Kayıt sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfToDrive, getDriveFolderIdForKategori, getDriveService } from '@/lib/google-drive/service';
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

    let aiData: {
      onerilen_dosya_adi: string;
      ozet: string;
      evrak_turu: string;
      kategori: string;
      etiketler: string[];
      kritik_bilgiler: string;
      tarih: string;
    };
    try {
      aiData = JSON.parse(aiDataString);
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz AI verisi formatı.' }, { status: 400 });
    }

    // Convert file to Buffer (memory-based, no temp file on disk)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: userSession, error: userError } = await supabase.auth.getUser();
    if (userError || !userSession.user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const kategori = aiData.kategori || 'gelen_evrak_dosyasi';

    // 1. Resolve the correct Drive subfolder for this kategori
    const kategoriFolderId = await getDriveFolderIdForKategori(supabase, kategori);

    // 2. Calculate next sequence number for this specific folder/category
    let maxSira = 0;

    // Check existing documents in this category in Supabase
    try {
      const { data: catDocs } = await supabase
        .from('belgeler')
        .select('sira_no, dosya_no, ad')
        .eq('kategori', kategori);

      if (catDocs && catDocs.length > 0) {
        for (const doc of catDocs) {
          if (doc.sira_no) {
            const p = parseInt(doc.sira_no, 10);
            if (!isNaN(p) && p > maxSira) maxSira = p;
          }
          if (doc.ad) {
            const m = doc.ad.match(/^(\d{1,3})[_\s.]/);
            if (m) {
              const p = parseInt(m[1], 10);
              if (!isNaN(p) && p < 1000 && p > maxSira) maxSira = p;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not query catDocs from Supabase:', e);
    }

    // Also check Drive folder for any existing files with numbers (e.g. 01_, 02_, 03_)
    try {
      const driveService = getDriveService();
      if (kategoriFolderId) {
        const driveFiles = await driveService.files.list({
          q: `'${kategoriFolderId}' in parents and trashed = false`,
          fields: 'files(name)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        if (driveFiles.data.files) {
          for (const df of driveFiles.data.files) {
            const m = df.name?.match(/^(\d{1,3})[_\s.]/);
            if (m) {
              const p = parseInt(m[1], 10);
              if (!isNaN(p) && p < 1000 && p > maxSira) maxSira = p;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not query Drive files for sequence:', e);
    }

    const nextSiraNo = maxSira + 1;
    const formattedPrefix = String(nextSiraNo).padStart(2, '0');

    // 3. Generate final file name: <01, 02...>_<onaylanan_ad>.pdf
    let safeOnerilenAd = aiData.onerilen_dosya_adi || file.name;
    // Strip leading number if user or AI already prepended it
    safeOnerilenAd = safeOnerilenAd.replace(/^\d+[\s._-]+/, '');
    if (safeOnerilenAd.toLowerCase().endsWith('.pdf')) {
      safeOnerilenAd = safeOnerilenAd.slice(0, -4);
    }
    const finalFileName = `${formattedPrefix}_${safeOnerilenAd}.pdf`;

    // 4. Upload to Google Drive (category-specific folder or root folder)
    let driveUpload: { driveFileId: string; webViewLink: string };
    try {
      driveUpload = await uploadPdfToDrive(buffer, finalFileName, kategoriFolderId, file.type);
    } catch (driveErr: any) {
      console.error('Drive upload failed:', driveErr);
      return NextResponse.json(
        { error: 'Drive yüklemesi başarısız oldu, işlem iptal edildi. Detay: ' + (driveErr.message || '') },
        { status: 500 }
      );
    }

    // 5. Save metadata to Supabase belgeler table (only metadata — no file content)
    const { data: insertedDoc, error: dbError } = await supabase
      .from('belgeler')
      .insert({
        sira_no: String(nextSiraNo),
        dosya_no: nextSiraNo,
        ad: finalFileName,
        kategori,
        evrak_turu: aiData.evrak_turu,
        ai_ozet: aiData.ozet,
        ai_etiketler: aiData.etiketler,
        kritik_bilgiler: aiData.kritik_bilgiler,
        evrak_tarihi: aiData.tarih || null,
        drive_file_id: driveUpload.driveFileId,
        drive_url: driveUpload.webViewLink,
        olusturma_tarihi: new Date().toISOString(),
        yukleyen_id: userSession.user.id,
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

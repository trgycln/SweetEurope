import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { publishGooglePost, getGoogleBusinessAccount, getGoogleOAuthClient } from '@/lib/google-business/client';
import { cookies } from 'next/headers';

// Kayıtlı gönderileri listeleme (GET)
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data: posts, error } = await supabase
      .from('google_business_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Gönderi yayınlama veya simüle etme (POST)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Yetkilendirme uyarısı
    if (authError || !user) {
      console.warn('Publish Auth Warning:', authError);
    }

    const { content, topic } = await req.json();

    // Sınır doğrulaması (Boundary Validation)
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Geçerli bir içerik (content) zorunludur' }, { status: 400 });
    }
    
    if (content.length > 1500) {
      return NextResponse.json({ error: 'İçerik Google limitlerini aşıyor (Maks 1500 karakter)' }, { status: 400 });
    }

    const dbClient = createSupabaseServiceClient();

    // Supabase'de gönderiyi ilk olarak kaydetme
    const isSimulationMode = process.env.GOOGLE_BUSINESS_SIMULATION === 'true';

    const { data: postLog, error: dbError } = await dbClient
      .from('google_business_posts')
      .insert({
        title: topic || 'Genel Gönderi',
        content: content,
        post_type: 'STANDARD',
        status: isSimulationMode ? 'SIMULATED' : 'DRAFT',
      })
      .select()
      .single();

    if (dbError) {
      console.warn('Veritabanına ilk kayıt uyarısı:', dbError);
    }

    // EĞER SİMÜLASYON MODU AKTİFSE (Google onay süreci devam ederken)
    if (isSimulationMode) {
      if (postLog) {
        await dbClient
          .from('google_business_posts')
          .update({ 
            google_post_id: 'SIMULATED_TEST_MODE',
            published_at: new Date().toISOString()
          })
          .eq('id', postLog.id);
      }

      return NextResponse.json({ 
        success: true, 
        simulated: true,
        message: 'Google API erişim başvurunuz (Talep No: 0-4918000041665) incelenirken gönderiniz test modunda güvenle kaydedildi.'
      });
    }

    // GOOGLE CANLI API YAYINLAMA SÜRECİ
    try {
      const oauthClient = getGoogleOAuthClient();
      
      if (!process.env.GOOGLE_BUSINESS_REFRESH_TOKEN) {
        throw new Error('GOOGLE_BUSINESS_REFRESH_TOKEN bulunamadı.');
      }

      const account = await getGoogleBusinessAccount(oauthClient);
      const accountId = account.name.split('/')[1];
      
      const locationsResponse = await oauthClient.request({
        url: `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
        method: 'GET'
      });
      const locations = (locationsResponse.data as any).locations;
      
      if (!locations || locations.length === 0) {
        throw new Error('Bu hesaba bağlı bir lokasyon (işletme) bulunamadı.');
      }
      
      const locationId = locations[0].name.split('/')[3];

      const postData = {
        languageCode: "de",
        summary: content,
        callToAction: {
          actionType: "LEARN_MORE",
          url: "https://elysonsweets.de"
        }
      };

      const result = await publishGooglePost(accountId, locationId, postData);

      if (postLog) {
        await dbClient
          .from('google_business_posts')
          .update({ 
            status: 'PUBLISHED',
            google_post_id: result.name,
            published_at: new Date().toISOString()
          })
          .eq('id', postLog.id);
      }

      return NextResponse.json({ success: true, simulated: false, result });

    } catch (apiError: any) {
      console.warn('Google Canlı API İstisna:', apiError.message);

      // Eğer henüz kota onaylanmamışsa (Quota 0 / Access required), otomatik olarak taslak/simülasyona çevir
      const isQuotaOrPermission = 
        apiError.message?.includes('Quota exceeded') ||
        apiError.message?.includes('PERMISSION_DENIED') ||
        apiError.status === 403;

      if (isQuotaOrPermission && postLog) {
        await dbClient
          .from('google_business_posts')
          .update({ 
            status: 'PENDING_APPROVAL',
            google_post_id: 'PENDING_GOOGLE_QUOTA'
          })
          .eq('id', postLog.id);

        return NextResponse.json({
          success: true,
          simulated: true,
          quotaPending: true,
          message: 'Google API kota onayı bekleniyor (Talep No: 0-4918000041665). Gönderi taslak olarak kaydedildi.'
        });
      }

      if (postLog) {
        await dbClient
          .from('google_business_posts')
          .update({ status: 'FAILED' })
          .eq('id', postLog.id);
      }
      throw apiError;
    }

  } catch (error: any) {
    console.error('Google Publish Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Yayınlama sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// Gönderi silme (DELETE)
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parametresi zorunludur' }, { status: 400 });
    }

    const dbClient = createSupabaseServiceClient();
    const { error } = await dbClient
      .from('google_business_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



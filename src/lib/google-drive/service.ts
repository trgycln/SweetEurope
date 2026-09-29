import { google } from 'googleapis';
import stream from 'stream';

// Initialize the Google Drive API client using OAuth Refresh Token or Service Account credentials
export function getDriveService() {
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_BUSINESS_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  // 1. Prioritize OAuth2 user credentials (uses user's full personal/business storage quota)
  if (refreshToken && clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // 2. Fallback to Service Account credentials
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Google Drive kimlik bilgileri eksik. ' +
      'Lütfen Google Drive bağlantısını gerçekleştirin veya kimlik bilgilerini .env.local dosyasına ekleyin.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

export interface DriveUploadResponse {
  driveFileId: string;
  webViewLink: string;
}

/**
 * Uploads a PDF buffer to a specific Google Drive folder.
 *
 * @param buffer      The file content as a Node.js Buffer.
 * @param fileName    The intended name of the file in Google Drive.
 * @param folderId    Target Drive folder ID. Falls back to GOOGLE_DRIVE_FOLDER_ID env var.
 * @param mimeType    MIME type of the file (default: 'application/pdf').
 * @returns           { driveFileId, webViewLink }
 */
export async function uploadPdfToDrive(
  buffer: Buffer,
  fileName: string,
  folderId?: string | null,
  mimeType: string = 'application/pdf'
): Promise<DriveUploadResponse> {
  const driveService = getDriveService();

  // Use the provided folderId, fall back to the root folder from env
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!targetFolderId) {
    throw new Error(
      'Google Drive klasör ID eksik. ' +
      'GOOGLE_DRIVE_FOLDER_ID değişkenini .env.local dosyasına ekleyin ' +
      'veya belge_klasorleri tablosuna drive_folder_id girin.'
    );
  }

  // Convert Buffer to a Readable Stream for the Google Drive API
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const response = await driveService.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  if (!response.data.id || !response.data.webViewLink) {
    throw new Error('Drive yüklemesi başarısız: Google Drive API geçersiz yanıt döndürdü.');
  }

  return {
    driveFileId: response.data.id,
    webViewLink: response.data.webViewLink,
  };
}

// User-defined default folder mapping for Elyson Sweets
const DEFAULT_FOLDER_MAP: Record<string, string> = {
  gelen_evrak_dosyasi: '1Q6K_rblwAU7kSd-UbhTuVz-v-ROBaLmp',
  giden_evrak_dosyasi: '1WL9cDRh8wL1xlq09I1sVmv7-EaZvnJ36',
  kurulus_evraklari: '1k2qipxacb-kf9AEITtnxh_8GLjx53Igk',
  sozlesmeler_dosyasi: '1QYS619P0egBvLaKr5WBdBYFMEYMFxjqT',
  gelen_faturalar: '1CUqiXjtEMvGZ_YCsGSi1wGJWnSNxwac2',
  giden_faturalar: '15GAxKSqPangYhk9-mNb-iNpJrQEP-zB-',
  arac_dosyasi: '19DmG1f8gd6IvQ41OoxxorXpKGt_wtYTx',
  personel_ozluk_dosyalari: '19s8xFabotxNdnevSSsClzQCddeteuJA6',
  diger: '1c8yDhx_F-4y2LAR-VJAXg7MSaTlSPqwd',
};

/**
 * Looks up the Drive folder ID for a given belge kategori from the belge_klasorleri table.
 * Falls back to DEFAULT_FOLDER_MAP, then GOOGLE_DRIVE_FOLDER_ID if not found.
 *
 * @param supabase  Initialized Supabase client
 * @param kategori  The kategori value from aiData (e.g. 'gelen_evrak_dosyasi')
 * @returns         Drive folder ID string or null (caller should fall back to env)
 */
export async function getDriveFolderIdForKategori(
  supabase: any,
  kategori: string
): Promise<string | null> {
  if (!kategori) return null;

  // 1. Try exact match on id in database
  try {
    const { data: exactMatch } = await supabase
      .from('belge_klasorleri')
      .select('drive_folder_id')
      .eq('id', kategori)
      .single();

    if (exactMatch?.drive_folder_id) {
      return exactMatch.drive_folder_id;
    }

    // 2. Try match on label
    const { data: labelMatch } = await supabase
      .from('belge_klasorleri')
      .select('drive_folder_id')
      .ilike('label', `%${kategori}%`)
      .limit(1)
      .maybeSingle();

    if (labelMatch?.drive_folder_id) {
      return labelMatch.drive_folder_id;
    }
  } catch {
    // Database query failed or table doesn't have drive_folder_id, continue to fallback
  }

  // 3. Fallback to predefined folder mapping
  if (DEFAULT_FOLDER_MAP[kategori]) {
    return DEFAULT_FOLDER_MAP[kategori];
  }

  return null;
}

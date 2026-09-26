import { google } from 'googleapis';
import stream from 'stream';

// Initialize the Google Drive API client using Service Account credentials
function getDriveService() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  // Replace actual literal \n with newline characters for the private key
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials are not properly configured in environment variables.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

export interface DriveUploadResponse {
  driveFileId: string;
  webViewLink: string;
}

/**
 * Uploads a PDF buffer to Google Drive.
 * 
 * @param buffer The file content as a Buffer.
 * @param fileName The intended name of the file in Google Drive.
 * @param mimeType The mime type of the file, defaults to 'application/pdf'.
 * @returns An object containing the driveFileId and webViewLink.
 */
export async function uploadPdfToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string = 'application/pdf'
): Promise<DriveUploadResponse> {
  try {
    const driveService = getDriveService();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error('Google Drive folder ID is not configured.');
    }

    // Convert Buffer to a Readable Stream for the Google Drive API
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: bufferStream,
    };

    const response = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    if (!response.data.id || !response.data.webViewLink) {
      throw new Error('Upload failed: Invalid response from Google Drive API');
    }

    return {
      driveFileId: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}

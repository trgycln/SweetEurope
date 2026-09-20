import { google } from 'googleapis';

/**
 * Singleton Google OAuth2 Client
 */
export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_BUSINESS_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google Business Profile API credentials are not configured in environment variables.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // If you already have a refresh token saved in environment or database, set it here.
  // In production, this should ideally be fetched from the database for the active user/admin.
  const refreshToken = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  return oauth2Client;
}

/**
 * Gets the valid Business Profile Account ID for the user
 */
export async function getGoogleBusinessAccount(oauth2Client: any) {
  const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
    version: 'v1',
    auth: oauth2Client,
  });

  const response = await mybusinessaccountmanagement.accounts.list();
  const accounts = response.data.accounts;
  
  if (!accounts || accounts.length === 0) {
    throw new Error('No Google Business Accounts found for this user.');
  }

  // Typically return the first location-managing account
  return accounts[0];
}

/**
 * Publishes a Local Post to Google Business Profile
 */
export async function publishGooglePost(accountId: string, locationId: string, postData: any) {
  const oauth2Client = getGoogleOAuthClient();
  
  // Note: Local Posts API is currently under the older v4 API or the newer mybusinessbusinessinformation API depending on exact methods.
  // However, the standard REST endpoint is:
  // POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
  
  const url = `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/localPosts`;

  const response = await oauth2Client.request({
    url,
    method: 'POST',
    data: postData,
  });

  return response.data;
}

import { google } from 'googleapis';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export interface GbpSettings {
  account_id: string | null;
  location_id: string | null;
  refresh_token: string | null;
  business_name: string | null;
  business_category: string | null;
  target_keywords: string | null;
  target_locations: string | null;
  default_post_image_url?: string | null;
}

/**
 * Fetches GBP settings from environment variables and falls back to Supabase `gbp_settings` table.
 */
export async function getGbpSettings(): Promise<GbpSettings> {
  const envSettings = {
    account_id: process.env.GOOGLE_BUSINESS_ACCOUNT_ID || null,
    location_id: process.env.GOOGLE_BUSINESS_LOCATION_ID || null,
    refresh_token: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN || null,
    business_name: process.env.GBP_BUSINESS_NAME || null,
    business_category: process.env.GBP_BUSINESS_CATEGORY || null,
    target_keywords: process.env.GBP_TARGET_KEYWORDS || null,
    target_locations: process.env.GBP_TARGET_LOCATIONS || null,
    default_post_image_url: process.env.GBP_DEFAULT_IMAGE_URL || null,
  };

  const supabase = createSupabaseServiceClient();
  const { data: dbSettings, error } = await supabase
    .from('gbp_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Could not fetch GBP settings from database:', error.message);
  }

  return {
    account_id: envSettings.account_id || dbSettings?.account_id || null,
    location_id: envSettings.location_id || dbSettings?.location_id || null,
    refresh_token: envSettings.refresh_token || dbSettings?.refresh_token || null,
    business_name: envSettings.business_name || dbSettings?.business_name || null,
    business_category: envSettings.business_category || dbSettings?.business_category || null,
    target_keywords: envSettings.target_keywords || dbSettings?.target_keywords || null,
    target_locations: envSettings.target_locations || dbSettings?.target_locations || null,
    default_post_image_url: envSettings.default_post_image_url || dbSettings?.default_post_image_url || null,
  };
}

/**
 * Retrieves a fresh access token for Google API.
 */
export async function getGbpAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google Business Client ID or Secret in environment variables.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to retrieve access token from Google.');
    }
    return token;
  } catch (error) {
    console.error('Error refreshing Google access token:', error);
    throw error;
  }
}

/**
 * A wrapper to execute a fetch request to Google Business Profile API.
 */
export async function fetchGbpApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const settings = await getGbpSettings();
  
  if (!settings.refresh_token) {
    throw new Error('No refresh token found for Google Business Profile.');
  }

  const accessToken = await getGbpAccessToken(settings.refresh_token);

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://mybusiness.googleapis.com${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API Error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

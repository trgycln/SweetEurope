import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-business/client';

export async function GET() {
  const oauth2Client = getGoogleOAuthClient();

  const scopes = [
    'https://www.googleapis.com/auth/business.manage',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  return NextResponse.redirect(url);
}

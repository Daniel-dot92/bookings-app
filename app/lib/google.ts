// app/lib/google.ts
import { google } from 'googleapis';

export function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  // ако вече имаме refresh token в .env.local, го задаваме
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  return client;
}

export function getCalendar() {
  const auth = getOAuth2Client();
  return google.calendar({ version: 'v3', auth });
}

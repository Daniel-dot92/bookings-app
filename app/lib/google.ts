// app/lib/google.ts
import { google } from "googleapis";

/**
 * OAuth2 (fallback, ако някога решиш да ползваш refresh_token)
 */
function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }
  return client;
}

/**
 * Service Account auth – декодира base64 JSON и връща auth, готов за Calendar API
 */
function getServiceAccountAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!b64) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");
  }
  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(jsonStr);

  // Двата начина са ок; JWT е лек и директен:
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return auth;
}

/**
 * Връща инстанция на Google Calendar API с правилния auth
 */
export function getCalendar() {
  const useSA = String(process.env.USE_SERVICE_ACCOUNT).toLowerCase() === "true";
  const auth = useSA ? getServiceAccountAuth() : getOAuth2Client();
  return google.calendar({ version: "v3", auth });
}

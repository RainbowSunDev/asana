import { NextRequest } from 'next/server';
import axios from 'axios';
import { sql } from '@vercel/postgres';
import { CodeExchangeData } from '@/types';

type ReqData = {
  code: string;
  organisation_id: string;
};


export async function POST(request: NextRequest) {
  const responseData = await request.json();
  const reqData = responseData as ReqData;
  const { code, organisation_id } = reqData;

  try {
    const tokenResponse = await axios.post<CodeExchangeData>('https://app.asana.com/-/oauth_token', {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_ASANA_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_ASANA_CLIENT_SECRET,
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
      code,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, expires_in, data, refresh_token } = tokenResponse.data;
    const { id, gid, name, email } = data;
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const expirationTime = currentTime + expires_in; // Expiration time in seconds
    await sql`
      INSERT INTO asana_credentials (id, gid, name, email, access_token, expires_in, refresh_token, organisation_id)
      VALUES (${id}, ${gid}, ${name}, ${email}, ${access_token}, ${expirationTime}, ${refresh_token}, ${organisation_id}) ON CONFLICT (organisation_id) DO UPDATE
      SET
        id = EXCLUDED.id,
        gid = EXCLUDED.gid,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        access_token = EXCLUDED.access_token,
        expires_in = EXCLUDED.expires_in,
        refresh_token = EXCLUDED.refresh_token;
    `;

    // Insert a sync job for the organization with priority 1
    await sql`
      INSERT INTO users_sync_jobs (organisation_id, priority, sync_started_at)
      VALUES (${organisation_id}, 1, NOW()) ON CONFLICT (organisation_id) DO UPDATE
      SET
        priority = EXCLUDED.priority,
        sync_started_at = EXCLUDED.sync_started_at;
    `;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.log("error", error)
    // Improved error handling
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage = error.response.data?.error_description || 'Unknown error occurred';
      return new Response(JSON.stringify({ name: "error", message: errorMessage }), { status: 500 });
    }
    return new Response(JSON.stringify({ name: "error", message: error.response.data?.error_description }), { status: 500 });
  }
}

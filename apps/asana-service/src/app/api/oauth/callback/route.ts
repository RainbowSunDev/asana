import { NextRequest } from 'next/server';
import axios from 'axios';
import { sql } from '@vercel/postgres';

type ReqData = {
  code: string;
  organization_id: string;
};

type TokenResponseData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  data: { id: string; gid: string; name: string; email: string };
  refresh_token: string;
};

export async function POST(request: NextRequest) {
  const responseData = await request.json();
  const reqData = responseData as ReqData;
  const { code, organization_id } = reqData;

  try {
    const tokenResponse = await axios.post<TokenResponseData>('https://app.asana.com/-/oauth_token', {
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

    await sql`
      INSERT INTO asana_credentials (id, gid, name, email, access_token, expires_in, refresh_token, organization_id)
      VALUES (${id}, ${gid}, ${name}, ${email}, ${access_token}, ${expires_in}, ${refresh_token}, ${organization_id});
    `;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    // Improved error handling
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage = error.response.data?.error_description || 'Unknown error occurred';
      return new Response(JSON.stringify({ name: "error", message: errorMessage }), { status: 500 });
    }
    return new Response(JSON.stringify({ name: "error", message: "Internal Server Error" }), { status: 500 });
  }
}

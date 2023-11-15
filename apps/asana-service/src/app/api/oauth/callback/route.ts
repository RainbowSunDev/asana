import { type NextRequest } from 'next/server'
import axios from 'axios';
import { sql } from "@vercel/postgres";

export async function GET(request: NextRequest) {
  
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const organization_id = searchParams.get("state");
  const error = searchParams.get("error");
  if (error) return Response.json({"error": error})
  try {
    const tokenResponse = await axios.post('https://app.asana.com/-/oauth_token', {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_ASANA_CLIENT_ID, // Store your client ID in .env.local
      client_secret: process.env.NEXT_PUBLIC_ASANA_CLIENT_SECRET, // Store your client secret in .env.local
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
      code,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, token_type, expires_in, data, refresh_token } = tokenResponse.data;
    const { id, gid, name, email } = data;
    
    try {
      const insertResponse = await sql`
          INSERT INTO asana_credentials (id, gid, name, email, access_token, expires_in, refresh_token, organization_id)
          VALUES (${id}, ${gid}, ${name}, ${email}, ${access_token}, ${expires_in}, ${refresh_token}, ${organization_id});
          `;
  
      return Response.json(insertResponse)
  } catch (error) {
    return Response.json(error)
  }
    // Send back the response from Asana
  } catch (error) {
    return Response.json({"error": error.response.data.error_description})
  }
  
}

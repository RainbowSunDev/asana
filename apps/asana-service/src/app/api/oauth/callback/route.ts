import { type NextRequest } from 'next/server'
import axios from 'axios';
import { sql } from "@vercel/postgres";

export async function GET(request: NextRequest) {
  
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const organization_id = searchParams.get("state");
  const error = searchParams.get("error");
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

    console.log("tokenResponse.data", tokenResponse.data);
    try {
      const insertResponse = await sql`
          INSERT INTO asana_credentials (id, gid, name, email, access_token, expires_in, refresh_token, organization_id)
          VALUES (${id}, ${gid}, ${name}, ${email}, ${access_token}, ${expires_in}, ${refresh_token}, ${organization_id})
          RETURNING *; // Adjust columns as per your table's structure
      `;
  
      console.log('Insert response:', insertResponse);
  } catch (error) {
      console.error('Error inserting data:', error);
      // Handle the error appropriately
  }
    // Send back the response from Asana
  } catch (error) {
    console.error("error---------------------", error.response.data.error_description)
    if (axios.isAxiosError(error)) {
      // If the error was from Axios, you can handle it here
      
    } else {
      // Handle any other errors
    }
  }
  
}

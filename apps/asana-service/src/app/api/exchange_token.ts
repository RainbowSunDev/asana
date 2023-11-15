// pages/api/exchange_token.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Pool } from 'pg'; // Make sure to install pg with npm or yarn

// Initialize a new pool instance with your PostgreSQL connection details
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432'),
});

export default async function exchangeToken(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { code, organization_id } = req.body;

    try {
      // Exchange the authorization code for an access token and refresh token
      const tokenResponse = await axios.post('https://app.asana.com/-/oauth_token', {
        grant_type: 'authorization_code',
        client_id: process.env.ASANA_CLIENT_ID,
        client_secret: process.env.ASANA_CLIENT_SECRET,
        redirect_uri: process.env.ASANA_REDIRECT_URI,
        code,
      });

      // Extract tokens
      const { access_token, refresh_token } = tokenResponse.data;

      // Store the tokens in the PostgreSQL database
      await pool.query(
        'INSERT INTO your_table(access_token, refresh_token, organization_id) VALUES ($1, $2, $3)',
        [access_token, refresh_token, organization_id]
      );

      // Send a success response back to the client
      res.status(200).json({ success: true });
    } catch (error) {
      // Handle errors, such as if the token exchange fails
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    // Only POST method is accepted
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

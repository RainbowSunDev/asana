import { NextRequest } from 'next/server';
import { QueryResult, sql } from '@vercel/postgres';
import axios from 'axios';
import { CodeExchangeData } from '@/types';

const Asana = require('asana');
// Define types for the job and user data
type Job = {
  organisation_id: string;
  pagination_token?: string;
  sync_started_at: string;
  priority: number;
};

type User = {
  // Define the user properties as per the source API
  data: [
    {
      gid: string,
      email: string,
      name: string,
      resource_type: string,
      role: string,
      workspaces: [
        {
          gid: string,
          name: string,
          resource_type: string
        }
      ]
    }
  ]
};

type AsanaUsersData = {
  users: User[], 
  next_page: {
    offset: string,
    path: string,
    uri: string
  }
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const maxDuration = 45000; // 45 seconds in milliseconds

  try {
    // Select the next job from the queue
    const {rows:jobRows} = await sql`
    SELECT * FROM users_sync_jobs
    ORDER BY priority ASC, sync_started_at ASC
    LIMIT 1;
    `;
    
    if (jobRows.length === 0) {
      return new Response(JSON.stringify({name: 'error', message: "No job in the queue"}), {status: 500})
    }
    
    const job = jobRows[0];
    let paginationToken = job.pagination_token;
    const organisationId = job.organisation_id;
    let accessToken: string;
    try {
      accessToken = await getAccessToken(organisationId);
    } catch (error) {
      return new Response(JSON.stringify({name: 'error', message: 'No access token is found'}))
    }
    
    do {
      const timeElapsed = Date.now() - startTime;
      if (timeElapsed > maxDuration) {
        console.log("Approaching max duration, exiting...");
        break; // Exit if approaching max duration
      }
      const asanaResponse = await fetchUsersFromAsana(accessToken, organisationId, paginationToken);
      await postUsersToElba(asanaResponse.users, job.organisation_id);
      paginationToken = asanaResponse.next_page?.offset;
      if (paginationToken) {
        await sql`
          UPDATE users_sync_jobs
          SET pagination_token = ${paginationToken}
          WHERE organisation_id = ${job.organisation_id};
        `;
  
      }
    } while ( paginationToken )
    // Format users data and post to Elba
    //  delete the job based on pagination token
    
    await callElbaDeleteEndpoint(job.organisation_id, new Date(job.sync_started_at));
    await sql`
      DELETE FROM users_sync_jobs
      WHERE organisation_id = ${job.organisation_id};
    `;

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ name: 
      'error', message: 'Internal Server Error' }), {status: 500});
  }
}

async function fetchUsersFromAsana(accessToken: string, organisationId, pagination_token?: string): Promise<AsanaUsersData> {

  // Implement the logic to fetch users from Asana using the pagination token
  // Return the users and the new pagination token, if any
  // This is a placeholder implementation
  // Initialize the Asana client with your access token
  // Configure client with personal access token
  let client = Asana.ApiClient.instance;
  let token = client.authentications['token'];
  token.accessToken = accessToken;
  console.log("accessToken", accessToken)
  // Construct resource API Instance
  let usersApiInstance = new Asana.UsersApi();
  let opts = {
    'workspace': "1205925159194295",
    'limit': process.env.NEXT_PUBLIC_USERS_SYNC_JOB_BATCH_SIZE,
    'offset': pagination_token,
    'opt_fields': "email, name,resource_type, offset, path,uri,workspaces,workspaces.name,workspaces.resource_type, role"
  };

  let userData;
  let nextPageData;
  // Get your user info
  usersApiInstance.getUsers(opts).then((result) => {
    if(result.data) {
      userData = result.data;
      nextPageData = result.next_page;
    }
    console.log('Hello world! ', result.data);
    }, (error) => {
        console.error(error.response.body);
        return new Response(JSON.stringify({name: 'error', message: error.response.body.errors[0]?.message}))
    });
    return { users: userData, next_page: nextPageData};
}

async function getAccessToken(organisationId: string): Promise<string> {

  const { rows } = await sql`SELECT access_token, refresh_token, expires_in FROM asana_credentials WHERE organisation_id = ${organisationId};`;

  if (rows.length === 0) {
    throw new Error('No access token is found');
  }

  let { access_token, refresh_token, expires_in } = rows[0];

  // Check if the current access token is expired
  if (tokenIsExpired(expires_in)) {
    // Refresh the token
    try {
      
      const refreshedTokens = await refreshAccessToken(refresh_token);
      access_token = refreshedTokens.access_token;
      expires_in = refreshedTokens.expires_in;
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      const expirationTime = currentTime + expires_in; // Expiration time in seconds
      // Update the database with the new tokens
      await sql`
        UPDATE asana_credentials
        SET access_token = ${access_token}, refresh_token = ${refresh_token}, expires_in = ${expirationTime}
        WHERE organisation_id = ${organisationId};
      `;
    } catch (error) {
      throw new Error('No access token is found');
    }
  }

  return access_token;
}
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string, expires_in: number }> {
  // Make a request to the Asana API to refresh the token
  // Return the new access token, refresh token, and expiry time
  console.log("refreshAccessToken")
  try {
    
    const tokenResponse = await axios.post<CodeExchangeData>('https://app.asana.com/-/oauth_token', {
      grant_type: 'refresh_token',
      client_id: process.env.NEXT_PUBLIC_ASANA_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_ASANA_CLIENT_SECRET,
      refresh_token: refreshToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  
    console.log("tokenResponse:", tokenResponse.data)
    const { access_token, expires_in } = tokenResponse.data;
    
    return {access_token, expires_in};
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('No access token is found'); // Explicitly return undefined
  }
}

function tokenIsExpired(expiresIn: number): boolean {
  
  // Implement logic to determine if the token is expired
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  console.log("tokenIsExpired  --  expiresIn",expiresIn)
  console.log("tokenIsExpired  --  currentTime",currentTime)
  return currentTime >= expiresIn;
}

async function postUsersToElba(users: User[], organisation_id: string): Promise<void> {
  // Format the users list as required by Elba's API
  // Post the formatted list to Elba's update-source-users endpoint
  // This is a placeholder implementation
}

async function callElbaDeleteEndpoint(organisation_id: string, lastSyncedBefore: Date): Promise<void> {
  // Implement the logic to call Elba's delete-source-users endpoint
  // Pass the organisation_id and lastSyncedBefore timestamp
  // This is a placeholder implementation
}
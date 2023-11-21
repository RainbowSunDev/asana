import { NextRequest } from 'next/server';
import { QueryResult, sql } from '@vercel/postgres';
import axios from 'axios';
import { CodeExchangeData } from '@/types';
import type { Job, User, AsanaUsersData, RefreshTokenResponse, ElbaSendData } from '@/types';
import { error } from 'console';

const sdk = require('api')('@elba-security/v1.0#3vmgd2rclot9zhi8');
const Asana = require('asana');

const MAX_DURATION = 45000; // 45 seconds in milliseconds

export async function GET(request: NextRequest) {
  
  const startTime = Date.now();

  try {
    const job = await getNextJob();
    if (!job) {
      return new Response(JSON.stringify({ message: "No job in the queue" }), { status: 200 });
    }
    const accessToken = await getAccessToken(job.organisation_id);

    let paginationToken = job.pagination_token;

    do {
      const asanaResponse = await fetchUsersFromAsana(accessToken, job.organisation_id, paginationToken);
      await postUsersToElba(asanaResponse.users, job.organisation_id);

      paginationToken = asanaResponse.next_page?.offset;
      await updateJobToken(job.organisation_id, paginationToken);
    } while (paginationToken && (Date.now() - startTime) < MAX_DURATION)

    await finalizeJob(job);

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

async function getNextJob(): Promise<Job | null> {
  const { rows: jobRows } = await sql`
    SELECT * FROM users_sync_jobs
    ORDER BY priority ASC, sync_started_at ASC
    LIMIT 1;
  `;
  if (jobRows.length === 0) {
    return null;
  }

  const job = jobRows[0] as Job; // Explicitly cast the row to type Job
  return job;
}

async function updateJobToken(organisationId: string, paginationToken?: string): Promise<void> {
  if (paginationToken) {
    await sql`
      UPDATE users_sync_jobs
      SET pagination_token = ${paginationToken}
      WHERE organisation_id = ${organisationId};
    `;
  }
}

async function finalizeJob(job: Job): Promise<void> {
  await callElbaDeleteEndpoint(job.organisation_id, new Date(job.sync_started_at));
  await sql`
    DELETE FROM users_sync_jobs
    WHERE organisation_id = ${job.organisation_id};
  `;
}


async function fetchUsersFromAsana(accessToken: string, organisationId: string, paginationToken?: string): Promise<AsanaUsersData> {

  // Configure client with personal access token
  let client = Asana.ApiClient.instance;
  let token = client.authentications['token'];
  token.accessToken = accessToken;
  // Construct resource API Instance
  const usersApiInstance = new Asana.UsersApi();
  let opts = {
    'workspace': "1205941523188542",
    'limit': parseInt(process.env.NEXT_PUBLIC_USERS_SYNC_JOB_BATCH_SIZE || '100'),
    'offset': paginationToken,
    'opt_fields': "email, name,resource_type, offset, path,uri,workspaces,workspaces.name,workspaces.resource_type, role"
  };

  try {
    const result = await usersApiInstance.getUsers(opts);

    if (result && result.data) {
      return {
        users: result.data,
        next_page: result.next_page,
      };
    }

    return { users: [], next_page: undefined };
  } catch (error) {
    console.error('Error fetching users from Asana:', error);
    throw new Error('Error fetching users from Asana');
  }
}

async function getAccessToken(organisationId: string): Promise<string> {

  const { rows } = await sql`SELECT access_token, refresh_token, expires_in FROM asana_credentials WHERE organisation_id = ${organisationId};`;

  if (rows.length === 0) {
    throw new Error('No access token is found');
  }

  let { access_token, refresh_token, expires_in } = rows[0];

  // Check if the current access token is expired
  if (tokenIsExpired(expires_in)) {
    const refreshedTokens = await refreshAndSaveAccessToken(organisationId, refresh_token);
    access_token = refreshedTokens.access_token;
  }

  return access_token;
}

async function refreshAndSaveAccessToken(organisationId: string, refreshToken: string): Promise<{ access_token: string, expires_at: number }> {
  const { access_token, expires_in } = await refreshAccessToken(refreshToken);
  const expires_at = Math.floor(Date.now() / 1000) + expires_in;

  await sql`
    UPDATE asana_credentials
    SET access_token = ${access_token}, expires_in = ${expires_at}
    WHERE organisation_id = ${organisationId};
  `;

  return { access_token, expires_at };
}
async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  // Make a request to the Asana API to refresh the token
  // Return the new access token, refresh token, and expiry time
  try {
    // Ensure environment variables are set
    if (!process.env.NEXT_PUBLIC_ASANA_CLIENT_ID || !process.env.NEXT_PUBLIC_ASANA_CLIENT_SECRET) {
      throw new Error('Asana client credentials are not set');
    }

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
  
    const { access_token, expires_in } = tokenResponse.data;
    
    return { access_token, expires_in };
  } catch (error) {
    console.error('Error refreshing access token:');
    throw new Error('Failed to refresh Asana access token'); // Explicitly return undefined
  }
}

function tokenIsExpired(expiresIn: number): boolean {
  
  // Implement logic to determine if the token is expired
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  return currentTime >= expiresIn;
}

async function postUsersToElba(users: User[], organisationId: string): Promise<void> {
  // Format the users list as required by Elba's API
  // Post the formatted list to Elba's update-source-users endpoint
  // This is a placeholder implementation
  
  const sendData: ElbaSendData[] = users.map(userData => ({
    id: userData.gid,
    email: userData.email,
    displayName: `${userData.email}-${userData.name}`,
    additionalEmails: []
  }))
  try {
    const response = await sdk.users({
        organisationId: organisationId,
        sourceId: process.env.NEXT_PUBLIC_SOURCE_ID,
        users: sendData
    });
  } catch (err) {
      throw new Error("Post error to Elba")
  }
}

async function callElbaDeleteEndpoint(organisationId: string, lastSyncedBefore: Date): Promise<void> {
  // Implement the logic to call Elba's delete-source-users endpoint
  // Pass the organisation_id and lastSyncedBefore timestamp
  try {
    const response = await sdk.users1({
        organisationId: organisationId,
        sourceId: process.env.NEXT_PUBLIC_SOURCE_ID,
        lastSyncedBefore: lastSyncedBefore,
    });
  } catch (err) {
      throw new Error("Delete error from Elba")
  }
}
// app/api/users/webhook/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sql } from '@vercel/postgres';
import { WebhookData } from "@/types";

// Receive webhooks event
export async function POST(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    const x_HookSecret = requestHeaders.get("X-Hook-Secret"); 
    if (x_HookSecret) {
        
        // Respond with the X-Hook-Secret header to complete the handshake
        return new NextResponse(JSON.stringify({ success: true, message: "OK" }), {
            status: 200,
            headers: { "X-Hook-Secret": x_HookSecret },
          });
    }

    // Process the webhook notification
    const requestData: WebhookData = await request.json();
    const organisationId  = requestData.data?.resource?.gid;
    
    // add a new job to users_sync_jobs whenever webhooks occur
    if(organisationId ) {
      try {

        // Insert a sync job for the organization with priority 1
        await sql`
          INSERT INTO users_sync_jobs (organisation_id, priority, sync_started_at)
          VALUES (${organisationId }, 1, NOW()) ON CONFLICT (organisation_id) DO UPDATE
          SET
            priority = EXCLUDED.priority,
            sync_started_at = EXCLUDED.sync_started_at;
          `;
        // Respond to acknowledge receipt
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (error) {
        // Respond to acknowledge receipt
        return new Response(JSON.stringify({ name: "error", message: "database error" }), { status: 500 });
      }
      
    } else {
      return new Response(JSON.stringify({ name: "error", message: "No data" }), { status: 500 });
    }
}

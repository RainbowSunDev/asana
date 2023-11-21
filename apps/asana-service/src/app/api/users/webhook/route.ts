import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const Asana = require('asana');

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
    const responseData = await request.json();
    
    console.log('Received webhook data:', responseData);

    // Respond to acknowledge receipt
    return new NextResponse(responseData, {
        status: 200
      });
}

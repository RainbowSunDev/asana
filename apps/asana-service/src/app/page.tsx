'use client'
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default () => {
  // Construct the Asana OAuth URL
  const asanaAuthUrl = `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_ASANA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_REDIRECT_URI}&state=${process.env.NEXT_PUBLIC_ORGANIZATION_ID}`;
  const testURL = "http://localhost:3000/api/oauth/callback?code=2%2F1205924898463724%2F1205949529890945%3Ad909078c5b44d84cfc2302d3a5b40fa4&state=%3CSTATE_PARAM%3E"
  // Redirect to Asana's OAuth page
  useEffect(() => {
    try {
      window.location.href = asanaAuthUrl;
    } catch (error) {
      console.error("error", error)
    }
  }, [])

  return (
    <main>
      Redirecting to Asana...
    </main>
  );
};

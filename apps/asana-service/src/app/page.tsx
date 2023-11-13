'use client'
import { redirect } from 'next/navigation'
import { useEffect } from 'react';

export default (e) => {
  // Construct the Asana OAuth URL
  const asanaAuthUrl = `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_ASANA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_REDIRECT_URI}&state=${process.env.NEXT_PUBLIC_ORGANIZATION_ID}`;
  // Redirect to Asana's OAuth page
  useEffect(() => {
    // const testURL = "http://localhost:3000/oauth/callback?code=2%2F1205941523188532%2F1205943706750858%3A936357cdc31a4f8f0ac1abeb50b8a36d&state=b91f113b-bcf9-4a28-98c7-5b13fb671c19"
    redirect(asanaAuthUrl)
  }, [])
  return (
    <main>
      Redirecting to Asana...
    </main>
  );
};

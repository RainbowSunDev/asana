'use client'
import { useEffect } from 'react';

export default () => {
  // Construct the Asana OAuth URL
  const asanaAuthUrl = `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_ASANA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_REDIRECT_URI}&state=${process.env.NEXT_PUBLIC_ORGANIZATION_ID}`;
  
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

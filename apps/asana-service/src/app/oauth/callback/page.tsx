'use client'
import { useEffect } from "react";
import { useSearchParams } from 'next/navigation'

export default () => {
  const searchParams = useSearchParams()
  const code = searchParams.get("code");
  const organization_id = searchParams.get("state")
 
  useEffect(() => {
    if (code) {
        // Here you would typically send the code to your backend
        // to exchange it for an access token and handle the state (organization_id)
        console.log("Authorization Code:", code);
        console.log("Organization ID:", organization_id);

        // Redirect to another page or display a success message
        // router.push('/success');
    }
}, [code, organization_id]);

  return (
    <main>
      call back page
    </main>
  );
};

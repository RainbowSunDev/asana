'use client'
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ErrorPage from '../../error';
import axios from 'axios';

const elbaUrl = "https://elba-security.readme.io/"
export default function Page () {

  const [error, setError] = useState<Error & { digest?: string } | null>(null);

  const searchParams = useSearchParams();
  const code = searchParams.get('code')
  const organization_id = searchParams.get("state");
  const errorMessage = searchParams.get("error");

  useEffect(() => {
    if(errorMessage) setError( {
        name: "Error",
        message: errorMessage,
      }
      );

    const exchangeCodeToToken = async () => {
        try {
            
            const response = await axios.post('/api/exchange-token', {
                code: code,
                organization_id: organization_id,
            }, 
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
          
          console.log("response", response)
          if(response.data.success) window.location.href = elbaUrl;
          // Handle response here
        } catch (err) {
            if (err instanceof Error) {
                setError(err);
            }
        }
    };
  
    if (code && organization_id && !errorMessage) {
        exchangeCodeToToken();
    }

  }, [])

  return (
        <main>
            {error ? (<ErrorPage error = {error} reset={() => {}} />) : ('Redirecting to Elba...')}
        </main>
    );
};

'use client'
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ErrorPage from '../../error';

export default () => {
  const [error, setError] = useState<Error & { digest?: string } | null>(null);

  const searchParams = useSearchParams();
  const search = searchParams.get('code')
  const organization_id = searchParams.get("state");
  const errorMessage = searchParams.get("error");

  useEffect(() => {
    
  }, [])

  return (
        <main>
            {error ? (<ErrorPage error = {new Error} reset={() => {}} />) : ('Redirecting to Asana...')}
        </main>
    );
};

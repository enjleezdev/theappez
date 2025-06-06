'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MainPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/warehouses');
  }, [router]);

  // Return null or a loading indicator while redirecting
  // Or, you can keep the "Hello" message if you want a brief flash of content
  // For a cleaner redirect, returning null is often preferred.
  return null;
  // If you prefer to show a message:
  // return (
  //   <div className="flex h-full w-full items-center justify-center">
  //     <p>Redirecting to warehouses...</p>
  //   </div>
  // );
}

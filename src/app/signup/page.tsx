'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used. Users are created by admins.
// This component now just redirects to the login page.
export default function SignupPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/');
    }, [router]);

    return null;
}

'use client';

import Link from 'next/link';
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-black text-black dark:text-white py-8">
      <SignUp />
      <p className="text-xs text-center max-w-xs px-4">
        By signing up you confirm you are 16 or older and agree to the{' '}
        <Link href="/legal/terms" className="underline">Terms of Service</Link> and{' '}
        <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}

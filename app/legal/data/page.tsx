import Nav from '@/components/Nav';
import Link from 'next/link';

export default function DataExportDelete() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />
      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Export or Delete My Data</h1>
        <p className="text-sm leading-relaxed mb-4 text-black dark:text-white">
          You can permanently delete your account and all associated content (Spread, articles,
          and Cache) from your account settings.
        </p>
        <p className="text-sm leading-relaxed mb-6 text-black dark:text-white">
          A self-service data export isn&apos;t available yet. In the meantime, contact us and
          we&apos;ll send you a copy of your data.
        </p>
        <Link
          href="/settings"
          className="inline-block border border-black dark:border-white px-4 py-2 text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
        >
          Go to Settings
        </Link>
      </main>
    </div>
  );
}

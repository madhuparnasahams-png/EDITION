import Nav from '@/components/Nav';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />
      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-sm leading-relaxed mb-4 text-gray-600 dark:text-gray-400">
          By using Edition, you agree to publish only content you have the rights to share, to
          respect other creators and readers, and to use the platform in line with applicable
          law. Accounts that violate these terms may be suspended or removed.
        </p>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          This is placeholder legal copy. Replace with your organization&apos;s actual Terms of
          Service before launch.
        </p>
      </main>
    </div>
  );
}

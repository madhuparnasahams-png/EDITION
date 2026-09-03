import Nav from '@/components/Nav';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />
      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm leading-relaxed mb-4 text-black dark:text-white">
          Edition collects the information you provide when creating an account and using the
          platform (profile details, published content, likes, and cache activity) to operate
          the service. We do not sell your personal data.
        </p>
        <p className="text-sm leading-relaxed text-black dark:text-white">
          This is placeholder legal copy. Replace with your organization&apos;s actual Privacy
          Policy before launch.
        </p>
      </main>
    </div>
  );
}

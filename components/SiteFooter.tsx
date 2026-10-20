import Link from 'next/link';

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Discovery', href: '/discovery' },
  { label: 'About', href: '/about' },
  { label: 'Help Center', href: '/help' },
  { label: 'Contact', href: '/contact' },
  { label: 'Terms of Service', href: '/legal/terms' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Export or Delete My Data', href: '/legal/data' },
];

// Every public page links here, so no public page is ever orphaned.
export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 px-4 py-8 text-xs text-black dark:text-white">
      <nav aria-label="Footer" className="max-w-3xl mx-auto flex flex-wrap justify-center gap-x-6 gap-y-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="text-center opacity-60 mt-4">&copy; {new Date().getFullYear()} Edition</p>
    </footer>
  );
}

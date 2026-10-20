import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Answers about reading, publishing, tags, Red Tags, caching and your account on Edition.',
  alternates: { canonical: '/help' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

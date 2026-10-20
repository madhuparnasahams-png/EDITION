import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery',
  description: 'Search Edition by theme, genre, topic or creator and find new writing, audio and video.',
  alternates: { canonical: '/discovery' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

'use client';

import { useState } from 'react';
import Nav from '@/components/Nav';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to send');
      }
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-5 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">Contact</h1>
        <p className="text-sm text-black dark:text-white mb-1">
          Questions, feedback, or something broken? Tell us.
        </p>
        <p className="text-sm text-black dark:text-white mb-6">
          Or email us directly at{' '}
          <a href="mailto:edition@gmail.com" className="text-black dark:text-white hover:opacity-60 transition">
            edition@gmail.com
          </a>
        </p>

        {status === 'sent' ? (
          <div className="border border-gray-200 dark:border-gray-800 p-6 text-center">
            <p className="text-sm font-semibold mb-1">Message sent</p>
            <p className="text-xs text-black dark:text-white">We&apos;ll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-xs text-red-700">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-black text-white dark:bg-white dark:text-black text-sm font-semibold py-3 hover:opacity-80 transition disabled:opacity-40"
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

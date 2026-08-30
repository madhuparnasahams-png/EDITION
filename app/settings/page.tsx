'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import Nav from '@/components/Nav';
import { useTheme } from '@/components/ThemeProvider';

function ToggleSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-label={label}
      aria-pressed={checked}
      className={`relative w-11 h-6 flex-shrink-0 transition-colors border disabled:opacity-40 ${
        checked ? 'bg-black border-black dark:bg-white dark:border-white' : 'bg-transparent border-gray-300 dark:border-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 transition-transform ${
          checked ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0 bg-black dark:bg-white'
        }`}
      />
    </button>
  );
}

function SettingsRow({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800 last:border-none">
      <div className="pr-4">
        <div className="text-sm font-semibold">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-1">{description}</div>}
      </div>
      {control}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold mt-8 mb-1 first:mt-0">{children}</h2>;
}

export default function Settings() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { theme, toggleTheme } = useTheme();

  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [cachePrivate, setCachePrivate] = useState(true);
  const [allowFollow, setAllowFollow] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    const fetchPrivacy = async () => {
      try {
        const response = await fetch('/api/profile/privacy');
        if (response.ok) {
          const data = await response.json();
          setCachePrivate(data.privateCache);
          setAllowFollow(data.allowFollowers);
          setAllowMessages(data.allowMessages);
        }
      } catch (error) {
        console.error('Failed to fetch privacy settings:', error);
      } finally {
        setPrivacyLoaded(true);
      }
    };
    fetchPrivacy();
  }, [isSignedIn]);

  const savePrivacy = async (field: 'privateCache' | 'allowFollowers' | 'allowMessages', value: boolean) => {
    const rollback = { cachePrivate, allowFollow, allowMessages };
    if (field === 'privateCache') setCachePrivate(value);
    if (field === 'allowFollowers') setAllowFollow(value);
    if (field === 'allowMessages') setAllowMessages(value);

    setSavingPrivacy(true);
    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('failed to save');
    } catch (error) {
      console.error('Failed to save privacy setting:', error);
      setCachePrivate(rollback.cachePrivate);
      setAllowFollow(rollback.allowFollow);
      setAllowMessages(rollback.allowMessages);
    } finally {
      setSavingPrivacy(false);
    }
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-white dark:bg-black" />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Nav />
        <main className="px-4 py-12 text-center text-gray-600">
          <p>Sign in to view your settings.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-5 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Account */}
        <SectionTitle>Account</SectionTitle>
        <SettingsRow
          label="Username"
          description={`@${user?.username ?? 'unknown'}`}
          control={
            <button onClick={() => openUserProfile()} className="text-xs font-semibold hover:opacity-60 transition">
              Edit
            </button>
          }
        />
        <SettingsRow
          label="Email"
          description={user?.primaryEmailAddress?.emailAddress}
          control={
            <button onClick={() => openUserProfile()} className="text-xs font-semibold hover:opacity-60 transition">
              Edit
            </button>
          }
        />
        <SettingsRow
          label="Password & Security"
          description="Manage login and security options"
          control={
            <button onClick={() => openUserProfile()} className="text-xs font-semibold hover:opacity-60 transition">
              Manage
            </button>
          }
        />
        <SettingsRow
          label="Sign Out"
          control={
            <button onClick={() => signOut()} className="text-xs font-semibold hover:opacity-60 transition">
              Sign Out
            </button>
          }
        />
        <SettingsRow
          label="Delete Account"
          description="Permanently remove your account and all content"
          control={
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-semibold text-red-700 hover:opacity-60 transition"
            >
              Delete
            </button>
          }
        />

        {showDeleteConfirm && (
          <div className="mt-3 border border-red-700 p-4 text-xs">
            <p className="mb-3">
              This permanently deletes your Spread, articles, and Cache. This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => user?.delete()}
                className="font-semibold text-red-700 hover:opacity-60 transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="font-semibold hover:opacity-60 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Privacy */}
        <SectionTitle>Privacy</SectionTitle>
        <SettingsRow
          label="Private Cache"
          description="Saved, but nothing currently shows others' caches - so this has no visible effect yet"
          control={
            <ToggleSwitch
              checked={cachePrivate}
              disabled={!privacyLoaded || savingPrivacy}
              onChange={() => savePrivacy('privateCache', !cachePrivate)}
              label="Private Cache"
            />
          }
        />
        <SettingsRow
          label="Allow Followers"
          description="Turning this off actually blocks new follows"
          control={
            <ToggleSwitch
              checked={allowFollow}
              disabled={!privacyLoaded || savingPrivacy}
              onChange={() => savePrivacy('allowFollowers', !allowFollow)}
              label="Allow Followers"
            />
          }
        />
        <SettingsRow
          label="Allow Messages"
          description="Saved, but there's no direct-messaging feature yet - has no visible effect yet"
          control={
            <ToggleSwitch
              checked={allowMessages}
              disabled={!privacyLoaded || savingPrivacy}
              onChange={() => savePrivacy('allowMessages', !allowMessages)}
              label="Allow Messages"
            />
          }
        />

        {/* Appearance */}
        <SectionTitle>Appearance</SectionTitle>
        <SettingsRow
          label="Dark Mode"
          description={theme === 'dark' ? 'Currently on' : 'Currently off'}
          control={<ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} label="Dark Mode" />}
        />

        {/* Legal */}
        <SectionTitle>Legal</SectionTitle>
        <Link href="/legal/terms" className="block py-4 border-b border-gray-200 dark:border-gray-800 text-sm hover:opacity-60 transition">
          Terms of Service
        </Link>
        <Link href="/legal/privacy" className="block py-4 border-b border-gray-200 dark:border-gray-800 text-sm hover:opacity-60 transition">
          Privacy Policy
        </Link>
        <Link href="/legal/data" className="block py-4 text-sm hover:opacity-60 transition">
          Export or Delete My Data
        </Link>
      </main>
    </div>
  );
}

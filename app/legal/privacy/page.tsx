import LegalDoc, { type LegalSection } from '@/components/LegalDoc';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Edition collects, why, who processes it, and how to delete it.',
  alternates: { canonical: '/legal/privacy' },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'What we collect',
    body: [
      'Account details: your username and the email address and sign-in details you give when you sign up, handled by our sign-in provider.',
      'What you add: profile details, avatar, articles, images, comments, likes, follows, Cache items, reading progress and reports you file.',
      'Basic technical data that hosting systems record automatically, such as request logs.',
      'We do not collect payment details, because Edition has no payments.',
    ],
  },
  {
    heading: 'Why we use it',
    body: [
      'To run Edition: show your work, build feeds and Discovery, deliver comments and mentions to your Inbox, keep the service safe, and handle reports. We do not sell your personal data and we do not run advertising.',
    ],
  },
  {
    heading: 'Who handles it',
    body: [
      'We use outside services to operate Edition: Clerk for sign-in, Neon for the database, Cloudinary for images and Vercel for hosting. They process data on our behalf to provide those services. We rely on their own security measures and do not describe them further here.',
    ],
  },
  {
    heading: 'What is public',
    body: [
      'Your username, profile, published articles and comments are visible to anyone, including search engines. Hidden or taken-down content is not listed. Do not publish anything you want kept private.',
    ],
  },
  {
    heading: 'Notices to you',
    body: [
      'We tell you about moderation actions, such as a hidden account or a taken-down article, through your Inbox on Edition. We do not send these by email.',
    ],
  },
  {
    heading: 'Keeping it safe',
    body: [
      'We take reasonable steps to protect your data, including limited admin access. No system is perfectly secure. We currently find breaches by manual review. If a breach affecting your personal data occurs, we will tell affected users as soon as practical.',
    ],
  },
  {
    heading: 'Your choices',
    body: [
      'You can edit your profile and content at any time. You can delete your account in Settings, which removes your Spread, articles and Cache. You can ask for a copy of your data through the Export or Delete My Data page. Deleted data may remain briefly in backups.',
    ],
  },
  {
    heading: 'Age',
    body: [
      'Edition is for people aged 16 and over. We do not knowingly keep accounts of people under 16 and will remove them if found.',
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'We use cookies needed to keep you signed in and to remember your light or dark choice. We do not use advertising cookies.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'We will change the date above when this policy changes. Questions or requests: edition@gmail.com, or the Contact page. Disputes follow the Terms of Service.',
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="19 October 2026"
      intro="This explains what Edition collects about you, why, and what you can do about it."
      sections={SECTIONS}
    />
  );
}

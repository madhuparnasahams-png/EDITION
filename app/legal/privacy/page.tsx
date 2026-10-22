import LegalDoc, { type LegalSection } from '@/components/LegalDoc';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Edition collects, why, who processes it, and how to delete it.',
  alternates: { canonical: '/legal/privacy' },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who runs Edition',
    body: [
      'Edition is run from Kolkata, West Bengal, India, and is the party that decides how your personal data is used. For anything about your personal data, write to edition.masthead@gmail.com.',
    ],
  },
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
    heading: 'Where your data is processed',
    body: [
      'Edition is run from India, and the services above run mostly in the United States and other countries. By using Edition you understand that your data is processed outside the country where you live, including outside India.',
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
      'We take reasonable steps to protect your data, including limited admin access. No system is perfectly secure. We currently find breaches by manual review. If a breach affecting your personal data occurs, we will tell affected users without undue delay, and we will notify the relevant data protection regulator where the law requires it.',
    ],
  },
  {
    heading: 'Your rights and choices',
    body: [
      'You can edit your profile and content at any time, and you can delete your account in Settings, which removes your Spread, articles and Cache.',
      'Depending on where you live, you also have the right to ask us for a copy of your data, to correct it, to delete it, to move it elsewhere, and to object to how it is used. You can make these requests through the Export or Delete My Data page or by email to edition.masthead@gmail.com. We will answer without undue delay.',
      'You also have the right to complain to the data protection regulator where you live, or in India.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep your data while your account exists. When you delete your account, your Spread, articles, comments and Cache are removed. Copies held in our database provider\'s backups are overwritten as its routine backup cycle expires. Messages sent through the Contact page are kept for as long as we need them to reply and keep a record.',
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
      'We will change the date above when this policy changes. Questions or requests: edition.masthead@gmail.com, or the Contact page. Disputes follow the Terms of Service.',
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

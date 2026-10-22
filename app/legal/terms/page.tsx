import LegalDoc, { type LegalSection } from '@/components/LegalDoc';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules for using Edition: accounts, content, Red Tags, moderation and disputes.',
  alternates: { canonical: '/legal/terms' },
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who may use Edition',
    body: [
      'You must be at least 16 years old to create an account or use Edition. If you are under 16, do not use the service. If we learn that an account belongs to someone under 16, we may remove it.',
      'You may hold one account. Anyone found operating more than one account may have the extra accounts removed once this is reported to us.',
      'You are responsible for what happens under your account and for keeping your sign-in details safe.',
    ],
  },
  {
    heading: 'Your content',
    body: [
      'You keep ownership of what you publish. By publishing on Edition you give us a non-exclusive, worldwide licence to store, display, resize and distribute your content on and through Edition, only so that the service can work. The licence ends when you delete the content, apart from short-lived backups and copies other people have already cached.',
      'Publish only what you have the right to share. Do not post other people\'s work, private information, or anything that infringes someone\'s rights.',
      'Everything on Edition must be appropriate for readers aged 16 and over.',
    ],
  },
  {
    heading: 'Red Tags',
    body: [
      'A Red Tag is a content warning that you add to your piece, such as violence, self-harm or strong language. It is a heads-up for readers. It is not a gate, and it does not make otherwise prohibited content allowed.',
      'You must apply the Red Tags that honestly describe your piece. Leaving out an accurate Red Tag, or using one misleadingly, is a breach of these terms.',
    ],
  },
  {
    heading: 'What is not allowed',
    body: [
      'No content that is illegal under applicable law, that sexualises minors, that promotes or instructs self-harm, that threatens or harasses others, that doxxes anyone, or that is spam or fraud.',
      'No attempts to break, probe or overload the service, to get around its limits, or to access other people\'s accounts or data.',
    ],
  },
  {
    heading: 'Reports and moderation',
    body: [
      'Anyone can report an article, a comment or an account. The Edition team reviews reports by hand and may hide content, take it down, or hide an account.',
      'When we hide an account or a piece of content, we tell the owner through their Inbox on Edition. We do not send email notices. Hidden content shows as "Taken down by Edition".',
      'We may act without warning where the risk is serious. Our decisions are made in good faith and are not guaranteed to be perfect.',
    ],
  },
  {
    heading: 'No payments',
    body: [
      'Edition is free. It does not process payments, sell subscriptions or pay creators. If that ever changes, these terms will be updated first.',
    ],
  },
  {
    heading: 'Your responsibility for what you post',
    body: [
      'You agree to cover losses that arise directly from content you post that you did not have the right to post, or from your breach of these terms. This covers reasonable costs of claims brought against Edition because of that content or breach.',
    ],
  },
  {
    heading: 'The service as it is',
    body: [
      'Edition is provided as it is, without promises that it will always be available or error-free. To the extent the law allows, we are not liable for indirect or consequential loss, and our total liability to you is limited to the amount you have paid us, which is nothing. Nothing in these terms excludes liability that cannot be excluded by law.',
    ],
  },
  {
    heading: 'Ending your account',
    body: [
      'You can delete your account at any time from Settings, which removes your Spread, articles and Cache. We may suspend or end accounts that breach these terms.',
    ],
  },
  {
    heading: 'Governing law and disputes',
    body: [
      'These terms are governed by the laws of India. Wherever you live, any dispute arising from these terms or from your use of Edition must be brought only before the courts at Kolkata, West Bengal, India, and you agree to submit to those courts.',
    ],
  },
  {
    heading: 'Changes and contact',
    body: [
      'We may update these terms. When we do, the date at the top changes. Continuing to use Edition after that means you accept the update.',
      'Questions: edition.masthead@gmail.com, or the Contact page.',
    ],
  },
];

export default function TermsOfService() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="19 October 2026"
      intro="These terms are the agreement between you and Edition. By creating an account or using Edition you accept them."
      sections={SECTIONS}
    />
  );
}

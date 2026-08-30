import Nav from '@/components/Nav';

const VALUES = [
  { name: 'Trust', desc: 'In your taste, in creators\u2019 voices, in the curation.' },
  { name: 'Autonomy', desc: 'Creators choose their tone; readers choose their path.' },
  { name: 'Growth', desc: 'Both creator and reader evolve through the platform.' },
  { name: 'Authenticity', desc: 'Real creators, real voices, no algorithm fakery.' },
  { name: 'Craft', desc: 'Quality over virality; thoughtfulness matters.' },
  { name: 'Accessibility', desc: 'Underrepresented voices elevated; niche as legitimate.' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">About Edition</h1>

        <p className="text-sm leading-relaxed mb-4">
          This platform exists because the creator and the reader—they&apos;re the same person. And they&apos;re tired.
        </p>
        <p className="text-sm leading-relaxed mb-4">
          Tired of fragmentation. Tired of choosing between reach and authenticity. Tired of platforms that say they
          believe in craft but reward virality. Tired of hunting for their people across a dozen apps. Tired of
          stagnating.
        </p>
        <p className="text-sm leading-relaxed mb-4">
          So we built one home where thoughtful work lives, where your taste is trusted, where discovery is real,
          and where creators can actually sustain themselves.
        </p>
        <p className="text-sm leading-relaxed mb-4">
          But more than that—where you actually grow. Where readers find voices that push them. Where creators get
          feedback that sharpens their work. Where community pushes everyone forward.
        </p>
        <p className="text-sm leading-relaxed mb-8 font-semibold">
          No algorithm fakery. No broken promises. Just: you create, people find you, you learn, you earn, you keep
          growing.
        </p>

        <h2 className="text-lg font-bold mb-4">What We Stand For</h2>
        <div className="flex flex-col gap-5 mb-8">
          {VALUES.map((v) => (
            <div key={v.name} className="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-none">
              <div className="text-sm font-bold mb-1">{v.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{v.desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
            A newsstand that knows you—and learns you—because it trusts your taste.
          </p>
        </div>
      </main>
    </div>
  );
}

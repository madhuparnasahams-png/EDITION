import Nav from '@/components/Nav';

export interface LegalSection {
  heading: string;
  body: string[];
}

export default function LegalDoc({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />
      <main className="px-4 py-10 max-w-2xl mx-auto">
        <h1 className="text-4xl mb-2">{title}</h1>
        <p className="text-xs opacity-60 mb-8">Last updated {updated}</p>
        <p className="leading-relaxed mb-8">{intro}</p>
        {sections.map((s, i) => (
          <section key={s.heading} className="mb-8">
            <h2 className="text-xl mb-3">{i + 1}. {s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="leading-relaxed mb-3">{p}</p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

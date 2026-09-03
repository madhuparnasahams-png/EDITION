'use client';

import { useEffect, useRef, useState } from 'react';

interface SlidingTabsProps {
  tabs: readonly string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

// A tab strip where the active-state indicator is ONLY the underline - tab
// labels are always the same color (no grey/black split), and the
// underline itself slides smoothly between positions instead of just
// appearing/disappearing under whichever tab is clicked.
export default function SlidingTabs({ tabs, activeTab, onChange }: SlidingTabsProps) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = buttonRefs.current[activeTab];
    if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab, tabs]);

  return (
    <div className="relative flex justify-around border-b border-gray-200 dark:border-gray-800">
      {tabs.map((tab) => (
        <button
          key={tab}
          ref={(el) => {
            buttonRefs.current[tab] = el;
          }}
          onClick={() => onChange(tab)}
          className="flex-1 text-center py-4 text-base text-black dark:text-white transition-opacity hover:opacity-60"
        >
          {tab}
        </button>
      ))}
      <span
        className="absolute bottom-0 h-0.5 bg-black dark:bg-white transition-all duration-300 ease-out"
        style={{ left: underline.left, width: underline.width }}
      />
    </div>
  );
}

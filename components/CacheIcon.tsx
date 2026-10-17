// Folder icon: white with a black border when not cached, solid black when cached.
// (In dark mode the colors invert so the state stays legible.)
export default function CacheIcon({ cached, size = 20 }: { cached: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      className={`transition-all duration-200 stroke-black dark:stroke-white ${
        cached ? 'fill-black dark:fill-white' : 'fill-white dark:fill-black'
      }`}
    >
      <path d="M4.2 4.5H7Q7.6 4.5 8 4.9L10.4 7.2H19.8Q21 7.2 21 8.4V18.3Q21 19.5 19.8 19.5H4.2Q3 19.5 3 18.3V5.7Q3 4.5 4.2 4.5Z" />
    </svg>
  );
}

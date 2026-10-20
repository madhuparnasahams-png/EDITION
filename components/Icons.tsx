import type { ReactNode, SVGProps } from 'react';

// One small, hand-drawn icon set (24px grid, round caps). Same stroke weight
// everywhere so the whole app reads as one family.
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  strokeWidth?: number;
}

function make(paths: ReactNode) {
  return function Icon({ size = 20, strokeWidth = 1.8, className, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const Menu = make(<path d="M4 6h16M4 12h16M4 18h16" />);
export const Search = make(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>);
export const Mail = make(<><rect x="3" y="5" width="18" height="14" /><path d="M3 7l9 6 9-6" /></>);
export const X = make(<path d="M6 6l12 12M18 6L6 18" />);
export const Heart = make(<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />);
export const ArrowLeft = make(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const ArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const ArrowUp = make(<path d="M12 19V5M6 11l6-6 6 6" />);
export const ArrowDown = make(<path d="M12 5v14M6 13l6 6 6-6" />);
export const Trash2 = make(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />);
export const Eye = make(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const Plus = make(<path d="M12 5v14M5 12h14" />);
export const Minus = make(<path d="M5 12h14" />);
export const Type = make(<path d="M5 7V4h14v3M12 4v16M9 20h6" />);
export const ImageIcon = make(<><rect x="3" y="4" width="18" height="16" /><circle cx="9" cy="10" r="1.5" /><path d="M3 17l5-5 4 4 3-3 6 5" /></>);
export const Film = make(<><rect x="3" y="4" width="18" height="16" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></>);
export const Quote = make(<path d="M10 7C7 8 5.5 10 5.5 13v4H10v-5H7.5c0-2 .8-3.3 2.5-4zM19 7c-3 1-4.5 3-4.5 6v4H19v-5h-2.5c0-2 .8-3.3 2.5-4z" />);

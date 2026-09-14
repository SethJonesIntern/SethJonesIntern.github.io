export interface NavItem {
  readonly href: string;
  readonly label: string;
}

export interface FooterLink {
  readonly href: string;
  readonly label: string;
}

export const SITE_TITLE: string = 'Seth Jones';
export const SITE_DESCRIPTION: string =
  'Seth Jones is a PhD student in Computer Science at the University of Central Florida, researching software engineering for AI at SAIL@UCF.';
export const SITE_AUTHOR: string = 'Seth Jones';
export const SITE_AFFILIATION: string =
  'PhD student in Computer Science, University of Central Florida';
export const TITLE_SEPARATOR: string = ' · '; // space, U+00B7 MIDDLE DOT, space

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
  { href: '/research/', label: 'Research' },
  { href: '/teaching/', label: 'Teaching' },
  { href: '/projects/', label: 'Projects' },
  { href: '/blog/', label: 'Blog' },
  { href: '/contact/', label: 'Contact' },
];

// Ships empty: the real profile URLs are unverified, so the footer list stays unrendered.
export const FOOTER_LINKS: readonly FooterLink[] = [];

export type OverviewSection = 'experience' | 'projects' | 'skills' | 'contact';

interface OverviewPosition {
  section: OverviewSection;
  windowY: number;
}

const OVERVIEW_POSITION_KEY = 'matias.overview-position';

export function getOverviewSection(pathname: string): OverviewSection | null {
  if (pathname.startsWith('/experience')) return 'experience';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/skills')) return 'skills';
  if (pathname.startsWith('/contact')) return 'contact';
  return null;
}

export function getOverviewHref(section: OverviewSection): string {
  return `/#${section}`;
}

function isOverviewSection(value: unknown): value is OverviewSection {
  return (
    value === 'experience' || value === 'projects' || value === 'skills' || value === 'contact'
  );
}

function isOverviewPosition(value: unknown): value is OverviewPosition {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { section?: unknown; windowY?: unknown };
  return isOverviewSection(candidate.section) && typeof candidate.windowY === 'number';
}

export function rememberOverviewPosition(section: OverviewSection, windowY: number): void {
  if (typeof window === 'undefined' || !Number.isFinite(windowY)) return;
  try {
    window.sessionStorage.setItem(
      OVERVIEW_POSITION_KEY,
      JSON.stringify({ section, windowY: Math.max(0, windowY) } satisfies OverviewPosition),
    );
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
}

export function readOverviewPosition(): OverviewPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(OVERVIEW_POSITION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isOverviewPosition(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

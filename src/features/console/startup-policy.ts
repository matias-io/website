export const STARTUP_DURATION_MS = 4_200;
export const REDUCED_STARTUP_DURATION_MS = 700;
export const STARTUP_WATCHDOG_MS = 7_000;

export type StartupLifecycle = 'document-load' | 'spa-route';
export type StartupNavigationType = 'navigate' | 'reload';

export interface StartupRequest {
  pathname: string;
  lifecycle: StartupLifecycle;
  navigationType: StartupNavigationType;
}

export function shouldShowStartup({
  pathname,
  lifecycle,
  navigationType,
}: StartupRequest): boolean {
  return lifecycle === 'document-load' && (pathname === '/' || navigationType === 'reload');
}

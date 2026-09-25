// External links used by the shell (all https, opened with rel="noopener noreferrer").
export const REPO_URL = 'https://github.com/Endorrfin/numbers-speak';
export const ISSUES_URL = `${REPO_URL}/issues`;

export const sourceUrlFor = (id: string): string => `${REPO_URL}/tree/main/src/viz/${id}`;

// CHANGED (S3-an): GoatCounter — anonymous page counts (src/lib/analytics.ts). The site code is public by
// design (it is in every request), not a secret. Dashboard: https://numbers-speak.goatcounter.com (private).
export const GOATCOUNTER_COUNT_URL = 'https://numbers-speak.goatcounter.com/count';
/** Hosts where views are counted; anything else (localhost, LAN, forks, previews, file://) is not. */
export const COUNT_HOSTS: readonly string[] = ['endorrfin.github.io'];

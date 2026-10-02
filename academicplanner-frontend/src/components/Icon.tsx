import type { SVGProps } from 'react';

export type IconName = 'pine' | 'arrow' | 'lock' | 'eye' | 'eye-off' | 'sun' | 'moon' | 'check' | 'alert' | 'book' | 'leaf' | 'calendar' | 'spark' | 'more' | 'clock' | 'pin' | 'close' | 'chevron-left' | 'chevron-right' | 'offline' | 'edit' | 'trash' | 'refresh' | 'sync';
const paths: Record<IconName, React.ReactNode> = {
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></>,
  sync: <><path d="M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3" /></>,
  offline: <><path d="m3 3 18 18M8 8a13 13 0 0 1 13 1M3 9l2-1m3 5a7 7 0 0 1 8 0m-6 4a3 3 0 0 1 4 0" /><circle cx="12" cy="21" r=".5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2" /></>,
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  pine: <><path d="m12 3-5 6h3l-5 6h4l-4 4h14l-4-4h4l-5-6h3Z" /><path d="M12 19v3" /></>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="m3 3 18 18M10 5.2c.6-.1 1.3-.2 2-.2 6.5 0 10 7 10 7a19 19 0 0 1-3 3.7M6 6.5A21 21 0 0 0 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M10 10a3 3 0 0 0 4 4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: <><path d="M12 8v5m0 3v.1" /><path d="m10.3 4-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" /></>,
  book: <><path d="M12 5v16m0-16C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z" /></>,
  leaf: <><path d="M20 3C8 2 2 7 5 15s16 6 15-12ZM4 21 15 10" /></>,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

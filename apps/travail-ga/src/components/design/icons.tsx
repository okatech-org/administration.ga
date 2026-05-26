/**
 * Icônes TRAVAIL.GA — style Lucide custom, 24x24, stroke 1.75.
 * Source : design Claude `icons.jsx`. Convertis en TSX, exportés
 * individuellement + en namespace `Icons`.
 */
import type { CSSProperties, SVGProps, ReactElement } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "size"> & {
  size?: number;
  style?: CSSProperties;
};

function I({ size = 18, children, style, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Icons = {
  Search: (p: IconProps) => (
    <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>
  ),
  Bell: (p: IconProps) => (
    <I {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></I>
  ),
  Menu: (p: IconProps) => (
    <I {...p}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></I>
  ),
  Close: (p: IconProps) => (
    <I {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></I>
  ),
  ChevronR: (p: IconProps) => <I {...p}><path d="m9 6 6 6-6 6"/></I>,
  ChevronL: (p: IconProps) => <I {...p}><path d="m15 6-6 6 6 6"/></I>,
  ChevronD: (p: IconProps) => <I {...p}><path d="m6 9 6 6 6-6"/></I>,
  ArrowR: (p: IconProps) => (
    <I {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></I>
  ),
  ArrowUR: (p: IconProps) => (
    <I {...p}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></I>
  ),
  Plus: (p: IconProps) => (
    <I {...p}><path d="M12 5v14"/><path d="M5 12h14"/></I>
  ),
  Check: (p: IconProps) => <I {...p}><path d="M20 6 9 17l-5-5"/></I>,
  Filter: (p: IconProps) => <I {...p}><path d="M3 5h18l-7 9v6l-4-2v-4Z"/></I>,
  Briefcase: (p: IconProps) => (
    <I {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></I>
  ),
  MapPin: (p: IconProps) => (
    <I {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></I>
  ),
  Building: (p: IconProps) => (
    <I {...p}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/><path d="M10 21v-3a2 2 0 0 1 4 0v3"/></I>
  ),
  Landmark: (p: IconProps) => (
    <I {...p}><path d="M3 21h18"/><path d="M3 10h18"/><path d="m12 4 9 5H3z"/><path d="M6 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M18 10v8"/></I>
  ),
  User: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></I>
  ),
  Users: (p: IconProps) => (
    <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>
  ),
  Bookmark: (p: IconProps) => (
    <I {...p}><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4z"/></I>
  ),
  BookmarkF: (p: IconProps) => (
    <I {...p}><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4z" fill="currentColor"/></I>
  ),
  Sparkles: (p: IconProps) => (
    <I {...p}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="M19 14v3M17.5 15.5h3"/></I>
  ),
  Wallet: (p: IconProps) => (
    <I {...p}><path d="M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/><path d="M3 9V7a2 2 0 0 1 2-2h11"/><circle cx="17" cy="13" r="1.5" fill="currentColor"/></I>
  ),
  Clock: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>
  ),
  Calendar: (p: IconProps) => (
    <I {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></I>
  ),
  Mail: (p: IconProps) => (
    <I {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></I>
  ),
  Phone: (p: IconProps) => (
    <I {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92"/></I>
  ),
  Home: (p: IconProps) => (
    <I {...p}><path d="m3 11 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></I>
  ),
  Inbox: (p: IconProps) => (
    <I {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11"/></I>
  ),
  Settings: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></I>
  ),
  Sun: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></I>
  ),
  Moon: (p: IconProps) => (
    <I {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79"/></I>
  ),
  Monitor: (p: IconProps) => (
    <I {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></I>
  ),
  CheckCircle: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></I>
  ),
  Shield: (p: IconProps) => (
    <I {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></I>
  ),
  ShieldCheck: (p: IconProps) => (
    <I {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></I>
  ),
  Globe: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></I>
  ),
  TrendUp: (p: IconProps) => (
    <I {...p}><path d="m22 7-9 9-4-4-7 7"/><path d="M16 7h6v6"/></I>
  ),
  Activity: (p: IconProps) => (
    <I {...p}><path d="M22 12h-3l-3 9-6-18-3 9H2"/></I>
  ),
  Eye: (p: IconProps) => (
    <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></I>
  ),
  Fire: (p: IconProps) => (
    <I {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5"/></I>
  ),
  Star: (p: IconProps) => (
    <I {...p}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></I>
  ),
  Layers: (p: IconProps) => (
    <I {...p}><path d="m12 2 10 6-10 6L2 8z"/><path d="m2 17 10 6 10-6"/><path d="m2 12 10 6 10-6"/></I>
  ),
  Lock: (p: IconProps) => (
    <I {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></I>
  ),
  Heart: (p: IconProps) => (
    <I {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78"/></I>
  ),
  Compass: (p: IconProps) => (
    <I {...p}><circle cx="12" cy="12" r="9"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/></I>
  ),
};

export type IconComponent = (p: IconProps) => ReactElement;

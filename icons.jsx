// ============================================
// Icons — line/stroke style, 16px
// ============================================
const { React } = window;

const SvgIcon = ({ size = 16, className = "", style, children, viewBox = "0 0 24 24" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`icon ${className}`}
    style={style}
  >
    {children}
  </svg>
);

const Icon = {
  Branch: (p) => (
    <SvgIcon {...p}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 8v8" />
      <path d="M6 12h6a4 4 0 0 0 4-4" />
    </SvgIcon>
  ),
  Merge: (p) => (
    <SvgIcon {...p}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M6 8v8" />
      <path d="M6 9c0 5 4 9 9 9" />
    </SvgIcon>
  ),
  GitPullRequest: (p) => (
    <SvgIcon {...p}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M6 8v8" />
      <path d="M18 11v5" />
      <path d="M14 5l3 -1l1 3" />
    </SvgIcon>
  ),
  GitCommit: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12h6" />
      <path d="M15 12h6" />
    </SvgIcon>
  ),
  Book: (p) => (
    <SvgIcon {...p}>
      <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
      <path d="M3 6v13" />
      <path d="M12 6v13" />
      <path d="M21 6v13" />
    </SvgIcon>
  ),
  Folder: (p) => (
    <SvgIcon {...p}>
      <path d="M3 6a2 2 0 0 1 2 -2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
    </SvgIcon>
  ),
  FolderOpen: (p) => (
    <SvgIcon {...p}>
      <path d="M5 19l2.5 -9h13l-2.5 9z" />
      <path d="M5 19v-13a2 2 0 0 1 2 -2h4l2 2h6a2 2 0 0 1 2 2v3" />
    </SvgIcon>
  ),
  File: (p) => (
    <SvgIcon {...p}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
    </SvgIcon>
  ),
  FileCode: (p) => (
    <SvgIcon {...p}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
      <path d="M10 13l-2 2l2 2" />
      <path d="M14 13l2 2l-2 2" />
    </SvgIcon>
  ),
  Chevron: (p) => (
    <SvgIcon {...p}><path d="M9 6l6 6l-6 6" /></SvgIcon>
  ),
  ChevronDown: (p) => (
    <SvgIcon {...p}><path d="M6 9l6 6l6 -6" /></SvgIcon>
  ),
  ChevronUpDown: (p) => (
    <SvgIcon {...p}>
      <path d="M7 9l5 -5l5 5" />
      <path d="M7 15l5 5l5 -5" />
    </SvgIcon>
  ),
  ArrowRight: (p) => (
    <SvgIcon {...p}><path d="M5 12h14" /><path d="M13 6l6 6l-6 6" /></SvgIcon>
  ),
  ArrowLeft: (p) => (
    <SvgIcon {...p}><path d="M19 12h-14" /><path d="M11 6l-6 6l6 6" /></SvgIcon>
  ),
  Check: (p) => (
    <SvgIcon {...p}><path d="M5 12l5 5l9 -9" /></SvgIcon>
  ),
  CheckCircle: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3l5 -5" />
    </SvgIcon>
  ),
  X: (p) => (
    <SvgIcon {...p}><path d="M6 6l12 12" /><path d="M18 6l-12 12" /></SvgIcon>
  ),
  Plus: (p) => (
    <SvgIcon {...p}><path d="M12 5v14" /><path d="M5 12h14" /></SvgIcon>
  ),
  Minus: (p) => (
    <SvgIcon {...p}><path d="M5 12h14" /></SvgIcon>
  ),
  Search: (p) => (
    <SvgIcon {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M21 21l-5.7 -5.7" />
    </SvgIcon>
  ),
  Settings: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06 .06a2 2 0 0 1 -2.83 2.83l-.06 -.06a1.65 1.65 0 0 0 -1.82 -.33a1.65 1.65 0 0 0 -1 1.51v.17a2 2 0 0 1 -4 0v-.09a1.65 1.65 0 0 0 -1.08 -1.51a1.65 1.65 0 0 0 -1.82 .33l-.06 .06a2 2 0 0 1 -2.83 -2.83l.06 -.06a1.65 1.65 0 0 0 .33 -1.82a1.65 1.65 0 0 0 -1.51 -1h-.17a2 2 0 0 1 0 -4h.09a1.65 1.65 0 0 0 1.51 -1.08a1.65 1.65 0 0 0 -.33 -1.82l-.06 -.06a2 2 0 0 1 2.83 -2.83l.06 .06a1.65 1.65 0 0 0 1.82 .33h.01a1.65 1.65 0 0 0 1 -1.51v-.17a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51a1.65 1.65 0 0 0 1.82 -.33l.06 -.06a2 2 0 0 1 2.83 2.83l-.06 .06a1.65 1.65 0 0 0 -.33 1.82v.01a1.65 1.65 0 0 0 1.51 1h.17a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0 -1.51 1z" />
    </SvgIcon>
  ),
  Lock: (p) => (
    <SvgIcon {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </SvgIcon>
  ),
  Shield: (p) => (
    <SvgIcon {...p}>
      <path d="M12 3l8 3v5c0 5 -3.5 9 -8 10c-4.5 -1 -8 -5 -8 -10v-5z" />
      <path d="M9 12l2 2l4 -4" />
    </SvgIcon>
  ),
  Eye: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M2 12c2.5 -5 6 -7.5 10 -7.5s7.5 2.5 10 7.5c-2.5 5 -6 7.5 -10 7.5s-7.5 -2.5 -10 -7.5" />
    </SvgIcon>
  ),
  EyeOff: (p) => (
    <SvgIcon {...p}>
      <path d="M3 3l18 18" />
      <path d="M10.5 6.5a8 8 0 0 1 1.5 -0.5c4 0 7.5 2.5 10 7.5c-.5 1 -1.1 1.9 -1.8 2.6" />
      <path d="M6.5 7.5c-1.7 1.1 -3.2 2.7 -4.5 4.5c2.5 5 6 7.5 10 7.5c1.6 0 3.1 -.4 4.4 -1.1" />
      <path d="M9.9 9.9a2.5 2.5 0 0 0 3.5 3.5" />
    </SvgIcon>
  ),
  ExternalLink: (p) => (
    <SvgIcon {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M21 14v5a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2V5a2 2 0 0 1 2 -2h5" />
    </SvgIcon>
  ),
  Copy: (p) => (
    <SvgIcon {...p}>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0 -2 -2H5a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h3" />
    </SvgIcon>
  ),
  Clock: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </SvgIcon>
  ),
  User: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6 -6h4a6 6 0 0 1 6 6v1" />
    </SvgIcon>
  ),
  Users: (p) => (
    <SvgIcon {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21v-1a5 5 0 0 1 5 -5h2a5 5 0 0 1 5 5v1" />
      <path d="M16 4a3.5 3.5 0 0 1 0 7" />
      <path d="M21 21v-1a5 5 0 0 0 -4 -4.9" />
    </SvgIcon>
  ),
  AlertTriangle: (p) => (
    <SvgIcon {...p}>
      <path d="M10.3 4.7l-8 13.6a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7 -3l-8 -13.6a2 2 0 0 0 -3.4 0z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="17" r=".5" fill="currentColor" />
    </SvgIcon>
  ),
  Info: (p) => (
    <SvgIcon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r=".5" fill="currentColor" />
    </SvgIcon>
  ),
  Refresh: (p) => (
    <SvgIcon {...p}>
      <path d="M20 11a8 8 0 1 0 -3 6.7" />
      <path d="M20 5v6h-6" />
    </SvgIcon>
  ),
  Layers: (p) => (
    <SvgIcon {...p}>
      <path d="M12 3l9 5l-9 5l-9 -5z" />
      <path d="M3 13l9 5l9 -5" />
    </SvgIcon>
  ),
  Filter: (p) => (
    <SvgIcon {...p}>
      <path d="M4 4h16l-6 8v6l-4 2v-8z" />
    </SvgIcon>
  ),
  Sparkle: (p) => (
    <SvgIcon {...p}>
      <path d="M12 3l1.7 5.3l5.3 1.7l-5.3 1.7l-1.7 5.3l-1.7 -5.3l-5.3 -1.7l5.3 -1.7z" />
    </SvgIcon>
  ),
  Code: (p) => (
    <SvgIcon {...p}>
      <path d="M8 8l-4 4l4 4" />
      <path d="M16 8l4 4l-4 4" />
      <path d="M14 4l-4 16" />
    </SvgIcon>
  )
};

window.Icon = Icon;
window.SvgIcon = SvgIcon;

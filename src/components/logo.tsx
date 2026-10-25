export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M9 23 16 8l7 15" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18.5h8" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">ADL</span>
    </span>
  );
}

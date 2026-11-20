/** App mark: a doorway with a presence dot. */
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="18" fill="var(--mine)" />
      <path
        d="M22 50V22a10 10 0 0 1 20 0v28"
        fill="none"
        stroke="var(--mine-ink)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="37" cy="37" r="3.6" fill="var(--in)" />
    </svg>
  );
}

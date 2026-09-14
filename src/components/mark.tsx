export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M5 31V9L20 24 35 9v22"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="miter"
      />
      <path
        d="M13 31V20l7 7 7-7v11"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

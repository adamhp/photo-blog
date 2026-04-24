export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="flex items-center justify-center gap-3 px-6 py-8 font-mono text-[12px] text-mist">
      <span>© {year} Adam Pearce</span>
      <span aria-hidden>·</span>
      <a
        href="https://www.instagram.com/_adamhp/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram (@_adamhp)"
        className="hover:text-ink transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </a>
    </footer>
  );
}

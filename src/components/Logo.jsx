// Arghya brand mark — a drop descending into an offering vessel ("arghya" is a
// reverent offering). Drawn with currentColor so it adapts to the gold badge, a
// red panel, or a dark surface without per-context assets.

export function LogoMark({ size = 20, className = "", title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 3c2.2 2.8 3.5 4.6 3.5 6.2a3.5 3.5 0 1 1-7 0C8.5 7.6 9.8 5.8 12 3Z"
        fill="currentColor"
      />
      <path d="M4 14.5a8 8 0 0 1 16 0Z" fill="currentColor" />
    </svg>
  );
}

export default function Logo({
  className = "",
  badgeClassName = "w-9 h-9 bg-[#E0A11C] text-[#231A16]",
  markSize = 20,
  text = "Arghya",
  textClassName = "font-display text-xl font-semibold tracking-tight",
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className={`rounded-full flex items-center justify-center shrink-0 ${badgeClassName}`}>
        <LogoMark size={markSize} />
      </span>
      {text ? <span className={textClassName}>{text}</span> : null}
    </span>
  );
}

import { cn } from "@/lib/utils";

// ─── MTB Monogram paths (80×28 coordinate space) ──────────────────────────────
// M — geometric pointed-V letterform
const PATH_M =
  "M 0,28 L 0,0 L 4.5,0 L 12.5,11 L 20.5,0 L 25,0 L 25,28 L 20.5,28 L 20.5,6 L 12.5,16 L 4.5,6 L 4.5,28 Z";
// T — full crossbar + centered stem
const PATH_T =
  "M 32,0 L 54,0 L 54,4.5 L 45.25,4.5 L 45.25,28 L 40.75,28 L 40.75,4.5 L 32,4.5 Z";
// B — vertical stem
const PATH_B_STEM = "M 61,0 L 61,28 L 65.5,28 L 65.5,0 Z";
// B — top bowl ring (evenodd outer D minus inner counter)
const PATH_B_TOP =
  "M 65.5,0 A 13,6.75 0 0 1 65.5,13.5 Z M 65.5,3 A 9.5,3.75 0 0 1 65.5,11 Z";
// B — bottom bowl ring (slightly wider for visual weight balance)
const PATH_B_BOT =
  "M 65.5,14.5 A 14,6.75 0 0 1 65.5,28 Z M 65.5,17.5 A 10,3.75 0 0 1 65.5,25 Z";

// ─── Monogram SVG ─────────────────────────────────────────────────────────────
function MtbMonogram({
  color = "#D4AF37",
  width,
  height,
}: {
  color?: string;
  width: number;
  height: number;
}) {
  return (
    <svg
      viewBox="0 0 80 28"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill={color}
    >
      <path d={PATH_M} />
      <path d={PATH_T} />
      <path d={PATH_B_STEM} />
      <path fillRule="evenodd" d={PATH_B_TOP} />
      <path fillRule="evenodd" d={PATH_B_BOT} />
    </svg>
  );
}

// ─── App Icon SVG (square icon mark) ─────────────────────────────────────────
function MtbIconMark({
  size,
  bgColor = "#0B0B0B",
  markColor = "#D4AF37",
}: {
  size: number;
  bgColor?: string;
  markColor?: string;
}) {
  const radius = Math.round(size * 0.22);
  // Monogram is 80×28 units; we scale to 75% of icon width
  const monoW = size * 0.75;
  const monoH = (monoW / 80) * 28;
  const monoX = (size - monoW) / 2;
  const monoY = (size - monoH) / 2;
  const scale = monoW / 80;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background */}
      <rect width={size} height={size} rx={radius} fill={bgColor} />
      {/* Subtle border */}
      <rect
        width={size}
        height={size}
        rx={radius}
        fill="none"
        stroke={markColor}
        strokeWidth={size * 0.004}
        opacity={0.2}
      />
      {/* MTB monogram */}
      <g
        transform={`translate(${monoX.toFixed(1)}, ${monoY.toFixed(1)}) scale(${scale.toFixed(4)})`}
        fill={markColor}
      >
        <path d={PATH_M} />
        <path d={PATH_T} />
        <path d={PATH_B_STEM} />
        <path fillRule="evenodd" d={PATH_B_TOP} />
        <path fillRule="evenodd" d={PATH_B_BOT} />
      </g>
    </svg>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

interface MtbLogoProps {
  /** Rendered size of the icon mark in pixels. */
  size?: number;
  /** Show the "Merced / TRADING BOT" wordmark beside the icon. */
  showWordmark?: boolean;
  /** Color scheme for the icon mark. */
  scheme?: "gold-on-dark" | "gold-on-transparent" | "dark-on-light";
  /** Override mark/text color (gold by default). */
  markColor?: string;
  /** Override background color of the icon square. */
  bgColor?: string;
  /** Override wordmark text color. */
  wordmarkColor?: string;
  className?: string;
}

/**
 * MTB brand logo component.
 *
 * Usage:
 *   <MtbLogo size={40} showWordmark />            — sidebar, nav
 *   <MtbLogo size={56} />                          — auth pages (icon only)
 *   <MtbLogo size={36} showWordmark scheme="gold-on-transparent" /> — overlays
 */
export function MtbLogo({
  size = 40,
  showWordmark = false,
  scheme = "gold-on-dark",
  markColor,
  bgColor,
  wordmarkColor,
  className,
}: MtbLogoProps) {
  const resolvedMark =
    markColor ??
    (scheme === "dark-on-light" ? "#0B0B0B" : "#D4AF37");
  const resolvedBg =
    bgColor ??
    (scheme === "gold-on-transparent" ? "transparent" : "#0B0B0B");
  const resolvedWordmark =
    wordmarkColor ??
    (scheme === "dark-on-light" ? "#0B0B0B" : "#FFFFFF");

  return (
    <div className={cn("flex items-center gap-3 shrink-0", className)}>
      {/* Icon mark */}
      {scheme === "gold-on-transparent" ? (
        // Monogram only — no square background
        <MtbMonogram
          color={resolvedMark}
          width={size}
          height={Math.round((size / 80) * 28)}
        />
      ) : (
        <MtbIconMark
          size={size}
          bgColor={resolvedBg}
          markColor={resolvedMark}
        />
      )}

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            style={{
              color: resolvedWordmark,
              fontSize: Math.round(size * 0.42),
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontFamily:
                "'Inter', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            Merced
          </span>
          <span
            style={{
              color: resolvedMark,
              fontSize: Math.round(size * 0.21),
              fontWeight: 400,
              letterSpacing: "0.18em",
              lineHeight: 1,
              marginTop: Math.round(size * 0.1),
              textTransform: "uppercase" as const,
              fontFamily:
                "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
            }}
          >
            Trading Bot
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact favicon-sized icon (M letterform only, for very small contexts).
 * Use when MtbLogo is below 24px — the full MTB monogram becomes illegible.
 */
export function MtbFavicon({ size = 32 }: { size?: number }) {
  const r = Math.round(size * 0.22);
  // Scale the M from (0,0)→(25,28) space to fit in size×size with padding
  const padding = size * 0.16;
  const inner = size - padding * 2;
  const scaleX = inner / 25;
  const scaleY = inner / 28;
  const scale = Math.min(scaleX, scaleY);
  const mW = 25 * scale;
  const mH = 28 * scale;
  const tx = (size - mW) / 2;
  const ty = (size - mH) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width={size} height={size} rx={r} fill="#0B0B0B" />
      <g
        transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${scale.toFixed(4)})`}
        fill="#D4AF37"
      >
        <path d="M 0,28 L 0,0 L 4.5,0 L 12.5,11 L 20.5,0 L 25,0 L 25,28 L 20.5,28 L 20.5,6 L 12.5,16 L 4.5,6 L 4.5,28 Z" />
      </g>
    </svg>
  );
}

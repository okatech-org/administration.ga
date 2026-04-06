import { motion } from "motion/react";

interface DynamicFolderIconProps {
  /** Number of documents in the folder (0–3 max visually) */
  count: number;
  /** Icon size in pixels (default 64) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the hover animation is active (useful when parent handles hover) */
  hovered?: boolean;
}

/**
 * Dynamic folder icon inspired by `open-folder.svg`.
 * Renders 0–3 document sheets inside the folder based on the `count` prop.
 */
export function DynamicFolderIcon({
  count,
  size = 64,
  className = "",
  hovered = false,
}: DynamicFolderIconProps) {
  const sheets = Math.min(Math.max(count, 0), 3);

  // Each sheet config: x, y, width, height, rotation, fill
  const sheetConfigs = [
    {
      // Sheet 1 — back-left, slightly rotated
      x: 62,
      y: 148,
      w: 300,
      h: 200,
      rx: 15,
      rotate: -3,
      fill: "#ffeac5",
      hoverY: -18,
    },
    {
      // Sheet 2 — center
      x: 42,
      y: 168,
      w: 300,
      h: 200,
      rx: 15,
      rotate: 0,
      fill: "#fff7e6",
      hoverY: -14,
    },
    {
      // Sheet 3 — front-right, slightly rotated
      x: 52,
      y: 158,
      w: 290,
      h: 195,
      rx: 15,
      rotate: 3,
      fill: "#ffffff",
      hoverY: -22,
    },
  ];

  // Select which sheets to show based on count
  const visibleSheets =
    sheets === 0 ? []
    : sheets === 1 ?
      [sheetConfigs[1]] // center sheet only
    : sheets === 2 ?
      [sheetConfigs[0], sheetConfigs[1]] // back + center
    : [sheetConfigs[0], sheetConfigs[1], sheetConfigs[2]]; // all three

  return (
    <motion.svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Back folder body */}
      <path
        d="m214.2 107-40.2-29.9c-9.5-7-20.9-10.8-32.7-10.8h-110.2c-16.6 0-30 13.4-30 30v349.5h404.1c15.2 0 27.4-12.3 27.4-27.4v-270.6c0-16.6-13.4-30-30-30h-155.6c-11.8 0-23.3-3.8-32.8-10.8z"
        fill="#f6c012"
      />

      {/* Document sheets — dynamic */}
      {visibleSheets.map((sheet, i) => (
        <motion.rect
          key={`sheet-${i}`}
          x={sheet.x}
          y={sheet.y}
          width={sheet.w}
          height={sheet.h}
          rx={sheet.rx}
          fill={sheet.fill}
          style={{
            transformOrigin: `${sheet.x + sheet.w / 2}px ${sheet.y + sheet.h}px`,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: hovered ? sheet.hoverY : 0,
            rotate: sheet.rotate + (hovered ? sheet.rotate * 0.5 : 0),
          }}
          transition={{
            opacity: { duration: 0.3, delay: i * 0.08 },
            y: { type: "spring", stiffness: 300, damping: 20 },
            rotate: { type: "spring", stiffness: 300, damping: 20 },
          }}
        />
      ))}

      {/* Front folder face */}
      <path
        d="m85.2 220.1-84.1 225.6h410.8c12.5 0 23.7-7.8 28.1-19.5l69-185.2c7.3-19.6-7.2-40.5-28.1-40.5h-367.6c-12.5.1-23.7 7.8-28.1 19.6z"
        fill="#fbd87c"
      />
    </motion.svg>
  );
}

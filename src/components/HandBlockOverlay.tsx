import type { HandBlock } from "@/lib/types";

export function HandBlockOverlay({ block }: { block: HandBlock }) {
  if (!block.enabled) {
    return null;
  }

  return (
    <div
      className="hand-block"
      style={{
        left: `${block.x}%`,
        top: `${block.y}%`,
        width: `${block.width}%`,
        height: `${block.height}%`
      }}
      aria-label="Hidden hand information"
    />
  );
}

import type { HandBlock } from "@/lib/types";

export function HandBlockOverlay({ blocks }: { blocks: HandBlock[] }) {
  const enabledBlocks = blocks.filter((block) => block.enabled);

  if (enabledBlocks.length === 0) {
    return null;
  }

  return (
    <>
      {enabledBlocks.map((block, index) => (
        <div
          key={`${block.x}-${block.y}-${block.width}-${block.height}-${index}`}
          className="hand-block"
          style={{
            left: `${block.x}%`,
            top: `${block.y}%`,
            width: `${block.width}%`,
            height: `${block.height}%`
          }}
          aria-label={index === 0 ? "Hidden hand information" : `Hidden hand information ${index + 1}`}
        />
      ))}
    </>
  );
}

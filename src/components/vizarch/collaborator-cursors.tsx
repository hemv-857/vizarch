"use client";

import { useCollaboration } from "@/hooks/use-collaboration";

// Remote cursors overlay: renders colored cursor indicators for each connected collaborator
// who has an active cursor position. Positioned relative to the canvas wrap.
export function CollaboratorCursors({ wrapRef }: { wrapRef: React.RefObject<HTMLDivElement | null> }) {
  const { collaborators, connected } = useCollaboration();

  if (!connected || collaborators.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {collaborators.map((c) => {
        if (!c.cursor) return null;
        // Convert SVG coords to screen coords relative to the wrap
        // The SVG is centered, then translated by panX/panY, then scaled by zoom
        // For simplicity, we treat cursor.x/y as screen coords (the sender sends screen coords)
        return (
          <div
            key={c.id}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: c.cursor.x,
              top: c.cursor.y,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="drop-shadow-sm"
            >
              <path
                d="M4 2 L4 16 L8 12 L11 18 L13 17 L10 11 L16 11 Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            {/* Name label */}
            <div
              className="absolute left-3 top-3 px-1.5 py-0.5 rounded text-[9px] text-white font-medium whitespace-nowrap shadow-sm"
              style={{ background: c.color }}
            >
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { PathNode, type PathNodeState } from "./path-node";
import { pathNodeElementId } from "./path-node-element-id";

export type PathTrailNode = {
  id: string;
  title: string;
  visibleLabel?: string;
  state: PathNodeState;
};

export type PathTrailProps = {
  nodes: PathTrailNode[];
  currentNodeId?: string;
  onSelect: (node: PathTrailNode) => void;
  showStartHereTooltip?: boolean;
  startHereText?: string;
  className?: string;
};

const TRAIL_WIDTH_PX = 240;
// Node (72) + 4px gap + two 14px label lines = 104; the rest keeps the next node's
// "Start here" tooltip (43px tall with its offset) clear of the label above it.
const ROW_HEIGHT_PX = 148;
const NODE_SIZE_PX = 72;
// Headroom so the first node's tooltip is not painted under the sticky family header.
const TRAIL_TOP_PADDING_PX = 32;
const LABEL_WIDTH_PX = 120;
const LABEL_GAP_PX = 4;
const WAVE_AMPLITUDE_PX = 48;

function nodeXOffset(index: number) {
  return Math.round(Math.sin((index * Math.PI) / 2) * WAVE_AMPLITUDE_PX);
}

export function PathTrail({
  nodes,
  currentNodeId,
  onSelect,
  showStartHereTooltip = true,
  startHereText = "Start here",
  className = "",
}: PathTrailProps) {
  const trailHeightPx = TRAIL_TOP_PADDING_PX + nodes.length * ROW_HEIGHT_PX;
  const currentIndex = nodes.findIndex((node) => node.id === currentNodeId);
  const centerX = TRAIL_WIDTH_PX / 2;
  const centerYForRow = (index: number) => TRAIL_TOP_PADDING_PX + index * ROW_HEIGHT_PX + NODE_SIZE_PX / 2;

  return (
    <div className={`relative mx-auto ${className}`} style={{ width: TRAIL_WIDTH_PX, height: trailHeightPx }}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        width={TRAIL_WIDTH_PX}
        height={trailHeightPx}
        viewBox={`0 0 ${TRAIL_WIDTH_PX} ${trailHeightPx}`}
      >
        {nodes.slice(0, -1).map((node, index) => {
          const segmentLit = currentIndex === -1 ? false : index < currentIndex;
          return (
            <line
              key={`${node.id}-segment`}
              x1={centerX + nodeXOffset(index)}
              y1={centerYForRow(index)}
              x2={centerX + nodeXOffset(index + 1)}
              y2={centerYForRow(index + 1)}
              stroke={segmentLit ? "var(--color-primary-text)" : "var(--color-border)"}
              strokeWidth={segmentLit ? 3 : 2}
              strokeLinecap="round"
              strokeDasharray={segmentLit ? undefined : "2 8"}
            />
          );
        })}
      </svg>

      {nodes.map((node, index) => {
        const isCurrent = node.id === currentNodeId;
        return (
          <div
            key={node.id}
            className="absolute flex items-center justify-center"
            style={{
              width: NODE_SIZE_PX,
              height: NODE_SIZE_PX,
              left: centerX + nodeXOffset(index) - NODE_SIZE_PX / 2,
              top: centerYForRow(index) - NODE_SIZE_PX / 2,
            }}
          >
            <PathNode
              id={pathNodeElementId(node.id)}
              state={node.state}
              isCurrent={isCurrent}
              label={node.title}
              tooltip={isCurrent && showStartHereTooltip ? startHereText : undefined}
              onClick={() => onSelect(node)}
              sizePx={NODE_SIZE_PX}
            />
            <span
              aria-hidden
              className={`pointer-events-none absolute left-1/2 line-clamp-2 -translate-x-1/2 rounded-md bg-canvas px-1 text-center text-[12px] font-medium leading-[14px] ${
                node.state === "locked" ? "text-disabled" : "text-text-secondary"
              }`}
              style={{ top: NODE_SIZE_PX + LABEL_GAP_PX, width: "max-content", maxWidth: LABEL_WIDTH_PX }}
            >
              {node.visibleLabel ?? node.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}

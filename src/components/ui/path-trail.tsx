"use client";

import { PathNode, type PathNodeState } from "./path-node";

export type PathTrailNode = {
  id: string;
  title: string;
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
const ROW_HEIGHT_PX = 108;
const NODE_SIZE_PX = 72;
const WAVE_AMPLITUDE_PX = 48;

export function pathNodeElementId(nodeId: string) {
  return `path-node-${nodeId}`;
}

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
  const trailHeightPx = nodes.length * ROW_HEIGHT_PX;
  const currentIndex = nodes.findIndex((node) => node.id === currentNodeId);
  const centerX = TRAIL_WIDTH_PX / 2;
  const centerYForRow = (index: number) => index * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;

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
              stroke={segmentLit ? "var(--color-primary)" : "var(--color-border-strong)"}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={segmentLit ? undefined : "2 10"}
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
          </div>
        );
      })}
    </div>
  );
}

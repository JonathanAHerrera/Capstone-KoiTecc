"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FamilyHeader } from "@/components/ui/family-header";
import { JumpToCurrentButton } from "@/components/ui/jump-to-current-button";
import { pathNodeElementId } from "@/components/ui/path-node-element-id";
import { PathTrail, type PathTrailNode } from "@/components/ui/path-trail";
import type { PathFamilyViewModel, PathNodeViewModel } from "./build-path-view-model";
import { PracticePreviewSheet } from "./practice-preview-sheet";

export type PathFamiliesProps = {
  families: PathFamilyViewModel[];
  currentPracticeId: string | null;
};

export function PathFamilies({ families, currentPracticeId }: PathFamiliesProps) {
  const router = useRouter();
  const [previewNode, setPreviewNode] = useState<PathNodeViewModel | null>(null);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);

  const nodesById = useMemo(
    () => new Map(families.flatMap((family) => family.nodes).map((node) => [node.id, node])),
    [families],
  );

  const trailNodesByFamilyCode = useMemo(
    () =>
      new Map(
        families.map((family): [string, PathTrailNode[]] => [
          family.code,
          // The visible label is the short title only, so the aria-label (built from title) carries the ID too.
          family.nodes.map((node) => ({
            id: node.id,
            title: `${node.id} · ${node.title}`,
            visibleLabel: node.title,
            state: node.nodeState,
          })),
        ]),
      ),
    [families],
  );

  const handleNodeSelect = useCallback(
    (trailNode: PathTrailNode) => {
      if (trailNode.id === currentPracticeId) {
        router.push(`/practice/${trailNode.id}`);
        return;
      }
      const selectedNode = nodesById.get(trailNode.id);
      if (!selectedNode) return;
      setPreviewNode(selectedNode);
      setPreviewSheetOpen(true);
    },
    [currentPracticeId, nodesById, router],
  );

  const closePreviewSheet = useCallback(() => setPreviewSheetOpen(false), []);

  return (
    <>
      <div className="flex flex-col gap-6">
        {families.map((family) => (
          // Each family is its own <section> so the next sticky header pushes the previous one out instead of stacking.
          <section key={family.code} aria-label={`${family.name} requirements`} className="flex flex-col gap-4">
            <FamilyHeader
              familyCode={family.code}
              familyName={family.name}
              completedCount={family.completedCount}
              totalCount={family.totalCount}
              accentIndex={family.accentIndex}
              locked={family.everyNodeLocked}
            />
            <PathTrail
              nodes={trailNodesByFamilyCode.get(family.code) ?? []}
              currentNodeId={currentPracticeId ?? undefined}
              onSelect={handleNodeSelect}
              startHereText="Start here"
            />
          </section>
        ))}
      </div>

      <PracticePreviewSheet node={previewNode} open={previewSheetOpen} onClose={closePreviewSheet} />

      {currentPracticeId ? <JumpToCurrentButton targetElementId={pathNodeElementId(currentPracticeId)} /> : null}
    </>
  );
}

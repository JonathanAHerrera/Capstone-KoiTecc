"use client";

import { useState, type ReactNode } from "react";
import { Building2, CircleCheck, CircleAlert, Cloud, HelpCircle, Laptop, PartyPopper, Target, Trophy } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { fireCelebrationConfetti } from "@/components/ui/confetti";
import { FamilyHeader } from "@/components/ui/family-header";
import { JumpToCurrentButton } from "@/components/ui/jump-to-current-button";
import { PathNode, type PathNodeState } from "@/components/ui/path-node";
import { PathTrail, pathNodeElementId, type PathTrailNode } from "@/components/ui/path-trail";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { QuestionCard } from "@/components/ui/question-card";
import { ReviewVerdictCard } from "@/components/ui/review-verdict-card";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip, type PracticeStatus } from "@/components/ui/status-chip";
import { useToast } from "@/components/ui/use-toast";
import { EvidenceCard } from "@/components/evidence/evidence-card";
import { EvidencePicker, type EvidencePickerReadyFile } from "@/components/evidence/evidence-picker";

const PATH_NODE_STATES: PathNodeState[] = ["locked", "available", "in_progress", "under_review", "needs_work", "accepted"];
const STATUS_CHIP_STATES: PracticeStatus[] = ["not_started", "in_progress", "under_review", "needs_work", "accepted", "not_applicable"];

const ACCESS_CONTROL_NODES: PathTrailNode[] = [
  { id: "AC.L1-b.1.i", title: "Limit who can log in", state: "accepted" },
  { id: "AC.L1-b.1.ii", title: "Limit what each person can do", state: "accepted" },
  { id: "AC.L1-b.1.iii", title: "Control outside connections", state: "needs_work" },
  { id: "AC.L1-b.1.iv", title: "Control what goes public", state: "available" },
];

const AWARENESS_TRAINING_NODES: PathTrailNode[] = [
  { id: "AT.L2-3.2.1", title: "Train everyone on security risks", state: "under_review" },
  { id: "AT.L2-3.2.2", title: "Train people for their role", state: "in_progress" },
  { id: "AT.L2-3.2.3", title: "Spot insider threats", state: "locked" },
  { id: "IA.L1-b.1.v", title: "Identify every user", state: "locked" },
];

const ONBOARDING_ANSWERS = [
  { id: "cloud", label: "Everything is in the cloud", description: "Microsoft 365, Google Workspace…", icon: <Cloud /> },
  { id: "onprem", label: "We run our own servers", description: "On-site hardware", icon: <Building2 /> },
  { id: "mixed", label: "A mix of both", icon: <Laptop /> },
  { id: "unsure", label: "Not sure", icon: <HelpCircle /> },
];

function ShowcaseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="caption border-b-2 border-border pb-2 text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignShowcasePage() {
  const { showToast } = useToast();
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedPathNode, setSelectedPathNode] = useState<PathTrailNode | null>(null);
  const [progressCompleted, setProgressCompleted] = useState(42);
  const [popDemoState, setPopDemoState] = useState<PathNodeState>("available");
  const [readyFiles, setReadyFiles] = useState<EvidencePickerReadyFile[]>([]);

  const handlePathNodeSelect = (node: PathTrailNode) => {
    setSelectedPathNode(node);
    setBottomSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-10 px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header>
        <p className="caption text-primary">Design system</p>
        <h1 className="text-2xl">CMMC Ready primitives</h1>
        <p className="mt-1 text-muted">Every component in every state. Dev-only QA page.</p>
      </header>

      <ShowcaseSection title="BigButton">
        <div className="flex flex-col gap-3">
          <BigButton fullWidth>Primary</BigButton>
          <BigButton fullWidth variant="success" icon={<CircleCheck />}>
            Success with icon
          </BigButton>
          <BigButton fullWidth variant="danger">
            Danger
          </BigButton>
          <BigButton fullWidth variant="secondary">
            Secondary
          </BigButton>
          <BigButton fullWidth variant="ghost">
            Ghost
          </BigButton>
          <BigButton fullWidth disabled>
            Disabled
          </BigButton>
          <BigButton fullWidth loading>
            Loading
          </BigButton>
          <div className="flex flex-wrap gap-3">
            <BigButton size="compact">Compact</BigButton>
            <BigButton size="compact" variant="secondary" href="/design#top">
              As link
            </BigButton>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="ProgressBar + ProgressRing">
        <ProgressBar completed={progressCompleted} total={110} showCountLabel label="Level 2 progress" />
        <ProgressBar completed={3} total={3} heightPx={8} fillColor="var(--color-success)" label="Family progress" />
        <div className="flex flex-wrap items-center gap-6">
          <ProgressRing fraction={progressCompleted / 110} label="Met">
            <span className="tabular-nums text-xl font-black text-ink">{Math.round((progressCompleted / 110) * 100)}%</span>
          </ProgressRing>
          <ProgressRing fraction={0.13} sizePx={72} strokeWidthPx={8} fillColor="var(--color-warning)" label="Needs work">
            <CircleAlert className="size-6 text-warning-ink" aria-hidden />
          </ProgressRing>
          <ProgressRing fraction={1} sizePx={56} strokeWidthPx={6} fillColor="var(--color-success)" label="Done">
            <CircleCheck className="size-5 text-success-ink" aria-hidden />
          </ProgressRing>
          <BigButton size="compact" variant="secondary" onClick={() => setProgressCompleted((current) => (current >= 110 ? 12 : current + 17))}>
            Bump progress
          </BigButton>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="StatusChip">
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIP_STATES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIP_STATES.map((status) => (
            <StatusChip key={status} status={status} size="small" />
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="PathNode">
        <div className="flex flex-wrap items-end gap-5 pt-10">
          {PATH_NODE_STATES.map((state) => (
            <div key={state} className="flex flex-col items-center gap-2">
              <PathNode state={state} label={state} tooltip={state === "available" ? "Start here" : undefined} isCurrent={state === "available"} />
              <span className="caption text-muted">{state.replace("_", " ")}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <PathNode state={popDemoState} label="Pop demo" onClick={() => setPopDemoState((current) => (current === "accepted" ? "available" : "accepted"))} />
            <span className="caption text-muted">tap to accept</span>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="FamilyHeader + PathTrail">
        <div className="flex flex-col gap-4">
          <FamilyHeader
            familyCode="AC"
            familyName="Access Control"
            description="Who can get to the systems and data that touch CUI, and what they can do once inside."
            completedCount={2}
            totalCount={4}
            accentIndex={0}
            onGuideClick={() => showToast({ message: "Guide opens here", tone: "info" })}
          />
          <PathTrail nodes={ACCESS_CONTROL_NODES} currentNodeId="AC.L1-b.1.iv" onSelect={handlePathNodeSelect} />
          <FamilyHeader familyCode="AT" familyName="Awareness & Training" completedCount={0} totalCount={4} accentIndex={1} />
          <PathTrail nodes={AWARENESS_TRAINING_NODES} onSelect={handlePathNodeSelect} />
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5].map((accentIndex) => (
              <FamilyHeader
                key={accentIndex}
                sticky={false}
                familyCode={`F${accentIndex + 1}`}
                familyName="Accent"
                completedCount={accentIndex}
                totalCount={6}
                accentIndex={accentIndex}
                locked={accentIndex === 5}
                className="min-w-[140px] flex-1"
              />
            ))}
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="SpeechBubble + QuestionCard">
        <SpeechBubble>
          Where does your company <strong>keep its files</strong>?
        </SpeechBubble>
        <div role="radiogroup" aria-label="IT setup" className="flex flex-col gap-3">
          {ONBOARDING_ANSWERS.map((answer, answerIndex) => (
            <QuestionCard
              key={answer.id}
              label={answer.label}
              description={answer.description}
              icon={answer.icon}
              letterKey={String.fromCharCode(65 + answerIndex)}
              selected={selectedAnswerId === answer.id}
              onSelect={() => setSelectedAnswerId(answer.id)}
            />
          ))}
          <QuestionCard label="Disabled option" selected={false} onSelect={() => undefined} disabled />
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="StatTile">
        <div className="grid grid-cols-3 gap-3">
          <StatTile value={87} label="Met" icon={<CircleCheck />} accentColor="var(--color-success-ink)" />
          <StatTile value={14} label="Open" icon={<Target />} accentColor="var(--color-warning-ink)" />
          <StatTile value={-32} label="SPRS est." icon={<Trophy />} />
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="ReviewVerdictCard">
        <ReviewVerdictCard
          verdict="accepted"
          summary="Your screenshot shows MFA enforced for all 8 users in the Microsoft 365 admin center, and the note explains who approves new accounts."
          objectiveFindings={[
            { objective: "Authorized users are identified", met: true, note: "User list visible with names and roles." },
            { objective: "Access is limited to authorized users", met: true, note: "MFA policy applies to all accounts." },
          ]}
          missingItems={[]}
          nextSteps={["Re-check this list whenever someone joins or leaves."]}
        />
        <ReviewVerdictCard
          verdict="needs_work"
          isMock
          summary="The screenshot is a good start, but it cuts off before the full user list and nothing shows how contractors are handled."
          objectiveFindings={[
            { objective: "Authorized users are identified", met: true, note: "Partial list visible." },
            { objective: "Processes acting on behalf of users are identified", met: false, note: "No service accounts shown." },
            { objective: "Access is limited to authorized users", met: false, note: "No evidence of removal for departed staff." },
          ]}
          missingItems={["A screenshot of the complete user list, including service accounts.", "A short note on how contractor accounts are removed."]}
          nextSteps={["Scroll the admin page so every user is visible, then retake the screenshot.", "Add one sentence about offboarding to your note."]}
        />
      </ShowcaseSection>

      <ShowcaseSection title="EvidenceCard">
        <EvidenceCard
          file={{ id: "1", name: "m365-users.png", sizeBytes: 482_000, kind: "screenshot", mimeType: "image/png", previewUrl: "/next.svg" }}
          onDelete={() => showToast({ message: "Deleted (demo)", tone: "info" })}
        />
        <EvidenceCard
          file={{ id: "2", name: "access-control-policy-final-v3.pdf", sizeBytes: 1_320_000, kind: "document", mimeType: "application/pdf" }}
          status="uploading"
          uploadPercent={62}
          onDelete={() => undefined}
        />
        <EvidenceCard
          file={{ id: "3", name: "server-room-walkthrough.mov", sizeBytes: 48_000_000, kind: "video", mimeType: "video/quicktime" }}
          status="error"
          errorMessage="Video is over 100MB"
          onDelete={() => undefined}
        />
        <EvidenceCard
          file={{ id: "4", name: "deleting.txt", sizeBytes: 900, kind: "text", mimeType: "text/plain" }}
          deleting
          onDelete={() => undefined}
        />
      </ShowcaseSection>

      <ShowcaseSection title="EvidencePicker">
        <EvidencePicker onFilesReady={(files) => setReadyFiles((current) => [...current, ...files])} />
        {readyFiles.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm font-medium text-muted">
            {readyFiles.map(({ file, kind }, fileIndex) => (
              <li key={fileIndex}>
                {kind} · {file.name} · {Math.round(file.size / 1024)} KB
              </li>
            ))}
          </ul>
        ) : null}
        <p className="caption text-muted">Documents only:</p>
        <EvidencePicker allowedKinds={["document"]} onFilesReady={() => undefined} />
      </ShowcaseSection>

      <ShowcaseSection title="Toast, BottomSheet, Confetti">
        <div className="flex flex-col gap-3">
          <BigButton variant="secondary" fullWidth onClick={() => showToast({ message: "Also satisfied: AC.L2-3.1.3", tone: "success", actionLabel: "View" })}>
            Show toast
          </BigButton>
          <BigButton variant="secondary" fullWidth onClick={() => showToast({ message: "Something went wrong", tone: "danger" })}>
            Show danger toast
          </BigButton>
          <BigButton variant="secondary" fullWidth onClick={() => setBottomSheetOpen(true)}>
            Open bottom sheet
          </BigButton>
          <BigButton variant="success" fullWidth icon={<PartyPopper />} onClick={() => void fireCelebrationConfetti({ intensity: "family" })}>
            Family confetti
          </BigButton>
          <BigButton fullWidth icon={<Trophy />} onClick={() => void fireCelebrationConfetti({ intensity: "complete" })}>
            100% confetti
          </BigButton>
        </div>
      </ShowcaseSection>

      <BottomSheet open={bottomSheetOpen} onClose={() => setBottomSheetOpen(false)} title={selectedPathNode?.title ?? "Bottom sheet"}>
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-muted">
            {selectedPathNode ? `${selectedPathNode.id} · ` : ""}
            Only approved people and devices can use systems that touch CUI.
          </p>
          {selectedPathNode ? (
            <StatusChip status={selectedPathNode.state === "available" || selectedPathNode.state === "locked" ? "not_started" : selectedPathNode.state} />
          ) : null}
          <BigButton fullWidth onClick={() => setBottomSheetOpen(false)}>
            Start
          </BigButton>
        </div>
      </BottomSheet>

      <JumpToCurrentButton targetElementId={pathNodeElementId("AC.L1-b.1.iv")} bottomOffsetPx={104} />

      <BottomActionBar>
        <BigButton fullWidth disabled={!selectedAnswerId}>
          Continue
        </BigButton>
      </BottomActionBar>
    </div>
  );
}

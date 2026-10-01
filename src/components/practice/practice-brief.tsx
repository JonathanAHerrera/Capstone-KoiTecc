import { BookOpenText, Bot, Camera, FileText, Monitor, PenLine, TriangleAlert, Video, type LucideIcon } from "lucide-react";
import { CollapsibleSection } from "@/components/practice/collapsible-section";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import type { AiVerifiability, EvidenceKind, Practice } from "@/lib/practice-types";

const EVIDENCE_KIND_ICON: Record<EvidenceKind, LucideIcon> = {
  photo: Camera,
  screenshot: Monitor,
  document: FileText,
  video: Video,
  text: PenLine,
};

const EVIDENCE_KIND_WORD_PATTERN: Record<EvidenceKind, RegExp> = {
  photo: /\bphoto/i,
  screenshot: /\bscreen(shot| capture| recording)?|\bscreenshot/i,
  document: /\b(document|spreadsheet|pdf|list|policy|log|form|export|report|checklist|invoice|contract)/i,
  video: /\bvideo|\bclip|\bwalkthrough/i,
  text: /\bwritten|\bdescribe|\bnote/i,
};

const AI_VERIFIABILITY_BADGE: Record<AiVerifiability, { label: string; className: string }> = {
  full: { label: "AI can fully check this", className: "border-success/40 bg-success-pale text-success-ink" },
  partial: {
    label: "AI can pre-check this — an assessor may still interview or test",
    className: "border-info/30 bg-info-pale text-info-ink",
  },
  none: {
    label: "AI can only give guidance here — an assessor will interview or test",
    className: "border-border bg-canvas text-muted",
  },
};

const OBJECTIVE_LETTER_PATTERN = /^\s*\[([a-z])\]\s*/i;

function pickEvidenceExampleIcon(example: string, evidenceTypes: EvidenceKind[]): LucideIcon {
  const matchingKind = evidenceTypes.find((kind) => EVIDENCE_KIND_WORD_PATTERN[kind].test(example));
  return EVIDENCE_KIND_ICON[matchingKind ?? evidenceTypes[0] ?? "document"];
}

function splitObjectiveLetter(objective: string): { letter: string | null; text: string } {
  const match = OBJECTIVE_LETTER_PATTERN.exec(objective);
  if (!match) return { letter: null, text: objective };
  return { letter: match[1], text: objective.slice(match[0].length) };
}

export function PracticeBrief({ practice }: { practice: Practice }) {
  const aiBadge = AI_VERIFIABILITY_BADGE[practice.aiVerifiable];

  return (
    <div className="flex flex-col gap-5">
      <SpeechBubble>{practice.plainEnglish}</SpeechBubble>

      <p className="text-[15px] font-medium leading-relaxed text-text">
        <span className="font-extrabold text-ink">Why it matters: </span>
        {practice.whyItMatters}
      </p>

      <p
        className={`inline-flex items-start gap-2 self-start rounded-card border-2 px-3 py-2 text-[13px] font-bold leading-snug ${aiBadge.className}`}
      >
        <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{aiBadge.label}</span>
      </p>

      <CollapsibleSection title="Official requirement" icon={<BookOpenText />}>
        <blockquote className="border-l-4 border-primary/30 pl-3 text-[15px] font-medium italic leading-relaxed text-text">
          {practice.officialText}
        </blockquote>
        <p className="caption mt-4 mb-2 text-muted">What an assessor checks · NIST SP 800-171 {practice.nist171Ref}</p>
        <ol className="flex flex-col gap-2">
          {practice.assessmentObjectives.map((objective) => {
            const { letter, text } = splitObjectiveLetter(objective);
            return (
              <li key={objective} className="flex gap-2.5 text-[15px] font-medium leading-snug text-text">
                {letter ? (
                  <span
                    className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-pale text-[12px] font-black text-primary"
                    aria-label={`Objective ${letter}`}
                  >
                    {letter}
                  </span>
                ) : null}
                <span className="min-w-0 break-words">{text}</span>
              </li>
            );
          })}
        </ol>
      </CollapsibleSection>

      <section aria-labelledby="what-to-upload-heading">
        <h2 id="what-to-upload-heading" className="text-lg">
          What to upload
        </h2>
        <p className="mt-0.5 text-sm font-medium text-muted">Any one of these is a good start. More is better.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {practice.evidenceExamples.map((example) => {
            const ExampleIcon = pickEvidenceExampleIcon(example, practice.evidenceTypes);
            return (
              <li
                key={example}
                className="flex min-h-14 items-center gap-3 rounded-card border-2 border-border bg-surface px-3 py-2.5 text-[15px] font-medium leading-snug text-text"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-pale text-primary" aria-hidden>
                  <ExampleIcon className="size-5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 break-words">{example}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {practice.commonFailures.length > 0 ? (
        <CollapsibleSection title="Common mistakes" icon={<TriangleAlert />}>
          <ul className="flex flex-col gap-2">
            {practice.commonFailures.map((failure) => (
              <li key={failure} className="flex gap-2.5 text-[15px] font-medium leading-snug text-text">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <span className="min-w-0 break-words">{failure}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}

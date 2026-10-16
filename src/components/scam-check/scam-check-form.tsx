"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, CircleAlert, LifeBuoy, Mail, MessageSquareText, ShieldAlert, TriangleAlert, X } from "lucide-react";
import type { ScamCheckResponse } from "@/app/api/scam-check/route";
import { requestScamHelpAction } from "@/app/scam-check/actions";
import type { ScamRiskLevel, ScamSourceKind } from "@/ai/scam-schema";
import { BigButton } from "@/components/ui/big-button";
import { useToast } from "@/components/ui/use-toast";
import { compressImageForUpload } from "@/lib/client/compress-image";

type SourceOption = { kind: ScamSourceKind; label: string; icon: typeof Mail; placeholder: string };

const SOURCE_OPTIONS: readonly SourceOption[] = [
  {
    kind: "pasted_text",
    label: "Pasted text",
    icon: MessageSquareText,
    placeholder: "Paste the text message, chat, or letter here…",
  },
  {
    kind: "forwarded_email",
    label: "Forwarded email",
    icon: Mail,
    placeholder: "Paste the whole email here, including the From line and subject if you can…",
  },
  { kind: "photo", label: "Photo", icon: Camera, placeholder: "Optional: add any text you can read from the photo…" },
];

const RISK_PRESENTATION: Readonly<
  Record<ScamRiskLevel, { label: string; className: string; icon: typeof ShieldAlert }>
> = {
  high: { label: "High risk", className: "border-danger-edge bg-danger-pale text-danger-ink", icon: ShieldAlert },
  medium: { label: "Medium risk", className: "border-warning-edge bg-warning-pale text-warning-ink", icon: TriangleAlert },
  low: { label: "No red flags found", className: "border-info-edge bg-info-pale text-info-ink", icon: CircleAlert },
};

const LOW_RISK_CAVEAT: Readonly<Record<"en" | "es", string>> = {
  en: "No red flags is not the same as genuine. Confirm through a channel you already trust before acting.",
  es: "Que no haya señales de alerta no significa que sea genuino. Confirme por un canal que ya conozca antes de actuar.",
};

export function ScamCheckForm() {
  const { showToast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [sourceKind, setSourceKind] = useState<ScamSourceKind>("pasted_text");
  const [messageText, setMessageText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [loadingCheckResult, setLoadingCheckResult] = useState(false);
  const [checkResult, setCheckResult] = useState<ScamCheckResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendingHelpRequest, setSendingHelpRequest] = useState(false);
  const [helpRequestSent, setHelpRequestSent] = useState(false);

  const activeOption = SOURCE_OPTIONS.find((option) => option.kind === sourceKind) ?? SOURCE_OPTIONS[0];
  const canSubmit = messageText.trim().length > 0 || photoFile !== null;

  function clearPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const chosenFile = event.target.files?.[0] ?? null;
    if (!chosenFile) return;
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(chosenFile);
    setPhotoPreviewUrl(URL.createObjectURL(chosenFile));
    setSourceKind("photo");
  }

  async function sendCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loadingCheckResult) return;
    setLoadingCheckResult(true);
    setErrorMessage(null);
    setCheckResult(null);
    setHelpRequestSent(false);
    try {
      const formData = new FormData();
      formData.set("sourceKind", sourceKind);
      formData.set("text", messageText);
      if (photoFile) {
        const uploadReadyPhoto = photoFile.type.startsWith("image/")
          ? await compressImageForUpload(photoFile).catch(() => photoFile)
          : photoFile;
        formData.set("photo", uploadReadyPhoto, uploadReadyPhoto.name);
      }
      const response = await fetch("/api/scam-check", { method: "POST", body: formData });
      const payload = (await response.json()) as { result?: ScamCheckResponse; error?: string };
      if (!response.ok || !payload.result) {
        setErrorMessage(payload.error ?? "The check failed. Please try again.");
        return;
      }
      setCheckResult(payload.result);
    } catch {
      setErrorMessage("Could not reach the checker. Check your connection and try again.");
    } finally {
      setLoadingCheckResult(false);
    }
  }

  async function sendHelpRequest() {
    if (!checkResult || sendingHelpRequest) return;
    setSendingHelpRequest(true);
    const result = await requestScamHelpAction({
      sourceKind,
      riskLevel: checkResult.analysis.riskLevel,
      language: checkResult.analysis.language,
      isPaymentChangeOrWire: checkResult.analysis.isPaymentChangeOrWire,
      summary: checkResult.analysis.summary,
      reasons: checkResult.analysis.reasons,
      model: checkResult.model,
      promptVersion: checkResult.promptVersion,
    });
    setSendingHelpRequest(false);
    if (result.ok) {
      setHelpRequestSent(true);
      showToast({ tone: "success", message: "Help request sent to KOITECC." });
    } else {
      showToast({ tone: "danger", message: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={sendCheck} className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="What are you checking?" className="grid grid-cols-3 gap-2">
          {SOURCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.kind === sourceKind;
            return (
              <button
                key={option.kind}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSourceKind(option.kind)}
                className={`focus-outline flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-card border px-2 py-2 text-[13px] font-medium transition-colors ${
                  selected
                    ? "border-primary-edge bg-primary-pale text-primary-text"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-alt"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">The message</span>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder={activeOption.placeholder}
            rows={sourceKind === "photo" ? 3 : 8}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-[88px] rounded-card border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handlePhotoChange}
        />
        {photoFile && photoPreviewUrl ? (
          <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
            {/* Object URL preview; not a static asset, so next/image does not apply. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreviewUrl} alt="" className="size-16 shrink-0 rounded-[10px] object-cover" />
            <p className="min-w-0 flex-1 truncate text-sm text-ink">{photoFile.name}</p>
            <button
              type="button"
              onClick={clearPhoto}
              aria-label="Remove photo"
              className="focus-outline flex size-11 shrink-0 items-center justify-center rounded-[10px] text-text-secondary hover:bg-surface-alt"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        ) : (
          <BigButton
            variant="secondary"
            fullWidth
            icon={<Camera />}
            onClick={() => photoInputRef.current?.click()}
          >
            Take or choose a photo
          </BigButton>
        )}

        <BigButton type="submit" fullWidth loading={loadingCheckResult} disabled={!canSubmit}>
          Check this message
        </BigButton>

        {errorMessage ? (
          <p role="alert" className="rounded-card border border-danger-edge bg-danger-pale px-4 py-3 text-sm text-danger-ink">
            {errorMessage}
          </p>
        ) : null}
      </form>

      {checkResult ? (
        <ScamCheckResultView
          result={checkResult}
          helpRequestSent={helpRequestSent}
          sendingHelpRequest={sendingHelpRequest}
          onRequestHelp={sendHelpRequest}
        />
      ) : null}
    </div>
  );
}

type ScamCheckResultViewProps = {
  result: ScamCheckResponse;
  helpRequestSent: boolean;
  sendingHelpRequest: boolean;
  onRequestHelp: () => void;
};

function ScamCheckResultView({ result, helpRequestSent, sendingHelpRequest, onRequestHelp }: ScamCheckResultViewProps) {
  const { analysis } = result;
  const presentation = RISK_PRESENTATION[analysis.riskLevel];
  const RiskIcon = presentation.icon;
  const forcedStepCount = analysis.isPaymentChangeOrWire ? 2 : 0;

  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <div className={`flex items-start gap-3 rounded-card border p-4 ${presentation.className}`}>
        <RiskIcon className="mt-0.5 size-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">{presentation.label}</p>
          <p className="mt-1 text-sm text-ink">{analysis.summary}</p>
          {analysis.riskLevel === "low" ? (
            <p className="mt-2 text-[13px] text-text-secondary">{LOW_RISK_CAVEAT[analysis.language]}</p>
          ) : null}
        </div>
      </div>

      {analysis.isPaymentChangeOrWire ? (
        <div role="note" className="rounded-card bg-dark-surface px-4 py-4 text-white">
          <p className="caption text-dark-eyebrow">Payment change or wire request</p>
          <p className="mt-1.5 text-sm text-white/85">
            {analysis.language === "es"
              ? "Regla de devolución de llamada: ningún pago cambia de destino hasta que lo confirme por teléfono con un número que ya tenía."
              : "Callback rule: no payment changes destination until you confirm by phone on a number you already had."}
          </p>
        </div>
      ) : null}

      {analysis.reasons.length > 0 ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">{analysis.language === "es" ? "Por qué" : "Why"}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-secondary">
            {analysis.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">{analysis.language === "es" ? "Qué hacer ahora" : "What to do next"}</h2>
        <ol className="mt-2 flex flex-col gap-2 pl-5 text-sm text-ink">
          {analysis.whatToDoNext.map((step, stepIndex) => (
            <li key={step} className={`list-decimal ${stepIndex < forcedStepCount ? "font-semibold" : ""}`}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <BigButton
        variant={analysis.riskLevel === "high" ? "danger" : "secondary"}
        fullWidth
        icon={<LifeBuoy />}
        loading={sendingHelpRequest}
        disabled={helpRequestSent}
        onClick={onRequestHelp}
      >
        {helpRequestSent ? "Help requested" : "Get help from KOITECC"}
      </BigButton>

      <p className="text-[12px] leading-snug text-muted">
        {result.isMock ? "Offline check (no model key set) using fixed rules. " : `Checked by ${result.model} (${result.promptVersion}). `}
        {result.redactedSecretCount > 0
          ? `${result.redactedSecretCount} account, card, or ID number${result.redactedSecretCount === 1 ? " was" : "s were"} hidden before analysis. `
          : ""}
        This is a triage aid, not legal or financial advice.
      </p>
    </section>
  );
}

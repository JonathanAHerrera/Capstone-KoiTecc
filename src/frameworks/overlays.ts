import { computePriority } from "@/frameworks/priority";
import type { ControlDefinition, OrgProfile } from "@/frameworks/types";

// Industry packs that attach on top of an SB 2610 tier based on onboarding answers. These catalogs
// (HIPAA Security Rule, GLBA Safeguards Rule, PCI DSS) are not reproduced here: the real control
// text must come from the source document, so each overlay ships TODO_SOURCE placeholders that
// carry the right safeguard kind and threat tags for the engine, with wording to be filled from
// the cited regulation. Do not paraphrase the standards from memory.
export type OverlayId = "hipaa" | "glba" | "pci";

export type OverlayDefinition = {
  id: OverlayId;
  name: string;
  sourceRef: string;
  reason: string; // why it attached, shown in the plan
  controls: ControlDefinition[];
};

// Placeholder control whose wording is pending the source document. Priority is still real so the
// control ranks correctly in the plan the moment the text is filled in.
function placeholderControl(
  input: Omit<ControlDefinition, "priority"> & { priority?: number },
): ControlDefinition {
  return {
    ...input,
    priority: input.priority ?? computePriority(input.threat),
  };
}

const HIPAA_OVERLAY: OverlayDefinition = {
  id: "hipaa",
  name: "HIPAA Security Rule",
  sourceRef: "45 CFR Part 164 Subpart C",
  reason: "Healthcare business handling protected health information (PHI).",
  controls: [
    placeholderControl({
      id: "hipaa.security-risk-analysis",
      sourceRef: "TODO_SOURCE", // 45 CFR 164.308(a)(1)(ii)(A)
      family: "HIPAA Administrative Safeguards",
      safeguardKind: "administrative",
      title: "Document a HIPAA security risk analysis",
      explainer: "TODO_SOURCE — fill from 45 CFR 164.308(a)(1)(ii)(A).",
      threat: ["credential"],
      verification: ["attestation", "evidence:document"],
      evidenceHints: ["TODO_SOURCE"],
    }),
    placeholderControl({
      id: "hipaa.encrypt-phi",
      sourceRef: "TODO_SOURCE", // 45 CFR 164.312(a)(2)(iv) / (e)(2)(ii)
      family: "HIPAA Technical Safeguards",
      safeguardKind: "technical",
      title: "Encrypt stored and transmitted PHI",
      explainer: "TODO_SOURCE — fill from 45 CFR 164.312(a)(2)(iv) and (e)(2)(ii).",
      threat: ["ransomware", "credential"],
      verification: ["evidence:screenshot", "attestation"],
      evidenceHints: ["TODO_SOURCE"],
    }),
    placeholderControl({
      id: "hipaa.facility-access",
      sourceRef: "TODO_SOURCE", // 45 CFR 164.310(a)(1)
      family: "HIPAA Physical Safeguards",
      safeguardKind: "physical",
      title: "Control physical access to systems holding PHI",
      explainer: "TODO_SOURCE — fill from 45 CFR 164.310(a)(1).",
      threat: ["physical"],
      verification: ["evidence:photo", "attestation"],
      evidenceHints: ["TODO_SOURCE"],
    }),
  ],
};

const GLBA_OVERLAY: OverlayDefinition = {
  id: "glba",
  name: "GLBA Safeguards Rule",
  sourceRef: "16 CFR Part 314",
  reason: "Financial-services business handling customer financial information.",
  controls: [
    placeholderControl({
      id: "glba.written-info-security-program",
      sourceRef: "TODO_SOURCE", // 16 CFR 314.4(a)
      family: "GLBA Safeguards",
      safeguardKind: "administrative",
      title: "Maintain a written information security program",
      explainer: "TODO_SOURCE — fill from 16 CFR 314.4(a).",
      threat: ["credential"],
      verification: ["attestation", "evidence:document"],
      evidenceHints: ["TODO_SOURCE"],
    }),
    placeholderControl({
      id: "glba.encrypt-customer-info",
      sourceRef: "TODO_SOURCE", // 16 CFR 314.4(c)(3)
      family: "GLBA Safeguards",
      safeguardKind: "technical",
      title: "Encrypt customer information at rest and in transit",
      explainer: "TODO_SOURCE — fill from 16 CFR 314.4(c)(3).",
      threat: ["credential", "ransomware"],
      verification: ["evidence:screenshot", "attestation"],
      evidenceHints: ["TODO_SOURCE"],
    }),
    placeholderControl({
      id: "glba.secure-disposal",
      sourceRef: "TODO_SOURCE", // 16 CFR 314.4(c)(6)
      family: "GLBA Safeguards",
      safeguardKind: "physical",
      title: "Securely dispose of paper and media holding customer information",
      explainer: "TODO_SOURCE — fill from 16 CFR 314.4(c)(6).",
      threat: ["physical"],
      verification: ["evidence:photo", "attestation"],
      evidenceHints: ["TODO_SOURCE"],
    }),
  ],
};

const PCI_OVERLAY: OverlayDefinition = {
  id: "pci",
  name: "PCI DSS",
  sourceRef: "PCI DSS v4.0.1",
  reason: "Business that accepts card payments.",
  controls: [
    placeholderControl({
      id: "pci.security-policy",
      sourceRef: "TODO_SOURCE", // PCI DSS Requirement 12
      family: "PCI DSS",
      safeguardKind: "administrative",
      title: "Maintain an information security policy for cardholder data",
      explainer: "TODO_SOURCE — fill from PCI DSS v4.0.1 Requirement 12.",
      threat: ["credential"],
      verification: ["attestation", "evidence:document"],
      evidenceHints: ["TODO_SOURCE"],
    }),
    placeholderControl({
      id: "pci.protect-stored-cardholder-data",
      sourceRef: "TODO_SOURCE", // PCI DSS Requirement 3
      family: "PCI DSS",
      safeguardKind: "technical",
      title: "Protect stored cardholder data",
      explainer: "TODO_SOURCE — fill from PCI DSS v4.0.1 Requirement 3.",
      threat: ["credential", "ransomware"],
      verification: ["evidence:screenshot", "attestation"],
      evidenceHints: ["TODO_SOURCE"],
    }),
    placeholderControl({
      id: "pci.restrict-physical-access",
      sourceRef: "TODO_SOURCE", // PCI DSS Requirement 9
      family: "PCI DSS",
      safeguardKind: "physical",
      title: "Restrict physical access to cardholder data",
      explainer: "TODO_SOURCE — fill from PCI DSS v4.0.1 Requirement 9.",
      threat: ["physical"],
      verification: ["evidence:photo", "attestation"],
      evidenceHints: ["TODO_SOURCE"],
    }),
  ],
};

const OVERLAYS: Readonly<Record<OverlayId, OverlayDefinition>> = {
  hipaa: HIPAA_OVERLAY,
  glba: GLBA_OVERLAY,
  pci: PCI_OVERLAY,
};

export function getOverlay(id: OverlayId): OverlayDefinition {
  return OVERLAYS[id];
}

// Which overlays attach for a profile, in stable order. HIPAA follows healthcare; GLBA follows the
// financial trades called out in the spec (tax prep, accounting, lending); PCI follows card payments.
export function overlaysForProfile(profile: OrgProfile): OverlayId[] {
  const attached: OverlayId[] = [];
  if (profile.industry === "healthcare") attached.push("hipaa");
  if (
    profile.industry === "tax_prep" ||
    profile.industry === "accounting" ||
    profile.industry === "lending"
  ) {
    attached.push("glba");
  }
  if (profile.takesCardPayments) attached.push("pci");
  return attached;
}

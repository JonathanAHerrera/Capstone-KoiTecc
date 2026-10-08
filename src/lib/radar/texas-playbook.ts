// Static, educational summary of the breach-response duties under Texas Business & Commerce
// Code Ch. 521 (§521.053). This is a readiness aid, not legal advice; thresholds and timelines
// are set by statute and should be confirmed with counsel.

export type BreachPlaybookStep = {
  code: string;
  title: string;
  timing: string;
  detail: string;
  legalRef: string;
};

export type TexasBreachPlaybook = {
  title: string;
  summary: string;
  disclaimer: string;
  steps: BreachPlaybookStep[];
};

export const TEXAS_BREACH_PLAYBOOK: TexasBreachPlaybook = {
  title: "Texas §521 breach-response playbook",
  summary:
    "If sensitive personal information of Texas residents is exposed, Chapter 521 sets who you must notify and how fast. Use this as a dry-run checklist before an incident happens.",
  disclaimer:
    "Educational summary of Tex. Bus. & Com. Code Ch. 521 — not legal advice. Confirm exact thresholds, timing, and content requirements with qualified counsel.",
  steps: [
    {
      code: "DETECT",
      title: "Detect and contain",
      timing: "Immediately",
      detail:
        "Confirm whether sensitive personal information (name plus SSN, driver's license, financial account, or similar) was acquired by an unauthorized person. Contain the incident and preserve logs.",
      legalRef: "Tex. Bus. & Com. Code §521.053(a)",
    },
    {
      code: "ASSESS",
      title: "Assess scope and Texas residents affected",
      timing: "First days",
      detail:
        "Identify which individuals and how many Texas residents are affected. The resident count determines whether the Attorney General must also be notified.",
      legalRef: "Tex. Bus. & Com. Code §521.053",
    },
    {
      code: "NOTIFY-INDIVIDUALS",
      title: "Notify affected individuals",
      timing: "Without unreasonable delay, and not later than the 60th day after you determine a breach occurred",
      detail:
        "Send notice to each affected individual describing the breach. Delivery can be written, electronic, or (in limited cases) substitute notice.",
      legalRef: "Tex. Bus. & Com. Code §521.053(b)",
    },
    {
      code: "NOTIFY-AG",
      title: "Notify the Texas Attorney General",
      timing: "As soon as practicable, and not later than the 30th day after you determine a breach occurred",
      detail:
        "Required only when a single breach affects 250 or more Texas residents. The notice must describe the breach, the number of residents affected, measures taken, and whether law enforcement is delaying notice.",
      legalRef: "Tex. Bus. & Com. Code §521.053(i)",
    },
    {
      code: "RECORD",
      title: "Document and improve",
      timing: "After notification",
      detail:
        "Keep records of what happened, who was notified and when, and the remediation taken. Feed lessons learned back into your security controls.",
      legalRef: "Tex. Bus. & Com. Code §521.053",
    },
  ],
};

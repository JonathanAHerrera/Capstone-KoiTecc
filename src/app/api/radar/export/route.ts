import { listRadarDecisions } from "@/lib/radar/profile";

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function GET() {
  const decisions = await listRadarDecisions();
  const rows = [
    ["Decision date", "Decision", "Reviewer", "Source item", "Official source", "Rationale"],
    ...decisions.map((decision) => [decision.decidedAt, decision.decision, decision.reviewer, decision.sourceTitle, decision.sourceUrl, decision.rationale]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="policy-radar-decisions.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InterviewChat } from "@/components/interview/interview-chat";
import { getActiveInterviewSnapshot } from "@/lib/interview";
import { getOrganization } from "@/lib/org";
import { getFamilies } from "@/lib/practices";
import { FRAMEWORKS, type CmmcLevel } from "@/lib/practice-types";

export const dynamic = "force-dynamic";

type InterviewPageProps = { params: Promise<{ family: string }> };

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  const { family } = await params;
  return { title: `Readiness check · ${family} · CMMC Ready` };
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { family: familyCode } = await params;

  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const level = organization.targetLevel as CmmcLevel;
  const family = getFamilies(level).find((candidate) => candidate.code === familyCode);
  if (!family) notFound();

  const initialSnapshot = await getActiveInterviewSnapshot(familyCode);

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <InterviewChat
        familyCode={family.code}
        familyName={family.name}
        practiceCount={family.practices.length}
        disclaimer={FRAMEWORKS.cmmc.disclaimer}
        initialSnapshot={initialSnapshot}
      />
    </div>
  );
}

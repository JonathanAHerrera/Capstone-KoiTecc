import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InterviewChat } from "@/components/interview/interview-chat";
import { getLatestInterviewSnapshot } from "@/lib/interview";
import { getOrganization } from "@/lib/org";
import { getSessionUser } from "@/lib/session";
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

  if (!(await getSessionUser())) redirect(`/sign-in?redirect=${encodeURIComponent(`/interview/${familyCode}`)}`);

  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const level = organization.targetLevel as CmmcLevel;
  const family = getFamilies(level).find((candidate) => candidate.code === familyCode);
  if (!family) notFound();

  const initialSnapshot = await getLatestInterviewSnapshot(familyCode);

  return (
    <div className="agent-surface flex min-h-dvh flex-col px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-7">
      <InterviewChat
        familyCode={family.code}
        familyName={family.name}
        practiceCount={initialSnapshot?.practiceCount ?? family.practices.length}
        disclaimer={FRAMEWORKS.cmmc.disclaimer}
        initialSnapshot={initialSnapshot}
      />
    </div>
  );
}

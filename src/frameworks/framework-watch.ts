// Framework watch (Phase 3): when a newer catalog version is published, orgs don't have to adopt it
// immediately. The catch-up deadline is the LATER of the new version's implementation date or one
// year after its publication — whichever gives the business more time. The Radar surfaces this.
export function catchUpDeadline(implementationDate: Date, publishedAt: Date): Date {
  const oneYearAfterPublication = new Date(publishedAt);
  oneYearAfterPublication.setFullYear(oneYearAfterPublication.getFullYear() + 1);
  return implementationDate.getTime() > oneYearAfterPublication.getTime()
    ? implementationDate
    : oneYearAfterPublication;
}

export type FrameworkVersionChange = {
  frameworkId: string;
  previousVersion: string;
  newVersion: string;
  publishedAt: string; // ISO date the new version was published
  implementationDate: string; // ISO date the new version takes effect
};

// Deadline for an org to catch up to a newly recorded framework version, as an ISO date string.
export function catchUpDeadlineFor(change: FrameworkVersionChange): string {
  const deadline = catchUpDeadline(
    new Date(change.implementationDate),
    new Date(change.publishedAt),
  );
  return deadline.toISOString().slice(0, 10);
}

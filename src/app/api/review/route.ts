import { z } from "zod";
import { reviewSubmission } from "@/lib/reviewer";
import { getSubmissionById } from "@/lib/submissions";

const ReviewRequestSchema = z.object({ submissionId: z.string().min(1) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const parsedBody = ReviewRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: "submissionId is required" }, { status: 400 });
  }

  const { submissionId } = parsedBody.data;
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    return Response.json({ error: "Submission not found" }, { status: 404 });
  }

  try {
    const review = await reviewSubmission(submissionId);
    return Response.json({ review });
  } catch (error) {
    console.error(`POST /api/review failed for ${submissionId}`, error);
    return Response.json({ error: "Review failed. Please try again." }, { status: 500 });
  }
}

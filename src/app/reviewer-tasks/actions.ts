"use server";

import { revalidatePath } from "next/cache";
import {
  REVIEWER_TASK_STATUSES,
  updateReviewerTaskStatus,
  type ReviewerTaskStatus,
} from "@/lib/reviewer-tasks";

export async function updateReviewerTaskStatusAction(
  taskId: string,
  status: string,
  formData: FormData,
): Promise<void> {
  void formData;
  if (!REVIEWER_TASK_STATUSES.includes(status as ReviewerTaskStatus)) {
    throw new Error("Choose a valid task status.");
  }
  try {
    const task = await updateReviewerTaskStatus(taskId, status as ReviewerTaskStatus);
    if (!task) {
      throw new Error("Task not found.");
    }
    revalidatePath("/reviewer-tasks");
  } catch (error) {
    console.error(`updateReviewerTaskStatusAction failed for ${taskId}`, error);
    throw new Error("Could not update this task. Please try again.");
  }
}

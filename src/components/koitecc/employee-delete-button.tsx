"use client";

import { Trash2 } from "lucide-react";
import { deleteKoiTeccAssociateAction } from "@/app/koitecc/actions";

export function EmployeeDeleteButton({
  associateId,
  associateName,
}: {
  associateId: string;
  associateName: string;
}) {
  return (
    <form
      action={deleteKoiTeccAssociateAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${associateName}? This removes the employee and their organization assignments.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="associateId" value={associateId} />
      <button
        type="submit"
        aria-label={`Delete ${associateName}`}
        title={`Delete ${associateName}`}
        className="focus-outline flex size-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-danger-edge hover:bg-danger-pale hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}

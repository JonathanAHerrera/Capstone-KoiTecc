"use client";

import { Trash2 } from "lucide-react";
import { deleteKoiTeccOrganizationAction } from "@/app/koitecc/actions";

export function OrganizationDeleteButton({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  function confirmDelete(): boolean {
    return window.confirm(`Delete ${organizationName}? This permanently removes it and its assigned associates.`);
  }

  return (
    <form
      action={deleteKoiTeccOrganizationAction}
      onSubmit={(event) => {
        if (!confirmDelete()) event.preventDefault();
      }}
      className="shrink-0"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <button
        type="submit"
        aria-label={`Delete ${organizationName}`}
        title={`Delete ${organizationName}`}
        className="focus-outline flex size-11 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-danger-edge hover:bg-danger-pale hover:text-danger"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { requestIncidentHelpAction } from "@/app/incident/actions";
import { BigButton } from "@/components/ui/big-button";
import { useToast } from "@/components/ui/use-toast";

export type IncidentHelpButtonProps = {
  incidentId: string;
  helpAlreadyRequested: boolean;
};

export function IncidentHelpButton({ incidentId, helpAlreadyRequested }: IncidentHelpButtonProps) {
  const { showToast } = useToast();
  const [sendingHelpRequest, setSendingHelpRequest] = useState(false);
  const [helpRequestSent, setHelpRequestSent] = useState(helpAlreadyRequested);

  async function sendHelpRequest() {
    if (sendingHelpRequest || helpRequestSent) return;
    setSendingHelpRequest(true);
    try {
      const result = await requestIncidentHelpAction(incidentId);
      if (result.ok) {
        setHelpRequestSent(true);
        showToast({ tone: "success", message: "Help request recorded." });
      } else {
        showToast({ tone: "danger", message: result.error });
      }
    } catch {
      showToast({ tone: "danger", message: "Could not save the request. Please try again." });
    } finally {
      setSendingHelpRequest(false);
    }
  }

  return (
    <BigButton
      variant="danger"
      fullWidth
      icon={<LifeBuoy />}
      loading={sendingHelpRequest}
      disabled={helpRequestSent}
      onClick={sendHelpRequest}
    >
      {helpRequestSent ? "Help request recorded" : "Get help from KOITECC"}
    </BigButton>
  );
}

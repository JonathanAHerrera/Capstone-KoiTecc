import { Save } from "lucide-react";
import { saveRadarProfileAction } from "@/app/radar/actions";
import type { RadarIndustry, RadarProfile } from "@/lib/radar/types";

const INDUSTRIES: { value: RadarIndustry; label: string }[] = [
  { value: "manufacturing", label: "Manufacturing" },
  { value: "construction", label: "Construction" },
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "professional_services", label: "Professional services" },
  { value: "energy", label: "Energy" },
  { value: "retail_hospitality", label: "Retail or hospitality" },
  { value: "other", label: "Other" },
];

export type RadarProfileFormProps = {
  profile: RadarProfile | null;
  defaultGovernmentContractor: boolean;
  defaultHandlesSensitiveData: boolean;
};

export function RadarProfileForm({ profile, defaultGovernmentContractor, defaultHandlesSensitiveData }: RadarProfileFormProps) {
  return (
    <form action={saveRadarProfileAction} className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold text-ink">What kind of work do you do?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {INDUSTRIES.map((industry) => (
            <label key={industry.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-canvas px-3 text-sm text-text">
              <input type="checkbox" name="industries" value={industry.value} defaultChecked={profile?.industries.includes(industry.value)} className="size-4 accent-primary" />
              {industry.label}
            </label>
          ))}
        </div>
      </div>

      <label className="text-sm font-semibold text-ink">
        NAICS codes
        <span className="mt-1 block text-xs font-normal text-text-secondary">Comma-separated, if known</span>
        <input name="naicsCodes" defaultValue={profile?.naicsCodes.join(", ")} placeholder="332710, 541512" className="mt-2 min-h-11 w-full rounded-lg border border-border bg-canvas px-3 text-base font-normal text-ink outline-none focus:border-primary-text" />
      </label>

      <label className="text-sm font-semibold text-ink">
        Topics to watch
        <span className="mt-1 block text-xs font-normal text-text-secondary">Customers, regulations, services, or business concerns</span>
        <textarea name="keywords" defaultValue={profile?.keywords.join(", ")} placeholder="defense contracts, AI, export controls, privacy" rows={3} className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-base font-normal text-ink outline-none focus:border-primary-text" />
      </label>

      <label className="text-sm font-semibold text-ink">
        Technology inventory
        <span className="mt-1 block text-xs font-normal text-text-secondary">Products and vendors used in the business</span>
        <textarea name="technologies" defaultValue={profile?.technologies.join(", ")} placeholder="Microsoft 365, Fortinet, QuickBooks, Google Workspace" rows={3} className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-base font-normal text-ink outline-none focus:border-primary-text" />
      </label>

      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 items-center gap-3 text-sm text-text"><input type="checkbox" name="texasOperations" defaultChecked={profile?.texasOperations ?? true} className="size-4 accent-primary" />We operate in Texas</label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text"><input type="checkbox" name="governmentContractor" defaultChecked={profile?.governmentContractor ?? defaultGovernmentContractor} className="size-4 accent-primary" />We pursue or perform government contracts</label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-text"><input type="checkbox" name="handlesSensitiveData" defaultChecked={profile?.handlesSensitiveData ?? defaultHandlesSensitiveData} className="size-4 accent-primary" />We handle sensitive customer, employee, health, financial, FCI, or CUI data</label>
      </div>

      <button type="submit" className="focus-outline inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-contrast hover:bg-primary-hover">
        <Save className="size-4" aria-hidden />
        {profile ? "Update radar profile" : "Create radar profile"}
      </button>
    </form>
  );
}

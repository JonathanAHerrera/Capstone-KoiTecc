import { beforeEach, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { assignKoiTeccAssociate, createAssociateUpdate, removeKoiTeccAssociate } from "@/lib/koitecc";
import { assignKoiTeccAssociateAction, createAssociateUpdateAction, removeKoiTeccAssociateAction } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/koitecc", () => ({ assignKoiTeccAssociate: vi.fn(), removeKoiTeccAssociate: vi.fn(), createAssociateUpdate: vi.fn() }));
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
beforeEach(() => { vi.resetAllMocks(); });

test.each([assignKoiTeccAssociateAction, removeKoiTeccAssociateAction])("assignment boundary rejects missing or blank IDs before mutations", async (action) => {
  const cases: Record<string, string>[] = [{}, { organizationId: "   ", associateId: "jordan" }, { organizationId: "client", associateId: "" }];
  for (const values of cases) {
    await expect(action(form(values))).rejects.toThrow("Choose an organization and associate");
  }
  expect(assignKoiTeccAssociate).not.toHaveBeenCalled();
  expect(removeKoiTeccAssociate).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test.each(["", "   ", "a".repeat(2001)])("update boundary rejects invalid messages", async (message) => {
  await expect(createAssociateUpdateAction(form({ associateId: "jordan", organizationId: "client", message }))).rejects.toThrow();
  expect(createAssociateUpdate).not.toHaveBeenCalled();
});

test.each([
  { action: assignKoiTeccAssociateAction, mutation: assignKoiTeccAssociate, redirect: "/koitecc?assignment=success" },
  { action: removeKoiTeccAssociateAction, mutation: removeKoiTeccAssociate, redirect: "/koitecc?assignment=removed" },
])("assignment action redirects and refreshes data only after a successful write", async ({ action, mutation, redirect }) => {
  await expect(action(form({ organizationId: " client ", associateId: " jordan " }))).rejects.toThrow(`REDIRECT:${redirect}`);
  expect(mutation).toHaveBeenCalledWith("client", "jordan");
  expect(revalidatePath).toHaveBeenCalledWith("/koitecc");
});

test("failed authorization is propagated without success redirects or cache invalidation", async () => {
  vi.mocked(assignKoiTeccAssociate).mockRejectedValue(new Error("KoiTecc administrator access is required."));
  await expect(assignKoiTeccAssociateAction(form({ organizationId: "client", associateId: "jordan" }))).rejects.toThrow("administrator access");
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("an update is trimmed, saved, and invalidated for its associate workspace", async () => {
  await expect(createAssociateUpdateAction(form({ associateId: "jordan", organizationId: "client", message: "  MFA evidence received.  " }))).rejects.toThrow("REDIRECT:/koitecc/associates/jordan?update=success");
  expect(createAssociateUpdate).toHaveBeenCalledWith("jordan", "client", "MFA evidence received.");
  expect(revalidatePath).toHaveBeenCalledWith("/koitecc/associates/jordan");
});

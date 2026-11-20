import { beforeEach, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { approveKoiTeccAssociateAccount, revokeKoiTeccAssociateAccount, assignKoiTeccAssociate, createAssociateUpdate, removeKoiTeccAssociate } from "@/lib/koitecc";
import { approveKoiTeccAssociateAccountAction, revokeKoiTeccAssociateAccountAction, assignKoiTeccAssociateAction, createAssociateUpdateAction, removeKoiTeccAssociateAction } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/koitecc", () => ({ approveKoiTeccAssociateAccount: vi.fn(), revokeKoiTeccAssociateAccount: vi.fn(), assignKoiTeccAssociate: vi.fn(), removeKoiTeccAssociate: vi.fn(), createAssociateUpdate: vi.fn() }));
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
beforeEach(() => { vi.resetAllMocks(); });

test.each([
  {},
  { associateId: "employee", userId: "account" },
  { associateId: " ", userId: "account", confirmIdentity: "on" },
  { associateId: "employee", userId: " ", confirmIdentity: "on" },
  { associateId: "employee", userId: "account", confirmIdentity: "false" },
])("approval requires a specific account and explicit identity confirmation", async (values) => {
  await expect(approveKoiTeccAssociateAccountAction(form(values as Record<string, string>))).rejects.toThrow("confirm");
  expect(approveKoiTeccAssociateAccount).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test.each([
  { action: approveKoiTeccAssociateAccountAction, mutation: approveKoiTeccAssociateAccount, status: "approved", args: ["employee", "account"] },
  { action: revokeKoiTeccAssociateAccountAction, mutation: revokeKoiTeccAssociateAccount, status: "revoked", args: ["employee"] },
])("account access actions refresh the workspace only after authorized success", async ({ action, mutation, status, args }) => {
  const values = form({ associateId: " employee ", userId: " account ", confirmIdentity: "on" });
  vi.mocked(mutation).mockRejectedValueOnce(new Error("administrator access is required"));
  await expect(action(values)).rejects.toThrow("administrator access");
  expect(revalidatePath).not.toHaveBeenCalled();
  await expect(action(values)).rejects.toThrow(`REDIRECT:/koitecc/employees?employee=${status}`);
  expect(mutation).toHaveBeenLastCalledWith(...args);
  expect(revalidatePath).toHaveBeenCalledWith("/koitecc", "layout");
});

test("revocation rejects a missing employee ID", async () => {
  await expect(revokeKoiTeccAssociateAccountAction(form({}))).rejects.toThrow();
  expect(revokeKoiTeccAssociateAccount).not.toHaveBeenCalled();
});

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

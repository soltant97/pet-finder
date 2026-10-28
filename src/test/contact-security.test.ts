// @vitest-environment node
import { describe, expect, it } from "vitest";

// Run against real disposable accounts; credentials are supplied only at test time.
const configured = !!process.env["CONTACT_TEST_FINDER_TOKEN"];
const base = process.env["CONTACT_TEST_URL"] ?? "";
const key = process.env["CONTACT_TEST_KEY"] ?? "";
const conversation = process.env["CONTACT_TEST_CONVERSATION"] ?? "";
const request = process.env["CONTACT_TEST_REQUEST"] ?? "";
async function query(path: string, token: string, body?: object) {
  const response = await fetch(`${base}/rest/v1/${path}`, { method: body ? "POST" : "GET", headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
describe.skipIf(!configured)("Private contact database permissions", () => {
  const finder = process.env["CONTACT_TEST_FINDER_TOKEN"] ?? "";
  const third = process.env["CONTACT_TEST_THIRD_TOKEN"] ?? "";
  it("lets the accepted participant read real messages", async () => { const r = await query(`messages?conversation_id=eq.${conversation}&select=id`, finder); expect(r.status).toBe(200); expect(r.data.length).toBeGreaterThanOrEqual(3); });
  it("hides contact requests from a third user", async () => { expect((await query(`contact_requests?id=eq.${request}&select=id`, third)).data).toEqual([]); });
  it("hides conversations from a third user", async () => { expect((await query(`conversations?id=eq.${conversation}&select=id`, third)).data).toEqual([]); });
  it("hides messages from a third user", async () => { expect((await query(`messages?conversation_id=eq.${conversation}&select=id`, third)).data).toEqual([]); });
  it("rejects sending to another user's conversation", async () => { expect((await query("rpc/send_private_message", third, { _conversation_id: conversation, _body: "Forbidden" })).status).toBeGreaterThanOrEqual(400); });
  it("rejects forged direct message writes", async () => { expect((await query("messages", third, { conversation_id: conversation, sender_id: process.env["CONTACT_TEST_FINDER_ID"], body: "Forged" })).status).toBeGreaterThanOrEqual(400); });
  it("enforces 2000-character limit in the database", async () => { expect((await query("rpc/send_private_message", finder, { _conversation_id: conversation, _body: "a".repeat(2001) })).status).toBeGreaterThanOrEqual(400); });
});
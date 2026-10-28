import { describe, expect, it } from "vitest";
import { contactReturn, messageSchema } from "@/lib/contact";
describe("Kontaktregler", () => {
  it("requires an introductory or private message", () => { expect(messageSchema.safeParse("   ").success).toBe(false); expect(messageSchema.parse(" Jag har hittat din katt ")).toBe("Jag har hittat din katt"); });
  it("limits messages to 2000 characters", () => { expect(messageSchema.safeParse("a".repeat(2000)).success).toBe(true); expect(messageSchema.safeParse("a".repeat(2001)).success).toBe(false); });
  it("returns only to the viewed pet after authentication", () => { const path = "/djur/11111111-1111-4111-8111-111111111111"; expect(contactReturn(path)).toBe(path); expect(contactReturn("https://evil.example")).toBeUndefined(); expect(contactReturn("//evil.example")).toBeUndefined(); expect(contactReturn("/djur/not-a-uuid")).toBeUndefined(); });
});
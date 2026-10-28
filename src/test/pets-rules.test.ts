import { describe, expect, it } from "vitest";
import { lostSchema, petSchema, validateFile } from "@/lib/pets";

const base = { name: "Morris", species: "katt", breed: "", color: "Grå", sex: "okant", age: "", microchip: "", marks: "", description: "" } as const;

describe("pet rules", () => {
  it("rejects a last-seen date in the future", () => {
    const r = lostSchema.safeParse({ last_location: "Södermalm", last_seen_date: "2999-01-01", circumstances: "Smet ut" });
    expect(r.success).toBe(false);
  });
  it("requires a last known location when marking lost", () => {
    expect(lostSchema.safeParse({ last_location: "", last_seen_date: "2020-01-01", circumstances: "Smet ut" }).success).toBe(false);
  });
  it("rejects invalid microchip numbers", () => {
    expect(petSchema.safeParse({ ...base, microchip: "12-ab" }).success).toBe(false);
    expect(petSchema.safeParse({ ...base, microchip: "752 098 100 123 456" }).success).toBe(true);
  });
  it("rejects non-image files and files over 5 MB", () => {
    expect(validateFile(new File(["x"], "a.pdf", { type: "application/pdf" }))).not.toBeNull();
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "b.jpg", { type: "image/jpeg" });
    expect(validateFile(big)).not.toBeNull();
    expect(validateFile(new File(["x"], "c.jpg", { type: "image/jpeg" }))).toBeNull();
  });
});

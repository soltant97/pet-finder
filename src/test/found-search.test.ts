import { describe, expect, it } from "vitest";
import { nextLevel, scoreCandidate, startLevel, termFor } from "@/lib/found";

describe("found search rules", () => {
  it("starts at the area level and expands area → town → all of Sweden", () => {
    const q = { area: "Södermalm", city: "Stockholm" };
    expect(startLevel(q)).toBe("omrade");
    expect(nextLevel(q, "omrade")).toBe("ort");
    expect(nextLevel(q, "ort")).toBe("hela");
    expect(nextLevel(q, "hela")).toBeNull();
    expect(termFor(q, "hela")).toBeNull();
  });
  it("skips the town level when no town was given", () => {
    expect(nextLevel({ area: "Södermalm", city: "" }, "omrade")).toBe("hela");
    expect(startLevel({ area: "", city: "Lund" })).toBe("ort");
  });
  it("ranks a candidate higher when color and marks match the description", () => {
    const pet = { color: "Grå randig", breed: null, marks: "Vit tass", circumstances: null };
    const hit = scoreCandidate(pet, "grå katt med vit tass");
    const miss = scoreCandidate(pet, "svart hund");
    expect(hit.score).toBeGreaterThan(miss.score);
    expect(hit.matched).toContain("Färg");
    expect(miss.matched).toEqual([]);
  });
});

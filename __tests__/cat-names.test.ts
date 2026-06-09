import { generateCatName } from "../lib/cat-names";

describe("generateCatName", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateCatName()).toBe("string");
    expect(generateCatName().length).toBeGreaterThan(0);
  });

  it("does not return a name with leading or trailing whitespace", () => {
    for (let i = 0; i < 20; i++) {
      const name = generateCatName();
      expect(name).toBe(name.trim());
    }
  });

  it("returns different names across multiple calls (non-deterministic)", () => {
    const names = new Set(Array.from({ length: 30 }, () => generateCatName()));
    expect(names.size).toBeGreaterThan(1);
  });
});

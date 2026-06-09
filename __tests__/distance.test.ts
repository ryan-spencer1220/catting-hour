import { formatDistance, haversineDistance, radiusToKm } from "../lib/distance";

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it("returns a positive distance for different coordinates", () => {
    expect(haversineDistance(51.5, -0.1, 48.8566, 2.3522)).toBeGreaterThan(0);
  });

  it("calculates London → Paris as ~340 km", () => {
    const km = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(km).toBeGreaterThan(330);
    expect(km).toBeLessThan(350);
  });

  it("is symmetric", () => {
    const ab = haversineDistance(37.7749, -122.4194, 34.0522, -118.2437);
    const ba = haversineDistance(34.0522, -118.2437, 37.7749, -122.4194);
    expect(ab).toBeCloseTo(ba, 5);
  });
});

describe("formatDistance", () => {
  describe("metric", () => {
    it("formats distances >= 0.1 km with one decimal", () => {
      expect(formatDistance(1.234, true)).toBe("1.2 km");
      expect(formatDistance(10, true)).toBe("10.0 km");
    });

    it("shows '< 0.1 km' for very short distances", () => {
      expect(formatDistance(0.05, true)).toBe("< 0.1 km");
      expect(formatDistance(0, true)).toBe("< 0.1 km");
    });
  });

  describe("imperial", () => {
    it("converts km to miles with one decimal", () => {
      // 1 km ≈ 0.621 mi
      expect(formatDistance(1, false)).toBe("0.6 mi");
      expect(formatDistance(10, false)).toBe("6.2 mi");
    });

    it("shows '< 0.1 mi' for very short distances", () => {
      expect(formatDistance(0.05, false)).toBe("< 0.1 mi");
    });
  });
});

describe("radiusToKm", () => {
  it("returns the radius unchanged in metric mode", () => {
    expect(radiusToKm(5, true)).toBe(5);
    expect(radiusToKm(10, true)).toBe(10);
  });

  it("converts miles to km in imperial mode", () => {
    expect(radiusToKm(1, false)).toBeCloseTo(1.60934, 4);
    expect(radiusToKm(5, false)).toBeCloseTo(8.0467, 3);
    expect(radiusToKm(10, false)).toBeCloseTo(16.0934, 3);
  });
});

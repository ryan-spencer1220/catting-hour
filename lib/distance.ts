/** Returns distance between two coordinates in kilometres. */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number, metric: boolean): string {
  if (metric) {
    if (km < 0.1) return "< 0.1 km";
    return `${km.toFixed(1)} km`;
  }
  const miles = km * 0.621371;
  if (miles < 0.1) return "< 0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

/** Convert a user-facing radius value to kilometres for distance comparisons. */
export function radiusToKm(radius: number, metric: boolean): number {
  return metric ? radius : radius * 1.60934;
}

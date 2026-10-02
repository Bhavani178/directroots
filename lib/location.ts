export const UNCONFIRMED_DEFAULT_LAT = 17.91331
export const UNCONFIRMED_DEFAULT_LNG = 77.53011

export interface LocationUser {
  lat?: number | null
  lng?: number | null
}

/**
 * Returns true if the user has a confirmed GPS or pin location on the map.
 * Returns false if lat/lng is null, undefined, or matches the old registration default (17.91331, 77.53011).
 */
export function hasConfirmedLocation(user?: LocationUser | null): boolean {
  if (!user || user.lat === null || user.lat === undefined || user.lng === null || user.lng === undefined) {
    return false
  }

  // Check if coordinates match the old unconfirmed registration default
  const isOldDefault =
    Math.abs(user.lat - UNCONFIRMED_DEFAULT_LAT) < 0.0001 &&
    Math.abs(user.lng - UNCONFIRMED_DEFAULT_LNG) < 0.0001

  if (isOldDefault) {
    return false
  }

  // Validate range: lat -90..90 and lng -180..180
  if (user.lat < -90 || user.lat > 90 || user.lng < -180 || user.lng > 180) {
    return false
  }

  return true
}

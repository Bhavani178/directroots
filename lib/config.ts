// Service radius for all sellers (farmers and artisans) in kilometers
export const MAX_FARM_DELIVERY_KM = 50

/**
 * Returns bounding box around a center lat/lng in degrees for OpenCage geocoding bounds parameter.
 * OpenCage bounds format: min_longitude,min_latitude,max_longitude,max_latitude
 * @param lat Center latitude
 * @param lng Center longitude
 * @param deltaDeg Delta in degrees (default 0.25 degrees ~= 25-30 km radius)
 */
export function boundsAround(lat: number, lng: number, deltaDeg: number = 0.25): string {
  const minLat = (lat - deltaDeg).toFixed(6)
  const maxLat = (lat + deltaDeg).toFixed(6)
  const minLng = (lng - deltaDeg).toFixed(6)
  const maxLng = (lng + deltaDeg).toFixed(6)
  return `${minLng},${minLat},${maxLng},${maxLat}`
}

/**
 * Converts a distance in kilometers to an approximate delta in degrees for spatial queries
 * (1 degree of latitude is approximately 111 km)
 */
export function kmToDegreeDelta(km: number = MAX_FARM_DELIVERY_KM): number {
  return km / 111
}

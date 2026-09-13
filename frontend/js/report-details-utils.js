// parse coordinate
function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

// get map coordinates
function getMapCoordinates(report) {
  const lat = parseCoordinate(report?.latitude ?? report?.lat ?? report?.latitude_raw ?? report?.lat_raw);
  const lng = parseCoordinate(report?.longitude ?? report?.lng ?? report?.longitude_raw ?? report?.lng_raw);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

// build google maps url
function buildGoogleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseCoordinate,
    getMapCoordinates,
    buildGoogleMapsUrl
  };
}

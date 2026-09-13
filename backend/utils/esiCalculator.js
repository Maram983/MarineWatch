// Environmental Severity Index (ESI) calculator.
//
// Implements a simple Weighted Sum Model (a standard multi-criteria decision
// analysis technique used in environmental/GIS-based risk assessment — see
// Batina & Siljeg, 2025; Bosso et al., 2025) so the "severity" of a report is
// *computed* from objective inputs instead of picked by the reporter.
//
// Matches the project's system flowchart (Chapter 3): ESI is calculated
// "based on predefined criteria such as environmental impact and affected area".
//
// Criteria:
//   1. Environmental impact (pollution type) -> base impact weight (0-10)
//   2. Affected area                          -> small / medium / large (0-10)
//
// raw = (typeWeight * 0.5) + (areaWeight * 0.5)
// esi_score = min(10, raw)
//
// Classification: Low / Medium / High (per survey result, Section 3.4.1.8 —
// 100% of respondents wanted a 3-tier Low/Medium/High classification).

const TYPE_WEIGHTS = {
  oil: 9,
  chemical: 9,
  'coral bleaching': 8,
  sewage: 7,
  'fishing gear': 6,
  debris: 5,
  plastic: 5,
  other: 4
};

const AREA_WEIGHTS = {
  small: 3,
  medium: 6,
  large: 10
};

const ALLOWED_AREAS = Object.keys(AREA_WEIGHTS);

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getTypeWeight(type) {
  return TYPE_WEIGHTS[normalize(type)] ?? TYPE_WEIGHTS.other;
}

function getAreaWeight(affectedArea) {
  return AREA_WEIGHTS[normalize(affectedArea)] ?? AREA_WEIGHTS.small;
}

// Maps a 0-10 ESI score to Low / Medium / High.
function levelFromScore(score) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function calculateESI({ type, affected_area }) {
  const typeWeight = getTypeWeight(type);
  const areaWeight = getAreaWeight(affected_area);

  const raw = (typeWeight * 0.5) + (areaWeight * 0.5);
  const esi_score = Math.round(Math.min(10, raw) * 10) / 10; // one decimal place
  const severity = levelFromScore(esi_score);

  return { esi_score, severity };
}

module.exports = {
  calculateESI,
  levelFromScore,
  TYPE_WEIGHTS,
  AREA_WEIGHTS,
  ALLOWED_AREAS
};

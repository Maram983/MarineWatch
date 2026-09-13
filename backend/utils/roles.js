function normalizeRole(role) {
  if (typeof role !== 'string') {
    return 'unknown';
  }

  const normalized = role.trim().toLowerCase();
  if (['admin', 'volunteer', 'diver'].includes(normalized)) {
    return normalized;
  }

  return 'unknown';
}

module.exports = {
  normalizeRole
};

function calculateAvailability(slots, participantCount) {
  const normalizedSlots = Number(slots || 0);
  const normalizedCount = Number(participantCount || 0);
  const availableSpots = Math.max(0, normalizedSlots - normalizedCount);

  return {
    availableSpots,
    isFull: availableSpots <= 0,
    filled: normalizedCount
  };
}

module.exports = {
  calculateAvailability
};

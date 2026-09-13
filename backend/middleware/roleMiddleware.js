function roleMiddleware(allowedRoles) {
  const normalizedAllowedRoles = (allowedRoles || []).map((role) => String(role).trim().toLowerCase());

  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = String(req.user.role || '').trim().toLowerCase();
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
}

module.exports = roleMiddleware;

const { authService } = require('../services/authService');
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.civet_session) {
      token = req.cookies.civet_session;
    }
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    const session = await authService.validateSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }
    req.user = session;
    req.token = token;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authentication check failed: ' + err.message });
  }
}
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const userRole = String(req.user.role || '').toLowerCase();
    if (userRole === 'admin' || userRole === 'director') {
      return next();
    }
    const normalized = allowedRoles.map(r => String(r).toLowerCase());
    if (normalized.length > 0 && !normalized.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Role "${req.user.role}" is not authorized for this resource.`
      });
    }
    next();
  };
}
module.exports = {
  authMiddleware,
  requireRole
};
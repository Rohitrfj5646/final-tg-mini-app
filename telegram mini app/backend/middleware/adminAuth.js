const jwt = require('jsonwebtoken');

/**
 * Admin Auth Middleware — verifies admin JWT token
 */
function adminAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || 'admin_secret');

    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Not an admin' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
}

module.exports = { adminAuthMiddleware };

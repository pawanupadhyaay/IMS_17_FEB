const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

/** Optional auth: populates req.user when token valid, else req.user = null. Never blocks. */
const optionalAuth = async (req, res, next) => {
  req.user = null;
  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch (_) {
      /* ignore invalid token */
    }
  }
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: `User role is not authorized to access this route`,
      });
    }

    const userRole = req.user.role.toLowerCase();
    const authorizedRoles = roles.map((role) => role.toLowerCase());

    if (!authorizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, optionalAuth, authorize };

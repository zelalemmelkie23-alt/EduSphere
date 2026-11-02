const AppError = require("../errors/AppError");

function requirePermission(permission) {
  return function authorize(req, res, next) {
    const roles = req.auth?.roles || [];
    const permissions = req.auth?.permissions || [];
    if (roles.includes("Super Admin") || permissions.includes(permission)) {
      return next();
    }

    return next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action."));
  };
}

module.exports = requirePermission;

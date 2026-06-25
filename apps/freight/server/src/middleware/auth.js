import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ message: "Forbidden." });
}

export function canViewAll(req) {
  return Boolean(
    req.user?.role === "admin" ||
      req.user?.role === "accountant" ||
      req.user?.permissions?.viewAll ||
      req.user?.permissions?.editAll
  );
}

export function canEditAll(req) {
  return Boolean(req.user?.role === "admin" || req.user?.permissions?.editAll);
}

export function canCreate(req) {
  return Boolean(req.user?.permissions?.create || req.user?.role === "admin");
}

export function canUpdateOwn(req) {
  return Boolean(req.user?.permissions?.updateOwn || req.user?.role === "admin");
}

export function canDelete(req) {
  // Only admin/editAll can delete. Staff cannot delete.
  return Boolean(req.user?.role === "admin" || req.user?.permissions?.editAll);
}

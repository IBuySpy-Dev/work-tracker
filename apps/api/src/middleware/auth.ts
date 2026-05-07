import { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError, Role, RoleHierarchy } from "@e-clat/shared";
import { verifyAccessToken } from "../modules/auth/tokens";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new UnauthorizedError());
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return next(new UnauthorizedError());
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return next(new UnauthorizedError("Token expired"));
    }

    if (error instanceof JsonWebTokenError || error instanceof UnauthorizedError) {
      return next(new UnauthorizedError("Invalid or expired token"));
    }

    next(error as Error);
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (RoleHierarchy[req.user.role] < RoleHierarchy[minRole]) {
      return next(new ForbiddenError());
    }
    next();
  };
}

/**
 * Enforces object-level authorization: the requesting user must either own the
 * resource (their user ID matches the route param) or hold at least `minRole`.
 *
 * @param paramName - The route parameter containing the target employee/user ID.
 * @param minRole - Minimum role that bypasses the ownership check (default: SUPERVISOR).
 */
export function requireSelfOrMinRole(paramName = "id", minRole: Role = "supervisor" as Role) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const targetId = req.params[paramName];
    if (req.user.id === targetId) {
      return next();
    }
    if (RoleHierarchy[req.user.role] >= RoleHierarchy[minRole]) {
      return next();
    }
    return next(new ForbiddenError("You can only access your own records"));
  };
}

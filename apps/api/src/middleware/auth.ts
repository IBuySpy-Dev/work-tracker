import { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError, Role, RoleHierarchy, Roles } from "@e-clat/shared";
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

export function assertSelfOrMinRole(user: AuthenticatedRequest["user"], targetUserId: string, minRole: Role = Roles.SUPERVISOR) {
  if (!user) {
    throw new UnauthorizedError();
  }

  if (user.id !== targetUserId && RoleHierarchy[user.role] < RoleHierarchy[minRole]) {
    throw new ForbiddenError();
  }
}

export function requireSelfOrMinRole(paramName: string, minRole: Role = Roles.SUPERVISOR) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const paramValue = req.params[paramName];
    const targetUserId = Array.isArray(paramValue) ? paramValue[0] : paramValue;
    if (!targetUserId) {
      return next(new UnauthorizedError("Missing resource owner parameter"));
    }

    try {
      assertSelfOrMinRole(req.user, targetUserId, minRole);
      next();
    } catch (error) {
      next(error as Error);
    }
  };
}

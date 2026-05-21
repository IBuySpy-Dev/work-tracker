import bcrypt from "bcryptjs";
import { Role as PrismaRole } from "@prisma/client";
import { Role, UnauthorizedError } from "@e-clat/shared";
import { RegisterInput, LoginInput, RefreshTokenInput, ChangePasswordInput } from "./validators";
import { notImplemented } from "../../common/utils";
import { prisma } from "../../config/database";
import {
  type AuthTokenUser,
  getAccessTokenLifetimeSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./tokens";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthService {
  register(input: RegisterInput): Promise<{ id: string }>;
  login(input: LoginInput): Promise<AuthTokens>;
  refreshToken(input: RefreshTokenInput): Promise<AuthTokens>;
  changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
  oauthCallback(provider: string, code: string): Promise<AuthTokens>;
}

interface AuthUserRecord {
  id: string;
  email: string;
  role: PrismaRole;
  passwordHash: string | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function fromPrismaRole(role: PrismaRole): Role {
  return role.toLowerCase() as Role;
}

function toAuthTokenUser(record: AuthUserRecord): AuthTokenUser {
  return {
    id: record.id,
    email: record.email,
    role: fromPrismaRole(record.role),
  };
}

function buildTokens(user: AuthTokenUser, refreshToken = signRefreshToken(user)): AuthTokens {
  const accessToken = signAccessToken(user);

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenLifetimeSeconds(accessToken),
  };
}

export const authService: AuthService = {
  register: () => notImplemented("register"),
  async login(input) {
    const user = await prisma.employee.findUnique({
      where: { email: normalizeEmail(input.email) },
      select: { id: true, email: true, role: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedError("Invalid email or password");
    }

    return buildTokens(toAuthTokenUser(user));
  },
  async refreshToken(input) {
    const user = verifyRefreshToken(input.refreshToken);
    return buildTokens(user, input.refreshToken);
  },
  changePassword: () => notImplemented("changePassword"),
  oauthCallback: () => notImplemented("oauthCallback"),
};

import { Roles } from "@e-clat/shared";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role as PrismaRole } from "@prisma/client";

vi.mock("../src/config/database", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/config/database")>();
  return {
    ...original,
    prisma: {
      ...original.prisma,
      employee: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { authService } from "../src/modules/auth/service";
import { verifyAccessToken, verifyRefreshToken } from "../src/modules/auth/tokens";
import { prisma } from "../src/config/database";

const mockedFindUnique = vi.mocked(prisma.employee.findUnique);

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns signed access and refresh tokens for a known mock user", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "8d0f3892-c796-478c-ae2e-cf995f5df9bd",
      email: "manager@example.com",
      role: PrismaRole.MANAGER,
      passwordHash: "$2b$10$hash",
      isActive: true,
    } as never);
    vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

    const tokens = await authService.login({
      email: "manager@example.com",
      password: "Password123!",
    });

    expect(tokens.expiresIn).toBeGreaterThan(0);
    expect(verifyAccessToken(tokens.accessToken)).toMatchObject({
      email: "manager@example.com",
      role: Roles.MANAGER,
    });
    expect(verifyRefreshToken(tokens.refreshToken)).toMatchObject({
      email: "manager@example.com",
      role: Roles.MANAGER,
    });
  });

  it("refreshes an access token from a valid refresh token", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "8d0f3892-c796-478c-ae2e-cf995f5df9bd",
      email: "manager@example.com",
      role: PrismaRole.MANAGER,
      passwordHash: "$2b$10$hash",
      isActive: true,
    } as never);
    vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

    const initialTokens = await authService.login({
      email: "manager@example.com",
      password: "Password123!",
    });

    const refreshedTokens = await authService.refreshToken({
      refreshToken: initialTokens.refreshToken,
    });

    expect(refreshedTokens.refreshToken).toBe(initialTokens.refreshToken);
    expect(verifyAccessToken(refreshedTokens.accessToken)).toMatchObject({
      email: "manager@example.com",
      role: Roles.MANAGER,
    });
  });

  it("rejects invalid credentials", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "8d0f3892-c796-478c-ae2e-cf995f5df9bd",
      email: "manager@example.com",
      role: PrismaRole.MANAGER,
      passwordHash: "$2b$10$hash",
      isActive: true,
    } as never);
    vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

    await expect(authService.login({
      email: "manager@example.com",
      password: "wrong-password",
    })).rejects.toThrow("Invalid email or password");
  });
});

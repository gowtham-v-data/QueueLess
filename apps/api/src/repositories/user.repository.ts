import { prisma } from '../config/prisma.js';

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: any) => prisma.user.create({ data }),
  updateById: (id: string, data: any) => prisma.user.update({ where: { id }, data }),
  createRefreshToken: (data: any) => prisma.refreshToken.create({ data }),
  findRefreshTokenByHash: (tokenHash: string) =>
    prisma.refreshToken.findUnique({ where: { tokenHash } }),
  revokeRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } }),
  revokeUserRefreshTokens: (userId: string) =>
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  findByEmailVerificationToken: (token: string) =>
    prisma.user.findFirst({ where: { emailVerificationToken: token } }),
  findByPasswordResetToken: (token: string) =>
    prisma.user.findFirst({ where: { passwordResetToken: token } })
};

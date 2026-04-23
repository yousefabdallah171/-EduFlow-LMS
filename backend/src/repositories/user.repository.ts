import type { Prisma, User } from "@prisma/client";

import { prisma } from "../config/database.js";

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findByOAuthId(oauthId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { oauthId } });
  },

  findByEmailVerifyToken(emailVerifyToken: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { emailVerifyToken } });
  },

  findByPasswordResetToken(passwordResetToken: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { passwordResetToken } });
  },

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data
    });
  },

  delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }
};

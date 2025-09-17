import { db } from "@repo/db";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: db as any, // Better-Auth Kysely adapter needs proper typing
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "parent",
        required: false,
      },
      profileId: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || ["http://localhost:3000"],
});

export type Auth = typeof auth;

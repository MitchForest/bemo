import { getDb, isDatabaseConfigured } from "@repo/db";
import { betterAuth } from "better-auth";

const baseAuthConfig = {
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
        defaultValue: "student",
        required: false,
      },
      profileId: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || ["http://localhost:3000"],
} as const;

const DEV_STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const DEV_SESSION_EXPIRES_AT = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

function createDisabledResponse(): Response {
  return new Response(
    JSON.stringify({
      message: "Authentication disabled. All requests are treated as the demo student.",
      studentId: DEV_STUDENT_ID,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

function createDisabledAuth(): ReturnType<typeof betterAuth> {
  const demoSession = {
    session: {
      id: "dev-session",
      userId: DEV_STUDENT_ID,
      expiresAt: DEV_SESSION_EXPIRES_AT,
    },
    user: {
      id: DEV_STUDENT_ID,
      role: "student" as const,
      email: "demo@student.bemo",
      name: "Demo Student",
    },
  };

  return {
    handler: async () => createDisabledResponse(),
    api: {
      async getSession() {
        return demoSession;
      },
      async signUpEmail() {
        return demoSession;
      },
      async signInEmail() {
        return demoSession;
      },
      async signOut() {
        return { success: true };
      },
    },
  } as unknown as ReturnType<typeof betterAuth>;
}

export const auth = isDatabaseConfigured()
  ? betterAuth({
      ...baseAuthConfig,
      database: getDb() as unknown as Parameters<typeof betterAuth>[0]["database"],
    })
  : createDisabledAuth();

export const authEnabled = isDatabaseConfigured();

export type Auth = typeof auth;

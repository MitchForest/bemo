import { z } from "@hono/zod-openapi";

export const UserRoleSchema = z.enum(["student", "parent", "coach", "admin"]).openapi({
  description: "User role",
  example: "student",
});

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: UserRoleSchema,
    profileId: z.string().uuid().optional().openapi({
      description: "Associated student/parent/coach profile ID",
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({
    description: "User account",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174005",
      email: "parent@example.com",
      name: "John Smith",
      role: "parent",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  });

export const SessionSchema = z
  .object({
    id: z.string(),
    userId: z.string().uuid(),
    expiresAt: z.string().datetime(),
    user: UserSchema.optional(),
  })
  .openapi({ description: "User session" });

export const LoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .openapi({ description: "Login request" });

export const SignupRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(100),
    role: UserRoleSchema.default("parent"),
    studentName: z.string().optional().openapi({
      description: "For parent signup with student",
    }),
    studentGrade: z.string().optional(),
  })
  .openapi({ description: "Signup request" });

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

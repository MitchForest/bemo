# @repo/auth

Better Auth configuration and utilities for secure authentication across the Bemo platform.

## Overview

This package provides centralized authentication configuration using Better Auth, ensuring consistent security practices across both API and web applications. It includes server-side auth configuration, client-side helpers, and session management utilities.

## Key Features

- **Better Auth Integration**: Modern authentication solution with built-in security
- **Session Management**: Secure session handling with automatic expiration
- **Email & Password**: Built-in email/password authentication
- **User Roles**: Role-based access control (parent, coach, admin)
- **Type Safety**: Full TypeScript support with proper type definitions
- **Multi-Tenant Ready**: Designed for organization-based isolation
- **Cookie Security**: Secure session cookies with proper configuration

## Architecture

```
src/
├── index.ts    # Main exports
├── server.ts   # Server-side auth configuration
└── client.ts   # Client-side auth helpers
```

## Core Exports

### Server Configuration

```typescript
import { auth } from "@repo/auth";
import type { Auth } from "@repo/auth";

// Pre-configured Better Auth instance
export const auth: Auth;

// Use in API routes
app.use("/api/auth/*", auth.handler);
```

### Client Utilities

```typescript
import { authClient, signIn, signUp, signOut } from "@repo/auth";

// Client-side authentication helpers
const client = authClient;
await signIn.email({ email, password });
await signUp.email({ email, password, name });
await signOut();
```

## Server-Side Usage

### API Integration

```typescript
// apps/api/src/app.ts
import { auth } from "@repo/auth";

// Mount auth routes
app.use("/api/auth/*", auth.handler);

// Protected route middleware
app.use("/api/protected/*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Add user to context
  c.set("user", session.user);
  c.set("session", session.session);
  
  await next();
});
```

### Session Validation

```typescript
import { auth } from "@repo/auth";

// Validate session in route handlers
app.get("/api/profile", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const { user } = session;
  
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profileId: user.profileId,
  });
});

// Role-based access control
app.get("/api/admin", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  
  if (!session || session.user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  // Admin-only logic
});
```

### User Management

```typescript
import { auth } from "@repo/auth";

// Create user programmatically
const user = await auth.api.signUpEmail({
  body: {
    email: "user@example.com",
    password: "secure-password",
    name: "John Doe",
    // Additional fields
    role: "parent",
    profileId: "profile-uuid",
  },
});

// Update user information
await auth.api.updateUser({
  body: {
    userId: user.id,
    name: "Updated Name",
    role: "coach",
  },
});
```

## Client-Side Usage

### React Hook Integration

```typescript
// hooks/useAuth.ts
import { authClient } from "@repo/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const session = await authClient.getSession();
      return session.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      email: string; 
      password: string; 
      name: string;
      role?: string;
    }) => {
      const result = await authClient.signUp.email(data);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
    },
  });
}
```

### Authentication Components

```typescript
// components/auth/LoginForm.tsx
import { useSignIn } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useSignIn();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn.mutate({ email, password });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button 
        type="submit" 
        disabled={signIn.isPending}
        className="w-full"
      >
        {signIn.isPending ? "Signing in..." : "Sign In"}
      </Button>
      {signIn.error && (
        <div className="text-red-500 text-sm">
          {signIn.error.message}
        </div>
      )}
    </form>
  );
}
```

### Authentication Guard

```typescript
// components/auth/AuthGuard.tsx
import { useSession } from "@/hooks/useAuth";
import { LoginForm } from "./LoginForm";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requiredRole, 
  fallback = <LoginForm /> 
}: AuthGuardProps) {
  const { data: session, isLoading } = useSession();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!session) {
    return fallback;
  }
  
  if (requiredRole && session.user.role !== requiredRole) {
    return <div>Access denied. Required role: {requiredRole}</div>;
  }
  
  return <>{children}</>;
}

// Usage in pages
export default function ProtectedPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboard />
    </AuthGuard>
  );
}
```

### Session Context Provider

```typescript
// providers/AuthProvider.tsx
import { createContext, useContext } from "react";
import { useSession } from "@/hooks/useAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useSession();
  
  return (
    <AuthContext.Provider 
      value={{
        user: session?.user || null,
        session: session?.session || null,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

## Configuration

### Environment Variables

```env
# Required for Better Auth
DATABASE_URL=postgresql://user:password@localhost:5432/bemo

# Authentication secrets
AUTH_SECRET=your-very-secure-secret-key-here
TRUSTED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Optional: Email provider configuration
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=auth@yourdomain.com
EMAIL_SERVER_PASSWORD=email-password
EMAIL_FROM=auth@yourdomain.com
```

### Server Configuration Details

```typescript
// src/server.ts configuration explained
export const auth = betterAuth({
  // Database integration
  database: db, // Uses @repo/db Kysely instance
  
  // Authentication methods
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  
  // Session management
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Update session daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,            // 5 minutes cache
    },
  },
  
  // Custom user fields
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
  
  // CORS configuration
  trustedOrigins: ["http://localhost:3000"], // Update for production
});
```

## Role-Based Access Control

### User Roles

```typescript
type UserRole = "parent" | "coach" | "admin";

// Role hierarchy
const roleHierarchy = {
  admin: ["admin", "coach", "parent"],
  coach: ["coach", "parent"], 
  parent: ["parent"],
};

// Role checking utility
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole]?.includes(requiredRole) ?? false;
}
```

### Permission Middleware

```typescript
// Middleware factory for role-based routes
export function requireRole(role: UserRole) {
  return async (c: Context, next: Next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    if (!hasRole(session.user.role, role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    
    c.set("user", session.user);
    await next();
  };
}

// Usage in routes
app.get("/api/admin/*", requireRole("admin"));
app.get("/api/coach/*", requireRole("coach"));
```

## Security Best Practices

### Session Security

- **HTTP-only cookies**: Prevents XSS attacks
- **Secure flag**: HTTPS-only in production
- **SameSite**: CSRF protection
- **Session rotation**: Regular session updates
- **Automatic expiration**: Time-based session cleanup

### Password Security

- **Bcrypt hashing**: Secure password storage
- **Password validation**: Enforced complexity rules
- **Rate limiting**: Prevent brute force attacks
- **Account lockout**: Temporary lockout after failures

### Database Security

- **Row-level security**: User data isolation
- **Prepared statements**: SQL injection prevention
- **Connection pooling**: Resource management
- **Audit logging**: Track authentication events

## Testing

### Mock Authentication

```typescript
// test/mocks/auth.ts
export const mockAuth = {
  api: {
    getSession: jest.fn(),
    signUpEmail: jest.fn(),
    signInEmail: jest.fn(),
  },
  handler: jest.fn(),
};

// Mock session data
export const mockSession = {
  session: {
    id: "session-id",
    userId: "user-id", 
    expiresAt: new Date(Date.now() + 86400000),
  },
  user: {
    id: "user-id",
    email: "test@example.com",
    name: "Test User",
    role: "parent",
    profileId: "profile-id",
  },
};

// In tests
mockAuth.api.getSession.mockResolvedValue(mockSession);
```

### Integration Tests

```typescript
// test/auth.test.ts
import { auth } from "@repo/auth";

describe("Authentication", () => {
  test("should create user with valid data", async () => {
    const result = await auth.api.signUpEmail({
      body: {
        email: "test@example.com",
        password: "secure-password",
        name: "Test User",
      },
    });
    
    expect(result.data).toBeDefined();
    expect(result.data.user.email).toBe("test@example.com");
  });
  
  test("should reject invalid session", async () => {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });
    
    expect(session).toBeNull();
  });
});
```

## Migration from Other Auth Solutions

### From NextAuth.js

- **Database schema**: Better Auth uses different table structure
- **Session handling**: Different cookie format and validation
- **Providers**: Built-in email/password, external providers available
- **Type safety**: Better TypeScript integration

### Custom Auth Migration

- **Password hashing**: Migrate to bcrypt if using different algorithm
- **Session format**: Update session validation logic
- **User fields**: Map existing user data to Better Auth schema
- **API routes**: Replace custom auth endpoints with Better Auth

## Dependencies

- **better-auth**: Modern authentication solution
- **@repo/db**: Database integration with Kysely
- **@repo/schemas**: Type definitions for user data

This package provides secure, type-safe authentication that integrates seamlessly with the rest of the Bemo platform, ensuring consistent security practices across all applications.
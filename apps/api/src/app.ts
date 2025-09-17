import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import { apiReference } from "@scalar/hono-api-reference";
import evidenceRoutes from "./routes/evidence";
import planRoutes from "./routes/plan";

export const app = new OpenAPIHono();

// Auth routes
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.route("/", planRoutes);
app.route("/", evidenceRoutes);

// OpenAPI documentation
app.doc("/doc", {
  openapi: "3.1.0",
  info: {
    title: "Bemo Learning API",
    version: "1.0.0",
    description: "Learning engine API for Pre-K to Grade 1",
  },
});

// Swagger UI
app.get("/swagger", swaggerUI({ url: "/doc" }));

// Scalar API Reference
app.get(
  "/reference",
  apiReference({
    spec: { url: "/doc" },
    layout: "modern",
  }),
);

export type AppType = typeof app;

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "./types";

export function createOpenAPIApp() {
  const app = new OpenAPIHono<Env>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              message: "Validation error",
              issues: result.error.issues,
            },
          },
          400,
        );
      }
    },
  });

  // Set OpenAPI documentation
  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Bemo Learning API",
      description: "AI-powered adaptive learning platform API",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3001",
        description: "API Server",
      },
    ],
  });

  return app;
}

import { hc } from "hono/client";
import type { AppType } from "../../../apps/api/src/app";

export const createClient = (base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") => {
  return hc<AppType>(base);
};

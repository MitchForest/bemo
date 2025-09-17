import { app } from "./app";

const port = process.env.PORT || 8000;

console.log(`🚀 Server starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

import { defineConfig } from "drizzle-kit";

const ur = process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: ["./shared/schema.ts", "./shared/supplierSchema.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: ur as string,
  },
});

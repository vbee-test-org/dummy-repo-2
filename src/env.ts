import { z } from "zod";

const schema = z.object({
  PORT: z.coerce
    .number({ required_error: "PORT is required" })
    .min(1024, "PORT must be >= 1024")
    .max(65535, "PORT must be <= 65535"),
  MONGO_URI: z
    .string({ required_error: "MONGO_URI is required" })
    .url("Expected MONGO_URI to be url"),
  MONGO_DB_NAME: z.string({ required_error: "MONGO_DB_NAME is required" }),
  GH_PAT: z.string({ required_error: "GH_PAT is required" }).startsWith("ghp_"),
  REDIS_URL: z.string({ required_error: "REDIS_URL is required" }),
  REDIS_TOKEN: z.string({ required_error: "REDIS_TOKEN is required" }),
  REDIS_PORT: z.coerce
    .number({ required_error: "REDIS_PORT is required" })
    .min(1024, "REDIS_PORT must be >= 1024")
    .max(65535, "REDIS_PORT must be <= 65535"),
});

export type Env = z.infer<typeof schema>;

let env: Env;
try {
  env = schema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(error.errors, null, 2),
    );
  } else {
    console.error("❌ Error parsing environment variables:", error);
  }
  process.exit(1);
}

export default env;

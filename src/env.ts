import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().min(0).max(65535),
  MONGO_URI: z.string().url(),
  MONGO_DB_NAME: z.string(),
  GH_PAT: z.string().startsWith("ghp_"),
});

const env = schema.parse(process.env);

export default env;

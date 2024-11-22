import { User } from "@/models";

declare module "express-session" {
  interface SessionData {
    user: User;
  }
}

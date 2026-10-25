import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id?: string; role?: "admin" | "editor" | "viewer"; mustChange?: boolean } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "editor" | "viewer";
    uid?: string;
    mustChange?: boolean;
  }
}

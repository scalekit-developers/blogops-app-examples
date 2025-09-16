import { authConfig } from "@/lib/authOptions";
import NextAuth from "next-auth";

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

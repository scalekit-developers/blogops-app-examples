import NextAuth from "next-auth";
import { authConfig } from "./src/lib/authOptions";

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

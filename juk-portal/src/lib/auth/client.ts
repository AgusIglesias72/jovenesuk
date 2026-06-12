import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // En el browser, siempre el mismo origin: el dev server puede correr en 3000 o
  // 3001 y un baseURL fijo rompería el login en el otro puerto. El env queda
  // como fallback para contextos sin window.
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
});

export const { signIn, signOut, signUp, useSession } = authClient;

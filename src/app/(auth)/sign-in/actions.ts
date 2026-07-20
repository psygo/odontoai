"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function signInAction(_prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "E-mail ou senha inválidos.";
        default:
          return "Não foi possível entrar. Tente novamente.";
      }
    }
    throw error;
  }
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "./actions";

export default function SignInPage() {
  const [errorMessage, formAction, isPending] = useActionState(signInAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Entrar</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border border-black/15 dark:border-white/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-black/15 dark:border-white/20 px-3 py-2 text-sm"
        />
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-sm text-center text-black/60 dark:text-white/60">
        Ainda não tem uma conta?{" "}
        <Link href="/sign-up" className="underline">
          Criar conta da clínica
        </Link>
      </p>
    </form>
  );
}

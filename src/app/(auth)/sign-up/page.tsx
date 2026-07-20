"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "./actions";

export default function SignUpPage() {
  const [errorMessage, formAction, isPending] = useActionState(signUpAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Criar conta da clínica</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="clinicName" className="text-sm">
          Nome da clínica
        </label>
        <input
          id="clinicName"
          name="clinicName"
          type="text"
          required
          className="rounded border border-black/15 dark:border-white/20 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          Seu nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="rounded border border-black/15 dark:border-white/20 px-3 py-2 text-sm"
        />
      </div>

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
          minLength={8}
          autoComplete="new-password"
          className="rounded border border-black/15 dark:border-white/20 px-3 py-2 text-sm"
        />
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Criando..." : "Criar conta"}
      </button>

      <p className="text-sm text-center text-black/60 dark:text-white/60">
        Já tem uma conta?{" "}
        <Link href="/sign-in" className="underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

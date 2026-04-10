"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RoleOption = {
  key: string;
  name: string;
  description: string | null;
};

type InitialUser = {
  id: string;
  name: string;
  passportNumber: string;
  email: string;
  isActive: boolean;
  roleKeys: string[];
};

type UserFormProps = {
  mode: "create" | "edit";
  roleOptions: RoleOption[];
  initialUser?: InitialUser;
};

export function UserForm({ mode, roleOptions, initialUser }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialUser?.name ?? "");
  const [passportNumber, setPassportNumber] = useState(initialUser?.passportNumber ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initialUser?.isActive ?? true);
  const [roleKeys, setRoleKeys] = useState<string[]>(() => {
    if (initialUser?.roleKeys?.length) {
      return initialUser.roleKeys;
    }

    if (mode === "create" && roleOptions.length > 0) {
      const operadorRole = roleOptions.find((role) => role.key === "operador");
      return [operadorRole?.key ?? roleOptions[0].key];
    }

    return [];
  });

  function toggleRole(roleKey: string, checked: boolean) {
    setRoleKeys((current) => {
      if (checked) {
        return Array.from(new Set([...current, roleKey]));
      }

      return current.filter((value) => value !== roleKey);
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const sanitizedName = name.trim();
    const sanitizedPassport = passportNumber.trim().toUpperCase();
    const sanitizedEmail = email.trim().toLowerCase();

    if (sanitizedName.length < 2) {
      setError("Informe um nome valido com ao menos 2 caracteres.");
      return;
    }

    if (sanitizedPassport.length < 3) {
      setError("Informe um passaporte valido.");
      return;
    }

    if (sanitizedEmail.length < 5) {
      setError("Informe um email valido.");
      return;
    }

    if (roleKeys.length === 0) {
      setError("Selecione ao menos um perfil de permissao.");
      return;
    }

    if (mode === "create" && password.trim().length < 8) {
      setError("A senha precisa ter no minimo 8 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === "create" ? "/api/users" : `/api/users/${initialUser?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sanitizedName,
          passportNumber: sanitizedPassport,
          email: sanitizedEmail,
          password: password.trim().length > 0 ? password : undefined,
          roleKeys,
          isActive,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sua sessao expirou. Entre novamente para continuar.");
        }

        if (response.status === 403) {
          throw new Error("Voce nao tem permissao para cadastrar usuarios.");
        }

        throw new Error(payload?.error ?? "Falha ao salvar usuario");
      }

      router.push("/settings/users");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isSubmitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-2xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-sky-400" />
            Salvando cadastro...
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="card space-y-4 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase text-slate-400">Nome</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="input" required />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase text-slate-400">Passaporte</span>
          <input
            value={passportNumber}
            onChange={(event) => setPassportNumber(event.target.value.toUpperCase())}
            className="input"
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase text-slate-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            required
          />
          <span className="text-xs text-slate-500">Contato complementar (nao usado como chave principal).</span>
        </label>
        </div>

        <label className="space-y-1">
          <span className="text-xs uppercase text-slate-400">
            Senha {mode === "create" ? "(obrigatoria)" : "(opcional para alterar)"}
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            minLength={mode === "create" ? 8 : undefined}
            required={mode === "create"}
          />
        </label>

        <div className="rounded-xl border border-slate-700 bg-slate-900/55 p-3">
          <p className="text-xs uppercase text-slate-400">Perfis de permissao</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {roleOptions.map((role) => {
              const checked = roleKeys.includes(role.key);

              return (
                <label key={role.key} className="flex items-start gap-2 rounded-lg border border-slate-800 p-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleRole(role.key, event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">{role.name}</span>
                    <span className="block text-xs text-slate-400">{role.key}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Usuario ativo
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => router.push("/settings/users")}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : mode === "create" ? "Cadastrar usuario" : "Salvar alteracoes"}
          </button>
        </div>
      </form>
    </>
  );
}

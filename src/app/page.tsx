import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function Home() {
  const user = await getCurrentAuthUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-44px)] w-full max-w-6xl items-center justify-center px-4 py-10 md:px-8">
      <section className="glass-panel w-full max-w-5xl overflow-hidden rounded-3xl p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div className="space-y-4">
            <p className="inline-block rounded-full border border-sky-400/35 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
              Ambiente RP
            </p>
            <h2 className="text-4xl uppercase leading-tight text-slate-100 md:text-5xl">
              Central de solicitacoes com acesso seguro por passaporte
            </h2>
            <p className="max-w-2xl text-sm text-slate-300 md:text-base">
              Use seu numero de passaporte e senha para acessar o painel administrativo.
              O acesso respeita os perfis e permissoes cadastrados no sistema.
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

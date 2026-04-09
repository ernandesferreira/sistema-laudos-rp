import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <section className="card overflow-hidden p-6 shadow-sm md:p-10">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              Sistema de Laudos RP
            </p>
            <h1 className="text-4xl uppercase text-ink md:text-5xl">
              Plataforma ficticia para laudos em roleplay
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
              Crie modelos dinâmicos, organize secoes e campos, compartilhe
              formularios publicos e acompanhe submisses em um painel
              administrativo profissional.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary">
                Ir para painel
              </Link>
              <Link href="/templates" className="btn-secondary">
                Gerenciar modelos
              </Link>
            </div>
          </div>

          <div className="card border-brand-300 bg-brand-50 p-5">
            <h2 className="text-2xl uppercase text-brand-700">
              Aviso importante
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              Este sistema e totalmente ficticio e foi criado para ambientes RP.
              Nao substitui laudos, processos ou documentos oficiais reais.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

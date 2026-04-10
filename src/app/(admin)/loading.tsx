export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card flex items-center gap-3 px-5 py-4 text-sm text-slate-200">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400" />
        Carregando pagina...
      </div>
    </div>
  );
}

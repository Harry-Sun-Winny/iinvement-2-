export default function NotFoundPage() {
  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-black text-white">Khong tim thay trang</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Trang ban mo khong ton tai hoac da duoc di chuyen. Hay quay lai dashboard de tiep tuc.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200"
        >
          Ve dashboard
        </a>
      </div>
    </div>
  );
}

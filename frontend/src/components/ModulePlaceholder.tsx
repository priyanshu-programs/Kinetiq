export function ModulePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 max-w-2xl text-slate-600">{description}</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        <p className="font-medium">Coming soon</p>
        <p className="mt-1 text-sm">This module is implemented in {phase}.</p>
      </div>
    </div>
  );
}

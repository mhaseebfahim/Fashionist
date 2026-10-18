import { Skeleton } from '../components/ui.jsx';

export function PageHead({ title, sub, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <p className="label text-gold">Admin</p>
        <h1 className="mt-2 text-4xl md:text-5xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export const Table = ({ head, children }) => (
  <div className="overflow-x-auto border border-line bg-bg">
    <table className="w-full min-w-[640px] text-sm">
      <thead className="border-b border-line bg-surface">
        <tr>{head.map((h, i) => <th key={i} className="label px-4 py-3 text-start text-[10px] text-muted">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  </div>
);

export const Rows = ({ n = 5, cols }) => Array.from({ length: n }).map((_, i) => <tr key={i}><td colSpan={cols} className="p-3"><Skeleton className="h-8" /></td></tr>);

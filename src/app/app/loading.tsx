export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="animate-pulse">
      <div className="h-7 w-48 rounded bg-surface-2" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-surface-2" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-ui bg-surface-2" />)}
      </div>
      <div className="mt-4 h-64 rounded-ui bg-surface-2" />
    </div>
  );
}

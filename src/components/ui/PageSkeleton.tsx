export default function PageSkeleton() {
  return (
    <div className="p-6 sm:p-8 space-y-4 animate-pulse">
      <div className="h-8 bg-espresso-100 rounded-lg w-64" />
      <div className="h-4 bg-espresso-100 rounded w-96 max-w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-espresso-100 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-espresso-100 rounded-xl mt-4" />
    </div>
  );
}

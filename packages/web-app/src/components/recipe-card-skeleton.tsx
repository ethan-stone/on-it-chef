import { Skeleton } from "./skeleton";

export function RecipeCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-10 w-full mb-3" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function RecipeListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

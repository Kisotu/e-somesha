import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between pb-4">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="border rounded-lg p-2 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-2">
            {Array.from({ length: cols }).map((_, j) => (
               <Skeleton key={j} className="h-6 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
         <div className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-3 w-[80px]" />
         </div>
         <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

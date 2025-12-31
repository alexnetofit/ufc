import { Skeleton, StatCardSkeleton } from '@/components/ui';

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-10 w-32 mb-6" />
      
      <div className="bg-ufc-gray-900 border border-ufc-gray-700 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );
}



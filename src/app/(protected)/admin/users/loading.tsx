import { Skeleton, TableRowSkeleton } from '@/components/ui';

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="bg-ufc-gray-900 border border-ufc-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-ufc-gray-700">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
      </div>
    </div>
  );
}









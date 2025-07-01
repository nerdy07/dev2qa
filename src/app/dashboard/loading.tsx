import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
            <div className="grid gap-1">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-80" />
            </div>
        </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[109px] w-full" />
        <Skeleton className="h-[109px] w-full" />
        <Skeleton className="h-[109px] w-full" />
        <Skeleton className="h-[109px] w-full" />
      </div>
      <div className="mt-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="rounded-lg border shadow-sm">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-5 w-32" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell"><Skeleton className="h-5 w-24" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell"><Skeleton className="h-5 w-24" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell"><Skeleton className="h-5 w-20" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-5 w-16" /></th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground"><Skeleton className="h-5 w-16" /></th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {[...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-40" /></td>
                                <td className="p-4 align-middle hidden md:table-cell"><Skeleton className="h-5 w-28" /></td>
                                <td className="p-4 align-middle hidden lg:table-cell"><Skeleton className="h-5 w-28" /></td>
                                <td className="p-4 align-middle hidden sm:table-cell"><Skeleton className="h-5 w-24" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                <td className="p-4 align-middle text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}

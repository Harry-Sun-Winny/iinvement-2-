import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="min-h-screen space-y-4 bg-[#050816] p-6"><Skeleton className="h-16 w-full bg-white/[0.06]" /><Skeleton className="h-44 w-full bg-white/[0.06]" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 bg-white/[0.06]" />)}</div><Skeleton className="h-[520px] w-full bg-white/[0.06]" /></div>;
}

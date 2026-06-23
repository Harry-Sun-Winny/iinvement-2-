import { CalendarX2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-label="Đang tải lịch">
      {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-12 w-full bg-white/[0.07]" />)}
    </div>
  );
}

export function CalendarEmptyState() {
  return (
    <Card className="border-dashed border-white/10 bg-slate-950/30 shadow-none">
      <CardContent className="grid min-h-64 place-items-center p-8 text-center">
        <div>
          <CalendarX2 className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 font-medium text-white">Không có sự kiện phù hợp</p>
          <p className="mt-1 text-sm text-slate-500">Thử đổi khoảng ngày hoặc đặt lại bộ lọc.</p>
        </div>
      </CardContent>
    </Card>
  );
}

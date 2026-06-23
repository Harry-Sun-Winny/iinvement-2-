"use client";

import { memo } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarFiltersState } from "@/types/calendar";

interface CalendarFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: CalendarFiltersState;
  onFilterChange: (key: keyof CalendarFiltersState, value: string) => void;
  onReset: () => void;
  countries: string[];
  sectors: string[];
  eventTypes: string[];
}

function FilterSelect({ value, placeholder, values, onChange }: { value: string; placeholder: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full border-white/10 bg-slate-950/60 sm:w-44" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {values.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function CalendarFilters({ search, onSearchChange, filters, onFilterChange, onReset, countries, sectors, eventTypes }: CalendarFiltersProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center" aria-label="Calendar filters">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <Input value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Tìm sự kiện, mã, công ty..." className="border-white/10 bg-slate-950/60 pl-9" aria-label="Tìm kiếm sự kiện" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <FilterSelect value={filters.country} placeholder="Tất cả quốc gia" values={countries} onChange={value => onFilterChange("country", value)} />
        <FilterSelect value={filters.impact} placeholder="Mọi ảnh hưởng" values={["High", "Medium", "Low"]} onChange={value => onFilterChange("impact", value)} />
        <FilterSelect value={filters.sector} placeholder="Tất cả ngành" values={sectors} onChange={value => onFilterChange("sector", value)} />
        <FilterSelect value={filters.eventType} placeholder="Mọi loại sự kiện" values={eventTypes} onChange={value => onFilterChange("eventType", value)} />
        <Button variant="outline" size="icon" onClick={onReset} aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default memo(CalendarFilters);

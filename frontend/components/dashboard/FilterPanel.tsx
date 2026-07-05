"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";

interface Props {
  sectors: string[];
  countries: string[];
  selectedSectors: string[];
  selectedCountries: string[];
  onToggleSector: (sector: string) => void;
  onToggleCountry: (country: string) => void;
  onClear: () => void;
}

export function FilterPanel({ sectors, countries, selectedSectors, selectedCountries, onToggleSector, onToggleCountry, onClear }: Props) {
  const [sectorSearch, setSectorSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

  const filteredSectors = useMemo(() => {
    return sectors.filter(s => s.toLowerCase().includes(sectorSearch.toLowerCase()));
  }, [sectors, sectorSearch]);

  const filteredCountries = useMemo(() => {
    return countries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [countries, countrySearch]);

  return (
    <div className="antigravity-panel space-y-6 border-white/5 p-6 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">Sectors (Ngành)</h3>
          <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/20">{sectors.length}</Badge>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input 
            placeholder="Tìm kiếm ngành..." 
            className="pl-8 h-9 text-xs bg-black/20 border-white/5 focus-visible:ring-red-500/50"
            value={sectorSearch}
            onChange={(e) => setSectorSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredSectors.map(s => (
            <Button
              key={s}
              variant={selectedSectors.includes(s) ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleSector(s)}
              className={`justify-start px-3 py-1.5 text-xs transition-all w-full text-left font-medium ${
                selectedSectors.includes(s) 
                ? "bg-red-600 text-white hover:bg-red-700 border-red-500 shadow-lg shadow-red-500/20" 
                : "bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              }`}
              title={s}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Countries (Quốc gia)</h3>
          <Badge className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">{countries.length}</Badge>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input 
            placeholder="Tìm kiếm quốc gia..." 
            className="pl-8 h-9 text-xs bg-black/20 border-white/5 focus-visible:ring-amber-500/50"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredCountries.map(c => (
            <Button
              key={c}
              variant={selectedCountries.includes(c) ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleCountry(c)}
              className={`justify-start px-3 py-1.5 text-xs transition-all w-full text-left font-medium ${
                selectedCountries.includes(c) 
                ? "bg-amber-600 text-slate-950 font-bold hover:bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20" 
                : "bg-transparent border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              }`}
              title={c}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>
      <Button variant="ghost" className="w-full text-slate-500 hover:text-white" onClick={onClear}>
        <X className="mr-2 h-4 w-4" /> Clear All Filters
      </Button>
    </div>
  );
}

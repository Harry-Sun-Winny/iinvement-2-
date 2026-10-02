import React, { useState } from "react";
import { useTranslation } from "@/components/providers/I18nProvider";
import { MarketTheme, MarketThemeId } from "../themes/marketThemes";
import { Palette, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketAppearanceMenuProps {
  themes: readonly MarketTheme[];
  selectedThemeId: MarketThemeId;
  onThemeChange: (id: MarketThemeId) => void;
  customPanelBg: string;
  onCustomPanelBgChange: (bg: string) => void;
  onReset: () => void;
}

export default function MarketAppearanceMenu({
  themes,
  selectedThemeId,
  onThemeChange,
  customPanelBg,
  onCustomPanelBgChange,
  onReset,
}: MarketAppearanceMenuProps) {
  const { language } = useTranslation();
  const isVi = language === "vi";
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [colorInput, setColorInput] = useState(() => {
    if (customPanelBg && customPanelBg.includes("#")) {
      const match = customPanelBg.match(/#[0-9a-fA-F]{6}/);
      if (match) return match[0];
    }
    return "#1e1b4b";
  });

  return (
    <div className="relative z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 rounded-2xl border border-[var(--market-accent)]/40 bg-[var(--market-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--market-text-primary)] shadow-[0_0_15px_rgba(33,197,139,0.15)] transition hover:bg-[var(--market-accent-soft)]/25 hover:border-[var(--market-accent)] hover:scale-[1.02] active:scale-[0.98]"
        title={isVi ? "Cài đặt 72 bảng màu sắc" : "Configure 72 Color Themes"}
      >
        <Palette className="h-4 w-4 animate-pulse text-[var(--market-accent)]" />
        <span>{isVi ? "Cài đặt 72 Bảng màu" : "72 Color Presets Settings"}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop to close click outside */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2.5 w-80 rounded-3xl border border-[var(--market-border)] bg-[var(--market-surface-elevated)] p-4 shadow-2xl z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--market-border)] pb-2.5 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--market-text-primary)]">
                {isVi ? "Màu sắc thị trường" : "Market Board Themes"}
              </span>
              <button
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--market-text-muted)] hover:text-[var(--market-accent)] transition"
                title={isVi ? "Khôi phục mặc định" : "Restore defaults"}
              >
                <RotateCcw className="h-3 w-3" />
                <span>{isVi ? "Mặc định" : "Reset"}</span>
              </button>
            </div>

            <div className="flex gap-2 border-b border-[var(--market-border)] pb-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("preset")}
                className={`flex-1 pb-1.5 text-xs font-bold transition text-center ${
                  activeTab === "preset"
                    ? "border-b-2 border-[var(--market-accent)] text-[var(--market-accent)]"
                    : "text-[var(--market-text-muted)] hover:text-[var(--market-text-primary)]"
                }`}
              >
                {isVi ? "72 Bảng màu" : "72 Presets"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`flex-1 pb-1.5 text-xs font-bold transition text-center ${
                  activeTab === "custom"
                    ? "border-b-2 border-[var(--market-accent)] text-[var(--market-accent)]"
                    : "text-[var(--market-text-muted)] hover:text-[var(--market-text-primary)]"
                }`}
              >
                {isVi ? "Tự chọn (Photoshop)" : "Photoshop Picker"}
              </button>
            </div>

            {activeTab === "preset" ? (
              <div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto pr-1.5 custom-scrollbar">
                {themes.map((theme) => {
                  const isSelected = theme.id === selectedThemeId && !customPanelBg;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onThemeChange(theme.id);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between w-full p-2 rounded-2xl border transition text-left ${
                        isSelected
                          ? "border-[var(--market-accent)] bg-[var(--market-selection)]"
                          : "border-transparent hover:bg-[var(--market-surface-hover)]"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--market-text-primary)]">
                          {isVi ? theme.nameVi : theme.nameEn}
                        </span>
                        <span className="text-[9px] text-[var(--market-text-muted)]">
                          {theme.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Gradient Preview Bar */}
                        <div
                          className="h-5 w-24 rounded-lg shadow-sm border border-white/10"
                          style={{ background: theme.panelBg }}
                          title="Panel Background Gradient"
                        />

                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-[var(--market-accent)] shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 rounded-xl border border-white/10 overflow-hidden shadow-inner">
                    <input
                      type="color"
                      value={colorInput}
                      onChange={(event) => {
                        const val = event.target.value;
                        setColorInput(val);
                        // Generate a premium gradient from the chosen color to a darker shade
                        onCustomPanelBgChange(`linear-gradient(135deg, ${val} 0%, #0d0b14 100%)`);
                      }}
                      className="absolute inset-[-8px] h-20 w-20 cursor-pointer border-0 p-0"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--market-text-primary)]">
                      {isVi ? "Chọn màu Photoshop" : "Photoshop Color Picker"}
                    </p>
                    <p className="text-[10px] text-[var(--market-text-muted)] truncate">
                      {isVi ? "Bấm vào ô vuông để chọn màu" : "Click box to pick any color"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--market-text-muted)]">
                    {isVi ? "Mã màu CSS Gradient / Hex" : "CSS Gradient / Hex Input"}
                  </span>
                  <input
                    value={customPanelBg || colorInput}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (val.trim()) {
                        onCustomPanelBgChange(val);
                        if (val.startsWith("#")) {
                          setColorInput(val);
                        }
                      }
                    }}
                    placeholder="e.g. #1e1b4b or linear-gradient(...)"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--market-accent)]"
                  />
                </div>

                {customPanelBg && (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3 text-[10px] text-emerald-200">
                    {isVi ? "✓ Màu tự chọn đang được kích hoạt làm nền bảng." : "✓ Custom color is active as panel background."}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

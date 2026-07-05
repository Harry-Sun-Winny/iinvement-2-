"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTheme, AccentTheme, TextTheme, BackgroundTheme } from "./providers/ThemeProvider";

interface AppearanceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCENT_OPTIONS: { name: AccentTheme; label: string; color: string }[] = [
  { name: "emerald", label: "Emerald", color: "#10B981" },
  { name: "blue", label: "Blue", color: "#3B82F6" },
  { name: "purple", label: "Purple", color: "#8B5CF6" },
  { name: "pink", label: "Pink", color: "#EC4899" },
  { name: "orange", label: "Orange", color: "#F97316" },
  { name: "gold", label: "Gold", color: "#F59E0B" },
  { name: "cyan", label: "Cyan", color: "#06B6D4" },
  { name: "red", label: "Red", color: "#EF4444" },
  { name: "indigo", label: "Indigo", color: "#6366F1" },
  { name: "white", label: "White", color: "#F8FAFC" },
];

const TEXT_OPTIONS: { name: TextTheme; label: string; color: string }[] = [
  { name: "white", label: "White", color: "#FFFFFF" },
  { name: "light-gray", label: "Light Gray", color: "#F1F5F9" },
  { name: "silver", label: "Silver", color: "#CBD5E1" },
  { name: "blue", label: "Blue", color: "#60A5FA" },
  { name: "emerald", label: "Emerald", color: "#34D399" },
  { name: "purple", label: "Purple", color: "#A78BFA" },
  { name: "pink", label: "Pink", color: "#F472B6" },
  { name: "orange", label: "Orange", color: "#FB923C" },
  { name: "gold", label: "Gold", color: "#FBBF24" },
  { name: "black", label: "Black", color: "#0F172A" },
];

const BACKGROUND_OPTIONS: { name: BackgroundTheme; label: string }[] = [
  { name: "dark", label: "Mặc định tối (Dark)" },
  { name: "bg-1", label: "Tuyển cảnh 1 (Snow)" },
  { name: "bg-2", label: "Tuyển cảnh 2 (Snow)" },
  { name: "bg-3", label: "Sakura Điện Cổ" },
  { name: "bg-4", label: "Sakura Dòng Sông" },
  { name: "bg-5", label: "Thảm Hoa Sakura" },
  { name: "sakura-castle", label: "Sakura Điện Cổ" },
  { name: "sakura-garden", label: "Sakura Sân Vườn" },
  { name: "sakura-pagoda", label: "Sakura Chùa Tháp" },
  { name: "sakura-river", label: "Sakura Dòng Sông" },
];

export default function AppearanceSettings({ open, onOpenChange }: AppearanceSettingsProps) {
  const { settings, updateSettings } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/5 bg-[#16131D] text-slate-100 sm:max-w-md p-6 rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white tracking-wide">Cài đặt giao diện</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Tùy biến không gian làm việc của bạn. Cài đặt được lưu tự động.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Accent Color Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2.5">Màu Accent chủ đạo</label>
            <div className="grid grid-cols-5 gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => updateSettings({ accent: opt.name })}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                    settings.accent === opt.name
                      ? "border-sky-500 bg-white/10 text-white"
                      : "border-transparent bg-white/[0.02] text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/10 shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Color Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2.5">Màu chữ nội dung</label>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => updateSettings({ text: opt.name })}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                    settings.text === opt.name
                      ? "border-sky-500 bg-white/10 text-white"
                      : "border-transparent bg-white/[0.02] text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/10 shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Photoshop-style Colors */}
          <div className="border-t border-white/5 pt-4">
            <label className="text-xs font-semibold text-slate-400 block mb-2.5">
              Tùy chỉnh màu tự do (Photoshop Color Picker)
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/[0.01] p-2 rounded-lg border border-white/5">
                <span className="text-xs text-slate-300">Màu Accent</span>
                <input
                  type="color"
                  value={settings.accent.startsWith("#") ? settings.accent : "#8B5CF6"}
                  onChange={(e) => updateSettings({ accent: e.target.value as any })}
                  className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                />
              </div>

              <div className="flex items-center justify-between bg-white/[0.01] p-2 rounded-lg border border-white/5">
                <span className="text-xs text-slate-300">Màu chữ</span>
                <input
                  type="color"
                  value={settings.text.startsWith("#") ? settings.text : "#CBD5E1"}
                  onChange={(e) => updateSettings({ text: e.target.value as any })}
                  className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                />
              </div>

              <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Màu bảng</span>
                  <input
                    type="color"
                    value={settings.tableColor || "#1A1622"}
                    onChange={(e) => updateSettings({ tableColor: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Màu thanh bên (Panel)</span>
                  <input
                    type="color"
                    value={settings.panelColor || "#16131D"}
                    onChange={(e) => updateSettings({ panelColor: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Màu thẻ (Card)</span>
                  <input
                    type="color"
                    value={settings.cardColor || "#1C1825"}
                    onChange={(e) => updateSettings({ cardColor: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                  />
                </div>
                
                {/* Opacity slider */}
                <div className="flex flex-col gap-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Độ trong suốt (Photoshop Opacity)</span>
                    <span className="text-xs font-mono text-slate-400">{settings.panelOpacity ?? 72}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.panelOpacity ?? 72}
                    onChange={(e) => updateSettings({ panelOpacity: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Background Selection */}
          <div className="border-t border-white/5 pt-4">
            <label className="text-xs font-semibold text-slate-400 block mb-2.5">Hình nền hệ thống</label>
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUND_OPTIONS.map((opt) => {
                const bgUrl = opt.name === "dark" 
                  ? "" 
                  : opt.name === "bg-1" ? "/backgrounds/background-1.webp"
                  : opt.name === "bg-2" ? "/backgrounds/background-2.webp"
                  : opt.name === "bg-3" ? "/backgrounds/background-3.webp"
                  : opt.name === "bg-4" ? "/backgrounds/background-4.webp"
                  : opt.name === "bg-5" ? "/backgrounds/background-5.webp"
                  : opt.name === "sakura-castle" ? "/bg-sakura-castle.jpg"
                  : opt.name === "sakura-garden" ? "/bg-sakura-garden.jpg"
                  : opt.name === "sakura-pagoda" ? "/bg-sakura-pagoda.jpg"
                  : "/bg-sakura-river.jpg";

                return (
                  <button
                    key={opt.name}
                    onClick={() => updateSettings({ background: opt.name })}
                    className={`relative h-16 w-full rounded-lg overflow-hidden border-2 text-left transition-all group ${
                      settings.background === opt.name
                        ? "border-sky-500 shadow-md shadow-sky-500/20"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    {opt.name === "dark" ? (
                      <div className="absolute inset-0 bg-[#0A0A0F]" />
                    ) : (
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundImage: `url('${bgUrl}')` }}
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs py-1 px-1.5 text-center">
                      <p className="text-[10px] font-bold text-white truncate">{opt.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-4 border-t border-white/5 pt-4">
            {/* Sakura & Snow toggles */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-200">Hiệu ứng Hoa Đào Rơi</label>
                <p className="text-[10px] text-slate-400">Kích hoạt cánh hoa anh đào rơi</p>
              </div>
              <input
                type="checkbox"
                checked={settings.sakuraEnabled}
                onChange={(e) => updateSettings({ sakuraEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-200">Hiệu ứng Tuyết Rơi</label>
                <p className="text-[10px] text-slate-400">Kích hoạt hiệu ứng bông tuyết rơi</p>
              </div>
              <input
                type="checkbox"
                checked={settings.snowEnabled}
                onChange={(e) => updateSettings({ snowEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
              />
            </div>

            {/* Reduced motion toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-200">Giảm chuyển động (Reduced Motion)</label>
                <p className="text-[10px] text-slate-400">Tắt toàn bộ hiệu ứng rơi và chuyển động nhanh</p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
              />
            </div>

            {/* Density & Speed sliders */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Mật độ hạt rơi: {settings.density}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.density}
                onChange={(e) => updateSettings({ density: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Tốc độ chuyển động: {settings.speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.speed}
                onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

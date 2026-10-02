"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTheme, AccentTheme, TextTheme, BackgroundTheme, BACKGROUND_ASSETS } from "./providers/ThemeProvider";
import { MARKET_THEMES } from "@/app/market/themes/marketThemes";
import { Check } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";

import { SAKURA_ONLINE_WALLPAPERS } from "@/app/lib/sakura-online-library";

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
  { name: "animated-gradient", label: "Dải màu động (Animated)" },
  { name: "bg-1", label: "Tuyển cảnh 1 (Snow)" },
  { name: "bg-2", label: "Tuyển cảnh 2 (Snow)" },
  { name: "bg-3", label: "Sakura Điện Cổ" },
  { name: "bg-4", label: "Sakura Dòng Sông" },
  { name: "bg-5", label: "Thảm Hoa Sakura" },
  { name: "sakura-castle", label: "Sakura Điện Cổ" },
  { name: "sakura-garden", label: "Sakura Sân Vườn" },
  { name: "sakura-pagoda", label: "Sakura Chùa Tháp" },
  { name: "sakura-river", label: "Sakura Dòng Sông" },
  { name: "tokyo-cherry-1", label: "Tokyo Hoa Đào I" },
  { name: "tokyo-cherry-2", label: "Tokyo Hoa Đào II" },
  { name: "tokyo-snow-1", label: "Tokyo Tuyết Rơi I" },
  { name: "tokyo-snow-2", label: "Tokyo Tuyết Rơi II" },
  { name: "tokyo-snow-3", label: "Tokyo Tuyết Rơi III" },
  { name: "tokyo-snow-4", label: "Tokyo Tuyết Rơi IV" },
  { name: "tokyo-snow-5", label: "Tokyo Tuyết Rơi V" },
  { name: "tokyo-snow-vector", label: "Tokyo Tuyết Vector" },
  { name: "japan-scene-1", label: "Cảnh Đẹp Nhật Bản I" },
  { name: "japan-scene-2", label: "Cảnh Đẹp Nhật Bản II" },
  { name: "japan-scene-3", label: "Cảnh Đẹp Nhật Bản III" },
  { name: "japan-scene-4", label: "Cảnh Đẹp Nhật Bản IV" },
];

export default function AppearanceSettings({ open, onOpenChange }: AppearanceSettingsProps) {
  const { settings, updateSettings } = useTheme();
  const { language } = useTranslation();
  const isVi = language === "vi";

  const [activeTab, setActiveTab] = useState<"special72" | "traditional" | "sakura500">(
    settings.marketThemeId ? "special72" : "traditional"
  );
  const [searchSakura, setSearchSakura] = useState("");

  const filteredSakura = SAKURA_ONLINE_WALLPAPERS.filter((s) =>
    s.label.toLowerCase().includes(searchSakura.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/5 bg-[#16131D] text-slate-100 sm:max-w-xl p-6 rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white tracking-wide">Cài đặt giao diện</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Tùy biến không gian làm việc của bạn. Cài đặt được lưu tự động.
          </DialogDescription>
        </DialogHeader>

        {/* Theme Mode Tabs */}
        <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-white/5 gap-1 mt-2">
          <button
            onClick={() => {
              setActiveTab("sakura500");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "sakura500"
                ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
            }`}
          >
            🌸 {isVi ? "550+ Ảnh Sakura" : "550+ Sakura HD"}
          </button>
          <button
            onClick={() => {
              setActiveTab("special72");
              if (!settings.marketThemeId) {
                updateSettings({ marketThemeId: MARKET_THEMES[0].id });
              }
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "special72"
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
            }`}
          >
            {isVi ? "Bảng 72 Màu" : "72 Themes"}
          </button>
          <button
            onClick={() => {
              setActiveTab("traditional");
              updateSettings({ marketThemeId: undefined });
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "traditional"
                ? "bg-white/10 text-white border border-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
            }`}
          >
            {isVi ? "Màu Truyền Thống" : "Traditional"}
          </button>
        </div>

        <div className="space-y-6 pt-4">
          {activeTab === "sakura500" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-pink-300">
                  Thư viện 550+ Ảnh Hoa Anh Đào Online (HD/4K)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {filteredSakura.length} hình ảnh
                </span>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm hình ảnh Sakura..."
                value={searchSakura}
                onChange={(e) => setSearchSakura(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
              />
              <div className="grid grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredSakura.slice(0, 120).map((sakura) => {
                  const isSelected = settings.background === sakura.url;
                  return (
                    <button
                      key={sakura.id}
                      onClick={() => updateSettings({ background: sakura.url as any })}
                      className={`relative h-20 w-full rounded-lg overflow-hidden border-2 text-left transition-all group ${
                        isSelected
                          ? "border-pink-500 shadow-lg shadow-pink-500/30 scale-[1.02]"
                          : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.01]"
                      }`}
                    >
                      <img
                        src={sakura.url}
                        alt={sakura.label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-xs p-1">
                        <p className="text-[9px] font-medium text-slate-200 truncate leading-tight">
                          {sakura.label}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full p-0.5">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : activeTab === "traditional" ? (
            <div className="space-y-6">
              {/* Accent Color Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2.5">Màu Accent chủ đạo</label>
                <div className="grid grid-cols-5 gap-2">
                  {ACCENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => updateSettings({ accent: opt.name, marketThemeId: undefined })}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        settings.accent === opt.name && !settings.marketThemeId
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
                      onChange={(e) => updateSettings({ accent: e.target.value as any, marketThemeId: undefined })}
                      className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                    />
                  </div>

                  <div className="bg-white/[0.01] p-3 rounded-lg border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Màu bảng</span>
                      <input
                        type="color"
                        value={settings.tableColor || settings.panelColor || "#16131D"}
                        onChange={(e) => updateSettings({
                          tableColor: e.target.value,
                          panelColor: e.target.value,
                          marketThemeId: undefined,
                        })}
                        className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Màu thanh bên (Panel)</span>
                      <input
                        type="color"
                        value={settings.panelColor || "#16131D"}
                        onChange={(e) => updateSettings({
                          panelColor: e.target.value,
                          // A panel colour change is expected to recolour the table too.
                          // The separate table picker remains available for an intentional override.
                          tableColor: e.target.value,
                          marketThemeId: undefined,
                        })}
                        className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Màu thẻ (Card)</span>
                      <input
                        type="color"
                        value={settings.cardColor || "#1C1825"}
                        onChange={(e) => updateSettings({ cardColor: e.target.value, marketThemeId: undefined })}
                        className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 72 & 50 Market 7-Color Themes Selection Grid */
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  {isVi ? "Bộ sưu tập 7 Sắc Màu Đặc Biệt" : "Special 7-Color Theme Palette"}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {MARKET_THEMES.length} giao diện
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1.5 custom-scrollbar">
                {MARKET_THEMES.map((theme, idx) => {
                  const isSelected = settings.marketThemeId === theme.id;
                  const colors = [
                    theme.workspaceSurface,
                    theme.surface,
                    theme.surfaceElevated,
                    theme.surfaceHover,
                    theme.border,
                    theme.positive || theme.borderStrong,
                    theme.accent,
                  ];
                  const bgGradient = theme.panelBg || `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 25%, ${colors[2]} 50%, ${colors[4]} 75%, ${colors[6]} 100%)`;

                  const getTagline = (t: typeof theme) => {
                    if (t.id.includes("aurora")) return "Huyền ảo · Lạnh · Vũ trụ";
                    if (t.id.includes("sunset")) return "Ấm áp · Năng động · Đam mê";
                    if (t.id.includes("sakura")) return "Dịu dàng · Lãng mạn · Nhật Bản";
                    if (t.id.includes("cosmos")) return "Huyền bí · Sâu · Galaxy";
                    if (t.id.includes("tropical")) return "Tươi sáng · Nhiệt đới · Vui vẻ";
                    if (t.id.includes("golden")) return "Sang trọng · Ấm · Lung linh";
                    if (t.id.includes("neon")) return "Futuristic · Neon · Electric";
                    if (t.id.includes("forest")) return "Thiên nhiên · Sâu · Bí ẩn";
                    if (t.id.includes("candy") || t.id.includes("bubblegum")) return "Ngọt ngào · Trẻ trung · Sống động";
                    if (t.id.includes("amethyst") || t.id.includes("velvet")) return "Quý phái · Tím · Sang trọng";
                    if (t.id.includes("ocean") || t.id.includes("teal")) return "Biển sâu · Thanh mát · Bình yên";
                    if (t.id.includes("magma") || t.id.includes("ember")) return "Rực lửa · Nóng bừng · Mãnh liệt";
                    return "7 Sắc màu chuyên sâu · Giao diện Finance";
                  };

                  return (
                    <button
                      key={theme.id}
                      onClick={() => updateSettings({ marketThemeId: theme.id })}
                      className={`relative flex flex-col w-full rounded-2xl overflow-hidden border-2 text-left transition-all group ${
                        isSelected
                          ? "border-sky-400 shadow-xl shadow-sky-500/25 scale-[1.01]"
                          : "border-white/10 hover:border-white/20 bg-zinc-900/60 hover:bg-zinc-900"
                      }`}
                    >
                      {/* Top 45-degree Gradient Header Banner */}
                      <div 
                        className="h-24 w-full relative transition-transform duration-300 group-hover:scale-105"
                        style={{ background: bgGradient }}
                      >
                        {/* Number Badge Top Left */}
                        <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white font-bold text-[10px] h-6 w-6 rounded-full flex items-center justify-center border border-white/20">
                          {idx + 1}
                        </span>
                        {/* "7 màu" Badge Top Right */}
                        <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white font-semibold text-[9px] px-2 py-0.5 rounded-full border border-white/20">
                          7 màu
                        </span>
                      </div>

                      {/* Card Content Footer */}
                      <div className="p-3 bg-[#13101B] w-full flex flex-col justify-between gap-1.5 flex-1 border-t border-white/5">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate max-w-[140px]">
                              {isVi ? theme.nameVi : theme.nameEn}
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-sky-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                            {getTagline(theme)}
                          </p>
                        </div>

                        {/* 7 Color Swatch Circles at Bottom */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {colors.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-xs shrink-0"
                              style={{ backgroundColor: c }}
                              title={`Màu ${cIdx + 1}: ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Independent Global Settings */}
          <div className="border-t border-white/5 pt-4 space-y-6">
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
              <div className="flex items-center justify-between bg-white/[0.01] p-2 rounded-lg border border-white/5 mt-3">
                <span className="text-xs text-slate-300">Tùy chỉnh màu chữ tự do</span>
                <input
                  type="color"
                  value={settings.text.startsWith("#") ? settings.text : "#CBD5E1"}
                  onChange={(e) => updateSettings({ text: e.target.value as any })}
                  className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                />
              </div>
            </div>

            {/* Background Selection */}
            <div className="border-t border-white/5 pt-4">
              <label className="text-xs font-semibold text-slate-400 block mb-2.5">Hình nền hệ thống mặc định</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {BACKGROUND_OPTIONS.map((opt) => {
                  const bgUrl = opt.name === "dark" ? "" : BACKGROUND_ASSETS[opt.name];

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
                      ) : opt.name === "animated-gradient" ? (
                        <div className="absolute inset-0 rainbow-bg" />
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

              {/* 550+ Online Sakura Wallpapers Section */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                    <span>🌸</span>
                    <span>Thư viện 550+ Ảnh Hoa Anh Đào (HD/4K)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                    {filteredSakura.length} hình ảnh
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Tìm kiếm theo từ khóa Sakura, Tokyo, Kyoto, Fuji..."
                  value={searchSakura}
                  onChange={(e) => setSearchSakura(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                />

                <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar pt-1">
                  {filteredSakura.slice(0, 150).map((sakura) => {
                    const isSelected = settings.background === sakura.url;
                    return (
                      <button
                        key={sakura.id}
                        onClick={() => updateSettings({ background: sakura.url as any })}
                        className={`relative h-20 w-full rounded-lg overflow-hidden border-2 text-left transition-all group ${
                          isSelected
                            ? "border-pink-500 shadow-lg shadow-pink-500/30 scale-[1.02]"
                            : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.01]"
                        }`}
                      >
                        <img
                          src={sakura.url}
                          alt={sakura.label}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-xs p-1">
                          <p className="text-[9px] font-medium text-slate-200 truncate leading-tight">
                            {sakura.label}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-pink-500 text-white rounded-full p-0.5 shadow-md">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel Opacity Settings */}
            <div className="border-t border-white/5 pt-4">
              <label className="text-xs font-semibold text-slate-400 block mb-2.5">Độ trong suốt khung (Panel Opacity)</label>
              <div className="flex flex-col gap-1.5 bg-white/[0.01] p-3 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Độ che phủ hình nền</span>
                  <span className="text-xs font-mono text-slate-400">{settings.panelOpacity ?? 72}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.panelOpacity ?? 72}
                  onChange={(e) => updateSettings({ panelOpacity: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white mt-1"
                />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

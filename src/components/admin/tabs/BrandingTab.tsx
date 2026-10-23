import React, { useState } from 'react';
import { BrandingSettings } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';
import { 
  Palette, 
  Save, 
  Sparkles, 
  Megaphone, 
  Eye, 
  Check, 
  HelpCircle,
  Mail,
  Share2
} from 'lucide-react';

export const BrandingTab: React.FC = () => {
  const { adminSession, addToast, refreshAppState } = useGame();
  const [branding, setBranding] = useState<BrandingSettings>(() => MindGamesDB.getBrandingSettings());
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSession) return;

    try {
      const updated = AdminService.updateBranding(adminSession.token, branding);
      setBranding(updated);
      refreshAppState();
      addToast('Branding, headlines, and banner updated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const accentColorPresets = [
    { label: 'Electric Blue', hex: '#38BDF8' },
    { label: 'Cosmic Violet', hex: '#8B5CF6' },
    { label: 'Emerald Insight', hex: '#10B981' },
    { label: 'Solar Amber', hex: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white">
            Branding & Appearance Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize platform nomenclature, homepage headlines, announcement broadcasts, and color accents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            previewMode ? 'bg-sky-500 text-white border-sky-500' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{previewMode ? 'Hide Live Preview' : 'Show Live Preview'}</span>
        </button>
      </div>

      {/* Live Preview Bar if enabled */}
      {previewMode && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-navy-900 to-[#070A14] border border-sky-500/40 shadow-2xl space-y-4 animate-pop">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">
            Live Public Homepage Preview:
          </div>
          {branding.announcementBanner.enabled && (
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs text-center font-medium">
              {branding.announcementBanner.text}
            </div>
          )}
          <div className="text-center space-y-2 py-4">
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
              {branding.headline}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              {branding.headlineSub}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        
        {/* Section 1: Brand Identity */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-sky-400" />
            <span>Platform Identity & Tagline</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Website Name</label>
              <input
                type="text"
                required
                value={branding.siteName}
                onChange={(e) => setBranding({ ...branding, siteName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Official Tagline</label>
              <input
                type="text"
                required
                value={branding.tagline}
                onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Accent Color Presets */}
          <div>
            <label className="block text-slate-400 font-bold uppercase mb-2">Primary Electric Accent Color</label>
            <div className="flex flex-wrap gap-2.5">
              {accentColorPresets.map(preset => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setBranding({ ...branding, primaryAccent: preset.hex })}
                  className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 transition-all ${
                    branding.primaryAccent === preset.hex 
                      ? 'border-white bg-white/10 ring-2 ring-white/30 text-white font-bold' 
                      : 'border-white/10 bg-navy-900 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Homepage Hero Copy */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-base text-white">
            Homepage Hero Copywriting
          </h3>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Primary Hero Headline</label>
            <input
              type="text"
              required
              value={branding.headline}
              onChange={(e) => setBranding({ ...branding, headline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Introductory Subhead</label>
            <textarea
              rows={2}
              value={branding.headlineSub}
              onChange={(e) => setBranding({ ...branding, headlineSub: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Section 3: Announcement Broadcast Banner */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>Announcement Broadcast Banner</span>
            </h3>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={branding.announcementBanner.enabled}
                onChange={(e) => setBranding({
                  ...branding,
                  announcementBanner: { ...branding.announcementBanner, enabled: e.target.checked }
                })}
                className="w-4 h-4 rounded text-sky-500 focus:ring-0 bg-navy-900 border-white/20"
              />
              <span className="text-slate-300 font-bold">Banner Active</span>
            </label>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Banner Text Content</label>
            <input
              type="text"
              value={branding.announcementBanner.text}
              onChange={(e) => setBranding({
                ...branding,
                announcementBanner: { ...branding.announcementBanner, text: e.target.value }
              })}
              placeholder="e.g. 🏆 Weekly Logic Tournament is live! Solve before Sunday..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Section 4: Contact & Social */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-display font-bold text-base text-white">
            Support, Contact & Community Links
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Support Email</label>
              <input
                type="email"
                value={branding.contactEmail}
                onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Twitter / X URL</label>
              <input
                type="text"
                value={branding.socialTwitter}
                onChange={(e) => setBranding({ ...branding, socialTwitter: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Discord / Community URL</label>
              <input
                type="text"
                value={branding.socialDiscord}
                onChange={(e) => setBranding({ ...branding, socialDiscord: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Publish Branding Changes</span>
          </button>
        </div>

      </form>

    </div>
  );
};

import React, { useState } from 'react';
import { 
  CreditCard, 
  Crown, 
  Check, 
  Sparkles, 
  Edit3, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock,
  DollarSign,
  Star
} from 'lucide-react';
import { SubscriptionPlan } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';

export const MonetizationTab: React.FC = () => {
  const { adminSession, refreshAppData } = useGame();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => MindGamesDB.getSubscriptionPlans());
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // All puzzles count & premium count
  const allPuzzles = MindGamesDB.getPuzzles(true);
  const premiumPuzzlesCount = allPuzzles.filter(p => p.visibility === 'premium').length;

  const reloadData = () => {
    setPlans(MindGamesDB.getSubscriptionPlans());
    refreshAppData();
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !adminSession) return;
    try {
      AdminService.updateSubscriptionPlan(adminSession.token, editingPlan);
      showFeedback('success', `Plan "${editingPlan.name}" updated successfully.`);
      setEditingPlan(null);
      reloadData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-navy-900/40 p-4 rounded-xl border border-navy-700/50">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Monetization & Subscription Plans
          </h2>
          <p className="text-sm text-slate-400">
            Configure premium tier pricing, feature inclusions, and paywall rules for advanced puzzle dossiers.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-navy-800/80 px-3 py-1.5 rounded-lg border border-navy-700 text-slate-300">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Premium Cases: <strong className="text-white font-mono">{premiumPuzzlesCount}</strong>
          </span>
          <span className="text-navy-600">|</span>
          <span className="flex items-center gap-1">
            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            Free Puzzles: <strong className="text-white font-mono">{allPuzzles.length - premiumPuzzlesCount}</strong>
          </span>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`relative p-6 rounded-2xl border transition-all ${
              plan.isPopular 
                ? 'bg-gradient-to-b from-navy-900 to-navy-950 border-amber-500/50 shadow-xl shadow-amber-500/5' 
                : 'bg-navy-900/40 border-navy-700/60'
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-3 left-6 px-3 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-navy-950 text-[11px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-md">
                <Star className="w-3 h-3 fill-current" /> Most Popular
              </span>
            )}

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {plan.name}
                  {plan.isPopular && <Sparkles className="w-4 h-4 text-amber-400" />}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">{plan.description}</p>
              </div>

              <button
                onClick={() => setEditingPlan({ ...plan })}
                className="p-2 bg-navy-800 hover:bg-sky-600/30 text-slate-300 hover:text-sky-300 rounded-xl border border-navy-700 transition-colors"
                title="Edit Plan Pricing & Features"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-navy-950/60 rounded-xl border border-navy-800/80">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black font-mono text-white">
                  ${plan.priceMonthly.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                or <strong className="text-slate-300 font-mono">${plan.priceYearly.toFixed(2)}</strong> / billed annually
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Plan Features:
              </span>
              {plan.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Edit Plan */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              Edit Subscription Tier: {editingPlan.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Changes update the live upgrade modal shown across the site for paywalled cases.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">Description</label>
                <input
                  type="text"
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase">Monthly Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase">Yearly Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingPlan.priceYearly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase">
                  Features (one per line)
                </label>
                <textarea
                  rows={4}
                  value={editingPlan.features.join('\n')}
                  onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(Boolean) })}
                  className="mt-1 w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={editingPlan.isPopular || false}
                  onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <label htmlFor="isPopular" className="text-xs text-slate-300 cursor-pointer">
                  Mark as "Most Popular" highlighted tier
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-navy-950 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

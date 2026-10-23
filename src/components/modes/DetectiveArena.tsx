import React, { useState, useEffect } from 'react';
import { DetectiveCase, DetectiveSuspect, DetectiveEvidence } from '../../types';
import { useGame } from '../../context/GameContext';
import { 
  Search, 
  ArrowLeft, 
  Clock, 
  FileText, 
  Users, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight,
  Eye,
  MessageSquare,
  Lock,
  RotateCcw
} from 'lucide-react';
import { DETECTIVE_CASES } from '../../data/puzzles/mysteries';

interface DetectiveArenaProps {
  initialCase?: DetectiveCase;
  onBackToHome: () => void;
}

export const DetectiveArena: React.FC<DetectiveArenaProps> = ({
  initialCase,
  onBackToHome
}) => {
  const { completePuzzle, isPracticeMode } = useGame();

  const [caseIndex, setCaseIndex] = useState(() => {
    if (initialCase) {
      const idx = DETECTIVE_CASES.findIndex(c => c.id === initialCase.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const mystery = DETECTIVE_CASES[caseIndex];

  // Active Tab: 'briefing' | 'suspects' | 'evidence' | 'timeline' | 'accuse'
  const [activeTab, setActiveTab] = useState<'briefing' | 'suspects' | 'evidence' | 'timeline' | 'accuse'>('briefing');
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  // Accusation Phase State
  const [accusedCulpritId, setAccusedCulpritId] = useState<string | null>(null);
  const [selectedProofEvidenceIds, setSelectedProofEvidenceIds] = useState<string[]>([]);
  const [selectedMotiveId, setSelectedMotiveId] = useState<string | null>(null);
  const [hasIndicted, setHasIndicted] = useState<boolean>(false);
  const [isCaseSolved, setIsCaseSolved] = useState<boolean>(false);
  const [pointsWon, setPointsWon] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    setActiveTab('briefing');
    setSelectedSuspectId(null);
    setSelectedEvidenceId(null);
    setAccusedCulpritId(null);
    setSelectedProofEvidenceIds([]);
    setSelectedMotiveId(null);
    setHasIndicted(false);
    setIsCaseSolved(false);
    setPointsWon(0);
    setStartTime(Date.now());
    setElapsedSeconds(0);

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [caseIndex]);

  const toggleProofEvidence = (id: string) => {
    setSelectedProofEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleIndictment = () => {
    if (!accusedCulpritId || selectedProofEvidenceIds.length === 0 || !selectedMotiveId || hasIndicted) return;

    const culpritCorrect = accusedCulpritId === mystery.culpritId;
    const evidenceCorrect = mystery.decisiveEvidenceIds.every(id => selectedProofEvidenceIds.includes(id));
    const motiveCorrect = selectedMotiveId === mystery.motiveChoiceId;

    const allCorrect = culpritCorrect && evidenceCorrect && motiveCorrect;
    const durationMs = Date.now() - startTime;

    setIsCaseSolved(allCorrect);
    setHasIndicted(true);

    if (allCorrect) {
      const { points } = completePuzzle(mystery.id, true, 0, durationMs);
      setPointsWon(points);
    } else {
      completePuzzle(mystery.id, false, 0, durationMs);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-white/10">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-400">
            Case File {caseIndex + 1} of {DETECTIVE_CASES.length}
          </span>
          {!isPracticeMode && (
            <div className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-sky-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Case Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 text-white border border-white/10 shadow-2xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" />
              Detective Mystery
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-300">
              {mystery.difficulty}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            {mystery.title}
          </h1>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
            <span><strong>Victim:</strong> {mystery.victim}</span>
            <span><strong>Location:</strong> {mystery.crimeScene}</span>
          </div>
        </div>

        {/* Tab Shortcuts */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('briefing')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'briefing' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Briefing
          </button>
          <button
            onClick={() => setActiveTab('suspects')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'suspects' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Suspects ({mystery.suspects.length})
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'evidence' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Evidence ({mystery.evidence.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'timeline' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('accuse')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'accuse' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            ⚖️ Accuse
          </button>
        </div>
      </div>

      {/* Tab 1: Briefing */}
      {activeTab === 'briefing' && (
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-xl space-y-6 animate-pop">
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white mb-3">
              Official Crime Incident Report
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-serif">
              {mystery.briefing}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500 mb-2">
              Inspector's Objective:
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              1. Review the suspect dossiers and read their interrogation notes.<br />
              2. Inspect each piece of physical & forensic evidence.<br />
              3. Check the verified timeline of events.<br />
              4. Enter the <strong>Accuse</strong> tab to name the perpetrator, submit the decisive proof, and cite the motive.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('suspects')}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20"
            >
              <span>Examine Suspects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Suspects Dossier */}
      {activeTab === 'suspects' && (
        <div className="space-y-4 animate-pop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mystery.suspects.map(suspect => {
              const isSelected = selectedSuspectId === suspect.id;
              return (
                <div
                  key={suspect.id}
                  className={`rounded-2xl p-5 border transition-all ${
                    isSelected 
                      ? 'bg-sky-500/10 border-sky-500 shadow-md ring-1 ring-sky-500' 
                      : 'bg-white dark:bg-navy-900 border-slate-200/90 dark:border-white/10 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-navy-800 flex items-center justify-center text-2xl shrink-0">
                      {suspect.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                          {suspect.name}
                        </h4>
                      </div>
                      <span className="text-xs font-medium text-sky-500">
                        {suspect.role}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 italic leading-relaxed">
                        "{suspect.statement}"
                      </p>
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>Claimed Alibi:</strong> {suspect.alibi}
                      </div>

                      {/* Interrogation Button */}
                      <button
                        onClick={() => setSelectedSuspectId(isSelected ? null : suspect.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Hide Interrogation Notes' : 'Read Interrogation Transcript'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Interrogation Notes Drawer */}
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2 animate-pop">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Official Interrogation Logs:
                      </h5>
                      {suspect.interrogationNotes.map((note, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-navy-850 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                          {note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveTab('briefing')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              ← Back to Briefing
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <span>Inspect Evidence Locker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Evidence Locker */}
      {activeTab === 'evidence' && (
        <div className="space-y-4 animate-pop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mystery.evidence.map(item => {
              const isSelected = selectedEvidenceId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedEvidenceId(isSelected ? null : item.id)}
                  className={`rounded-2xl p-5 border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500' 
                      : 'bg-white dark:bg-navy-900 border-slate-200/90 dark:border-white/10 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
                      {item.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Found: {item.locationFound}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white mb-1">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {item.shortDesc}
                  </p>

                  {/* Expanded Forensic Analysis */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-white/10 text-xs text-amber-900 dark:text-amber-200 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 leading-relaxed font-mono whitespace-pre-line animate-pop">
                      <strong>Laboratory Analysis Report:</strong><br />
                      {item.fullAnalysis}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveTab('suspects')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              ← Back to Suspects
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <span>Examine Chronology</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Timeline */}
      {activeTab === 'timeline' && (
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-xl space-y-4 animate-pop">
          <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white mb-4">
            Verified Crime Night Chronology
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
            {mystery.timeline.map((event, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-white dark:border-navy-900" />
                <div className="text-xs font-mono font-bold text-sky-500">
                  {event.time}
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {event.event}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Witness / Log: {event.witness} {event.verified ? '• Verified ✓' : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setActiveTab('accuse')}
              className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Ready to Accuse Culprit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Accusation Phase */}
      {activeTab === 'accuse' && (
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-white/10 shadow-2xl space-y-8 animate-pop">
          
          <div>
            <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
              The Inspector's Accusation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Assemble the legal indictment. A valid conclusion requires identifying the culprit, their motive, and the smoking-gun evidence.
            </p>
          </div>

          {!hasIndicted ? (
            <div className="space-y-6">
              
              {/* Step 1: Culprit Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Step 1: Who committed the crime?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mystery.suspects.map(suspect => {
                    const isSelected = accusedCulpritId === suspect.id;
                    return (
                      <button
                        key={suspect.id}
                        type="button"
                        onClick={() => setAccusedCulpritId(suspect.id)}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white font-bold ring-1 ring-amber-500 shadow-sm'
                            : 'bg-slate-50 dark:bg-navy-800/80 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-2xl">{suspect.avatar}</span>
                        <div>
                          <div className="text-sm font-bold">{suspect.name}</div>
                          <div className="text-[11px] text-slate-400">{suspect.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Decisive Evidence */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Step 2: Select the decisive evidence item(s) supporting your indictment:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {mystery.evidence.map(item => {
                    const isSelected = selectedProofEvidenceIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleProofEvidence(item.id)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 text-sky-900 dark:text-sky-200 font-bold'
                            : 'bg-slate-50 dark:bg-navy-800/60 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{item.name}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isSelected && '✓'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Motive / Discrepancy */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Step 3: What was the motive or fatal alibi flaw?
                </label>
                <div className="space-y-2">
                  {mystery.motiveChoices.map(motive => {
                    const isSelected = selectedMotiveId === motive.id;
                    return (
                      <button
                        key={motive.id}
                        type="button"
                        onClick={() => setSelectedMotiveId(motive.id)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500 text-purple-900 dark:text-purple-200 font-bold'
                            : 'bg-slate-50 dark:bg-navy-800/60 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="leading-relaxed">{motive.text}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Indictment */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleIndictment}
                  disabled={!accusedCulpritId || selectedProofEvidenceIds.length === 0 || !selectedMotiveId}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all"
                >
                  Deliver Formal Indictment
                </button>
              </div>

            </div>
          ) : (
            /* Indictment Result & Inspector's Verdict */
            <div className="space-y-6 animate-pop">
              <div
                className={`p-6 rounded-2xl border flex items-start gap-4 ${
                  isCaseSolved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100'
                }`}
              >
                {isCaseSolved ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-extrabold text-xl">
                      {isCaseSolved ? 'Case Solved! Outstanding Detective Work!' : 'Indictment Rejected by the Court'}
                    </h3>
                    {isCaseSolved && !isPracticeMode && (
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white">
                        +{pointsWon} XP
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">
                    {isCaseSolved
                      ? `Your deduction was airtight. ${mystery.inspectorVerdict}`
                      : 'The evidence submitted or the identified suspect did not withstand scrutiny.'}
                  </p>
                </div>
              </div>

              {/* Full Inspector Breakdown */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-navy-850 border border-slate-200 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Inspector's Complete Case Resolution:
                </h4>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {mystery.solutionBreakdown}
                </div>
              </div>

              {/* Next Case / Retry */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setHasIndicted(false);
                    setIsCaseSolved(false);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Review Evidence & Retry</span>
                </button>

                <button
                  onClick={() => {
                    const nextIdx = (caseIndex + 1) % DETECTIVE_CASES.length;
                    setCaseIndex(nextIdx);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <span>Next Case File</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

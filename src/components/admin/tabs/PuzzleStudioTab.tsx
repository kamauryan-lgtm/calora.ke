import React, { useState } from 'react';
import { BasePuzzle, Category, Difficulty, GameMode, PublicationStatus, VisibilityTier } from '../../../types';
import { MindGamesDB } from '../../../lib/database';
import { AdminService } from '../../../lib/adminService';
import { useGame } from '../../../context/GameContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Upload, 
  CheckCircle, 
  X, 
  AlertCircle,
  FileCode,
  Tag,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface PuzzleStudioTabProps {
  onRefresh: () => void;
}

export const PuzzleStudioTab: React.FC<PuzzleStudioTabProps> = ({ onRefresh }) => {
  const { adminSession, addToast } = useGame();
  const [puzzles, setPuzzles] = useState<BasePuzzle[]>(() => MindGamesDB.getPuzzles(true));
  
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [selectedDiff, setSelectedDiff] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewPuzzle, setPreviewPuzzle] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Editor Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('Riddles');
  const [formMode, setFormMode] = useState<GameMode>('riddles');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('Medium');
  const [formDescription, setFormDescription] = useState('');
  const [formEstTime, setFormEstTime] = useState('2-3 min');
  const [formStatus, setFormStatus] = useState<PublicationStatus>('published');
  const [formVisibility, setFormVisibility] = useState<VisibilityTier>('public');
  const [formTags, setFormTags] = useState('logic, brain, riddle');

  // Riddle / Specific fields
  const [formPrompt, setFormPrompt] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formHint1, setFormHint1] = useState('');
  const [formHint2, setFormHint2] = useState('');
  const [formHint3, setFormHint3] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formOptions, setFormOptions] = useState<string>('Option A, Option B, Option C, Option D');
  const [formValidationErr, setFormValidationErr] = useState<string | null>(null);

  const refreshList = () => {
    setPuzzles(MindGamesDB.getPuzzles(true));
    onRefresh();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormCategory('Riddles');
    setFormMode('riddles');
    setFormDifficulty('Medium');
    setFormDescription('');
    setFormEstTime('2-3 min');
    setFormStatus('published');
    setFormVisibility('public');
    setFormTags('puzzle, deduction');
    setFormPrompt('');
    setFormAnswer('');
    setFormAliases('');
    setFormHint1('');
    setFormHint2('');
    setFormHint3('');
    setFormExplanation('');
    setFormOptions('Option A, Option B, Option C, Option D');
    setFormValidationErr(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    setFormTitle(p.title || '');
    setFormCategory(p.category || 'Riddles');
    setFormMode(p.mode || 'riddles');
    setFormDifficulty(p.difficulty || 'Medium');
    setFormDescription(p.description || '');
    setFormEstTime(p.estimatedTime || '2 min');
    setFormStatus(p.publicationStatus || 'published');
    setFormVisibility(p.visibility || 'public');
    setFormTags(Array.isArray(p.tags) ? p.tags.join(', ') : 'logic');

    setFormPrompt(p.prompt || p.scenario || p.question || '');
    setFormAnswer(p.answer || '');
    setFormAliases(Array.isArray(p.aliases) ? p.aliases.join(', ') : '');
    setFormHint1(p.hints?.[0] || '');
    setFormHint2(p.hints?.[1] || '');
    setFormHint3(p.hints?.[2] || '');
    setFormExplanation(p.explanation || p.solutionExplanation || p.ruleExplanation || p.solution || '');
    
    if (Array.isArray(p.options)) {
      setFormOptions(p.options.map((o: any) => typeof o === 'string' ? o : o.text || o.label).join(', '));
    } else {
      setFormOptions('');
    }

    setFormValidationErr(null);
    setEditorOpen(true);
  };

  const handleSavePuzzle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSession) return;
    setFormValidationErr(null);

    if (!formTitle.trim()) {
      setFormValidationErr('Title is required.');
      return;
    }
    if (!formPrompt.trim()) {
      setFormValidationErr('Question/prompt text is required.');
      return;
    }

    try {
      const parsedTags = formTags.split(',').map(t => t.trim()).filter(Boolean);
      const parsedAliases = formAliases.split(',').map(a => a.trim()).filter(Boolean);
      const parsedOptionsList = formOptions.split(',').map(o => o.trim()).filter(Boolean);

      const payload: any = {
        title: formTitle.trim(),
        category: formCategory,
        mode: formMode,
        difficulty: formDifficulty,
        description: formDescription.trim() || formPrompt.substring(0, 80) + '...',
        estimatedTime: formEstTime,
        publicationStatus: formStatus,
        visibility: formVisibility,
        tags: parsedTags,
        prompt: formPrompt.trim(),
        scenario: formPrompt.trim(),
        question: formPrompt.trim(),
        answer: formAnswer.trim(),
        aliases: parsedAliases.length > 0 ? parsedAliases : [formAnswer.trim().toLowerCase()],
        hints: [formHint1.trim() || 'Look closely at the wording.', formHint2.trim() || 'Consider alternative angles.', formHint3.trim() || 'Initial letters or structure.'],
        explanation: formExplanation.trim() || 'Deductive solution verified.',
        options: parsedOptionsList.length > 0 ? parsedOptionsList : undefined
      };

      if (editingId) {
        payload.id = editingId;
        AdminService.updatePuzzle(adminSession.token, payload);
        addToast(`Puzzle "${payload.title}" updated successfully!`, 'success');
      } else {
        AdminService.createPuzzle(adminSession.token, payload);
        addToast(`New puzzle "${payload.title}" published to library!`, 'success');
      }

      setEditorOpen(false);
      refreshList();
    } catch (err: any) {
      setFormValidationErr(err.message || 'Validation failed.');
    }
  };

  const handleDeletePuzzle = (id: string) => {
    if (!adminSession) return;
    try {
      AdminService.deletePuzzle(adminSession.token, id);
      addToast('Puzzle deleted from database.', 'info');
      setDeleteConfirmId(null);
      refreshList();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleExportJSON = () => {
    if (!adminSession) return;
    const json = AdminService.exportPuzzlesJSON(adminSession.token);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-games-puzzles-export-${Date.now()}.json`;
    a.click();
    addToast('Puzzles database exported as JSON.', 'success');
  };

  const handleImportJSON = () => {
    if (!adminSession || !importJsonText.trim()) return;
    try {
      const res = AdminService.importPuzzlesJSON(adminSession.token, importJsonText);
      if (res.errors.length > 0) {
        setImportErrors(res.errors);
      } else {
        addToast(`Successfully imported ${res.importedCount} puzzle(s)!`, 'success');
        setImportModalOpen(false);
        setImportJsonText('');
        refreshList();
      }
    } catch (err: any) {
      setImportErrors([err.message]);
    }
  };

  // Filtered puzzle items
  const filteredList = puzzles.filter(p => {
    if (selectedCat !== 'All' && p.category !== selectedCat) return false;
    if (selectedDiff !== 'All' && p.difficulty !== selectedDiff) return false;
    if (selectedStatus !== 'All' && p.publicationStatus !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Studio Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white">
            Puzzle Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, test, modify, and publish puzzles across all 8 game categories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Export all puzzles as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => { setImportErrors([]); setImportModalOpen(true); }}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Bulk import puzzles from JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Puzzle</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, tag, or keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Riddles">Riddles</option>
            <option value="Logic">Logic</option>
            <option value="Detective Mysteries">Detective</option>
            <option value="Pattern Recognition">Pattern</option>
            <option value="Lateral Thinking">Lateral</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Word Games">Word Games</option>
            <option value="Memory">Memory</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDiff}
            onChange={(e) => setSelectedDiff(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Expert">Expert</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Puzzles List Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-navy-900/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5">Title & Category</th>
                <th className="p-3.5">Difficulty</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Plays</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredList.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-white text-sm line-clamp-1">{p.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="text-sky-400 font-semibold">{p.category}</span>
                      <span>• ID: <span className="font-mono text-slate-500">{p.id}</span></span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                      p.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {p.mode}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.publicationStatus === 'draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      p.publicationStatus === 'archived' ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {p.publicationStatus || 'published'}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    {(p.playsCount || 0).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right space-x-1">
                    <button
                      onClick={() => setPreviewPuzzle(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors"
                      title="Live Player Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                      title="Edit Puzzle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      title="Delete Puzzle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-pop">
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#0C1222] border border-white/10 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[92vh] space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-extrabold text-xl text-white">
                {editingId ? `Edit Puzzle: "${formTitle}"` : 'Create New Puzzle'}
              </h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formValidationErr && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formValidationErr}</span>
              </div>
            )}

            <form onSubmit={handleSavePuzzle} className="space-y-4 text-xs">
              
              {/* Row 1: Title & Estimated Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold uppercase mb-1">Puzzle Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. The Enigma of the Silver Compass"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Est. Time</label>
                  <input
                    type="text"
                    value={formEstTime}
                    onChange={(e) => setFormEstTime(e.target.value)}
                    placeholder="2-3 min"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Category, Mode, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as Category;
                      setFormCategory(cat);
                      if (cat === 'Riddles') setFormMode('riddles');
                      else if (cat === 'Logic') setFormMode('logic');
                      else if (cat === 'Detective Mysteries') setFormMode('detective');
                      else if (cat === 'Pattern Recognition') setFormMode('patterns');
                      else if (cat === 'Lateral Thinking') setFormMode('lateral');
                      else if (cat === 'Mathematics') setFormMode('math');
                      else if (cat === 'Word Games') setFormMode('word');
                      else if (cat === 'Memory') setFormMode('memory');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="Riddles">Riddles</option>
                    <option value="Logic">Logic</option>
                    <option value="Detective Mysteries">Detective Mysteries</option>
                    <option value="Pattern Recognition">Pattern Recognition</option>
                    <option value="Lateral Thinking">Lateral Thinking</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Word Games">Word Games</option>
                    <option value="Memory">Memory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PublicationStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft (Unlisted)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Question / Prompt */}
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Question / Scenario Prompt</label>
                <textarea
                  rows={4}
                  required
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Enter the full scenario, riddle poem, or question presented to players..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-serif text-sm"
                />
              </div>

              {/* Row 4: Primary Answer & Aliases */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Target Answer (Canonical)</label>
                  <input
                    type="text"
                    required
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    placeholder="e.g. shadow"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Accepted Aliases (Comma Separated)</label>
                  <input
                    type="text"
                    value={formAliases}
                    onChange={(e) => setFormAliases(e.target.value)}
                    placeholder="e.g. a shadow, the shadow, shade"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Multiple Choice Options */}
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Multiple Choice Options (Comma Separated)</label>
                <input
                  type="text"
                  value={formOptions}
                  onChange={(e) => setFormOptions(e.target.value)}
                  placeholder="e.g. Option 1, Option 2, Option 3, Option 4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Row 6: Progressive Hints */}
              <div className="space-y-2 p-3 rounded-xl bg-navy-900/60 border border-white/5">
                <label className="block text-slate-400 font-bold uppercase">Progressive Hints (Order of Revelation)</label>
                <input
                  type="text"
                  value={formHint1}
                  onChange={(e) => setFormHint1(e.target.value)}
                  placeholder="Hint 1: The Nudge (conceptual clue)"
                  className="w-full px-3 py-2 rounded-lg bg-navy-850 border border-white/5 text-white placeholder-slate-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={formHint2}
                  onChange={(e) => setFormHint2(e.target.value)}
                  placeholder="Hint 2: The Perspective (shift in thinking)"
                  className="w-full px-3 py-2 rounded-lg bg-navy-850 border border-white/5 text-white placeholder-slate-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={formHint3}
                  onChange={(e) => setFormHint3(e.target.value)}
                  placeholder="Hint 3: The Structural Reveal (letters, length, or formula)"
                  className="w-full px-3 py-2 rounded-lg bg-navy-850 border border-white/5 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Row 7: Full Explanation & Solution Proof */}
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Detailed Explanation & Deductive Proof</label>
                <textarea
                  rows={3}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Provide the step-by-step deductive logic explaining why this answer is correct..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none text-xs"
                />
              </div>

              {/* Row 8: Tags */}
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Search Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. logic, geometry, spatial, daily"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/20"
                >
                  {editingId ? 'Save & Commit Changes' : 'Publish to Library'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {previewPuzzle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-pop">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0C1222] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Live Player Preview
                </span>
                <span className="text-xs text-slate-400">{previewPuzzle.category}</span>
              </div>
              <button
                onClick={() => setPreviewPuzzle(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-display font-extrabold text-2xl text-white">
                {previewPuzzle.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Difficulty: {previewPuzzle.difficulty} • Estimated Time: {previewPuzzle.estimatedTime}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-navy-900 border border-white/10 font-serif italic text-sm text-slate-200 text-center leading-relaxed">
              "{previewPuzzle.prompt || previewPuzzle.scenario || previewPuzzle.question}"
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Verified Solution:</span>
              </div>
              <div className="font-mono text-white text-sm font-bold uppercase">
                {previewPuzzle.answer || 'Option Verified'}
              </div>
              <p className="text-[11px] opacity-90 mt-1">
                {previewPuzzle.explanation || previewPuzzle.solutionExplanation || previewPuzzle.ruleExplanation}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewPuzzle(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-pop">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0C1222] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-sky-400" />
                <span>Bulk Import Puzzles (JSON)</span>
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste a JSON array of puzzle objects. Each item must contain <code>title</code>, <code>category</code>, <code>mode</code>, <code>difficulty</code>, and prompt fields.
            </p>

            {importErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-1 max-h-32 overflow-y-auto">
                <div className="font-bold">Validation Errors:</div>
                {importErrors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <textarea
              rows={10}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='[ { "title": "Example Riddle", "category": "Riddles", "mode": "riddles", "difficulty": "Easy", "prompt": "...", "answer": "..." } ]'
              className="w-full p-3 rounded-xl bg-navy-900 border border-white/10 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJSON}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20"
              >
                Validate & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-pop">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C1222] border border-rose-500/30 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-extrabold text-lg text-white">Delete Puzzle Permanently?</h4>
              <p className="text-xs text-slate-400 mt-1">
                This action is logged to the immutable audit trail and cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePuzzle(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { X, Plus, Sparkles, Layers, CheckCircle2 } from 'lucide-react';
import { BudgetaryPlan, ProjectCostItem } from '../../types';

interface CreateBudgetPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanItems: ProjectCostItem[];
  onCreatePlan: (newPlan: BudgetaryPlan) => void;
}

export const CreateBudgetPlanModal: React.FC<CreateBudgetPlanModalProps> = ({
  isOpen,
  onClose,
  currentPlanItems,
  onCreatePlan
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMarginPct, setTargetMarginPct] = useState<number>(35);
  const [overheadPct, setOverheadPct] = useState<number>(8.5);
  const [contingencyPct, setContingencyPct] = useState<number>(5.0);
  const [initialMode, setInitialMode] = useState<'blank' | 'duplicate'>('blank');

  const handleCreate = () => {
    if (!name.trim()) return;

    const itemsToUse: ProjectCostItem[] = initialMode === 'duplicate'
      ? currentPlanItems.map(item => ({
          ...item,
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }))
      : [];

    const planId = `plan-${Date.now()}`;
    const newPlan: BudgetaryPlan = {
      id: planId,
      name: name.trim(),
      description: description.trim() || 'Custom budgetary scenario created from scratch.',
      isBaseline: false,
      targetMarginPct,
      overheadPct,
      contingencyPct,
      selectedItems: itemsToUse,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onCreatePlan(newPlan);
    onClose();
    setName('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-lg w-full my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-[#003049] text-white px-4 py-3 flex items-center justify-between border-b border-[#002235]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fdf0d5] flex items-center justify-center text-[#003049]">
              <Sparkles className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div>
              <h3 className="text-sm font-normal text-[#fdf0d5]">Create Budgetary Plan from Scratch</h3>
              <p className="text-[11px] text-slate-300">
                Model alternative procurement, labor sourcing, or value-engineered scenarios.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] text-slate-700 font-normal mb-1">
              Budgetary Plan Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Plan D: Value-Engineered Domestic Alloys"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 font-normal mb-1">
              Strategic Scope &amp; Assumptions
            </label>
            <textarea
              rows={2}
              placeholder="Describe sourcing assumptions (e.g. Local Ohio mill delivery, 2-week buffer, 5-axis CNC alternative rates)..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-700 font-normal mb-1">
                Target Margin (%)
              </label>
              <input
                type="number"
                value={targetMarginPct}
                onChange={e => setTargetMarginPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-700 font-normal mb-1">
                Overhead (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={overheadPct}
                onChange={e => setOverheadPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-700 font-normal mb-1">
                Contingency (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={contingencyPct}
                onChange={e => setContingencyPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>
          </div>

          {/* Initial Plan Setup Option */}
          <div>
            <label className="block text-[11px] text-slate-700 font-normal mb-1.5">
              Plan Initial Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => setInitialMode('blank')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  initialMode === 'blank'
                    ? 'bg-[#003049]/5 border-[#003049] ring-1 ring-[#003049]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-normal text-slate-900 text-xs">Blank Slate (Empty)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Build completely from scratch by adding materials, labor &amp; outsourced rates.
                </div>
              </div>

              <div
                onClick={() => setInitialMode('duplicate')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  initialMode === 'duplicate'
                    ? 'bg-[#003049]/5 border-[#003049] ring-1 ring-[#003049]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-normal text-slate-900 text-xs">Duplicate Current Plan</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Pre-populates all {currentPlanItems.length} items from current plan for tweaking.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
            <span>Create Plan &amp; Switch</span>
          </button>
        </div>
      </div>
    </div>
  );
};

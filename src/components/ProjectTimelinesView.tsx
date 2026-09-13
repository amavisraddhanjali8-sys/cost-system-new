import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit2,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Project, ProjectPhase } from '../types';

interface ProjectTimelinesViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onExportPDF: () => void;
}

export const ProjectTimelinesView: React.FC<ProjectTimelinesViewProps> = ({
  project,
  onUpdateProject,
  onExportPDF
}) => {
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  // Form state for adding/editing phase
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [phaseBudget, setPhaseBudget] = useState(50000);
  const [phaseActual, setPhaseActual] = useState(0);
  const [phaseStartDate, setPhaseStartDate] = useState('');
  const [phaseEndDate, setPhaseEndDate] = useState('');
  const [phaseStatus, setPhaseStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('In Progress');

  if (!project) {
    return (
      <div className="p-4 text-center bg-white rounded border border-slate-200 text-slate-500 text-xs font-normal">
        Please select a project to inspect and configure phase timelines and budget allocations.
      </div>
    );
  }

  const handleSavePhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseName) return;

    let updatedPhases = [...(project.phases || [])];
    if (editingPhaseId) {
      updatedPhases = updatedPhases.map(p => {
        if (p.id === editingPhaseId) {
          return {
            ...p,
            name: phaseName,
            description: phaseDescription,
            budget: Number(phaseBudget),
            actualCost: Number(phaseActual),
            startDate: phaseStartDate,
            endDate: phaseEndDate,
            status: phaseStatus
          };
        }
        return p;
      });
    } else {
      const newPhase: ProjectPhase = {
        id: `phase-${Date.now()}`,
        name: phaseName,
        description: phaseDescription,
        budget: Number(phaseBudget),
        actualCost: Number(phaseActual),
        startDate: phaseStartDate || new Date().toISOString().split('T')[0],
        endDate: phaseEndDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: phaseStatus
      };
      updatedPhases.push(newPhase);
    }

    const updatedProject = {
      ...project,
      phases: updatedPhases
    };
    onUpdateProject(updatedProject);
    setIsAddingPhase(false);
    setEditingPhaseId(null);
  };

  const openEditPhase = (phase: ProjectPhase) => {
    setEditingPhaseId(phase.id);
    setPhaseName(phase.name);
    setPhaseDescription(phase.description);
    setPhaseBudget(phase.budget);
    setPhaseActual(phase.actualCost);
    setPhaseStartDate(phase.startDate);
    setPhaseEndDate(phase.endDate);
    setPhaseStatus(phase.status);
    setIsAddingPhase(true);
  };

  const openNewPhase = () => {
    setEditingPhaseId(null);
    setPhaseName(`Phase ${(project.phases?.length || 0) + 1}: `);
    setPhaseDescription('');
    setPhaseBudget(45000);
    setPhaseActual(0);
    setPhaseStartDate(new Date().toISOString().split('T')[0]);
    setPhaseEndDate(new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0]);
    setPhaseStatus('In Progress');
    setIsAddingPhase(true);
  };

  const totalPhaseBudget = (project.phases || []).reduce((acc, p) => acc + Number(p.budget), 0);
  const totalPhaseActual = (project.phases || []).reduce((acc, p) => acc + Number(p.actualCost), 0);
  const totalPhaseVariance = totalPhaseBudget - totalPhaseActual;

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span className="text-xs font-normal text-[#003049] uppercase tracking-normal">{project.code}</span>
            <span>•</span>
            <span className="text-[11px] text-slate-500">Stage: {project.status}</span>
          </div>
          <h2 className="text-sm font-normal text-slate-900 mt-0.5">Multi-Phase Budgeting & Milestone Timelines</h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Planned Budget Total: <span className="text-slate-900 font-normal">${totalPhaseBudget.toLocaleString()}</span> | Actual Spend to Date: <span className="text-[#003049] font-normal">${totalPhaseActual.toLocaleString()}</span>
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={openNewPhase}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#fdf0d5]" />
            <span>Add Phase Budget</span>
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#fdf0d5] hover:bg-[#f6e5be] text-[#003049] border border-[#ecd5a8] text-xs font-normal rounded transition-colors"
          >
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Financial Oversight Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-[#003049] p-3 rounded text-white shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#fdf0d5]">
            <span>Aggregated Planned Budgets</span>
            <Calendar className="w-3.5 h-3.5 text-[#fdf0d5]" />
          </div>
          <div className="text-lg font-normal text-white mt-1">${totalPhaseBudget.toLocaleString()}</div>
          <span className="text-[10px] text-slate-200 mt-0.5 block">{project.phases?.length || 0} scheduled project gates</span>
        </div>

        <div className="bg-[#669bbc] p-3 rounded text-white shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#fdf0d5]">
            <span>Aggregated Actual Costs</span>
            <DollarSign className="w-3.5 h-3.5 text-[#fdf0d5]" />
          </div>
          <div className="text-lg font-normal text-white mt-1">${totalPhaseActual.toLocaleString()}</div>
          <span className="text-[10px] text-slate-100 mt-0.5 block">Incurred material & subcontractor billings</span>
        </div>

        <div className="bg-[#fdf0d5] p-3 rounded border border-[#ecd5a8] text-[#780000] shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-[#780000]">
            <span>Overall Financial Variance</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#780000]" />
          </div>
          <div className="text-lg font-normal mt-1 text-[#780000]">
            {totalPhaseVariance >= 0 ? `+$${totalPhaseVariance.toLocaleString()} Under` : `-$${Math.abs(totalPhaseVariance).toLocaleString()} Over`}
          </div>
          <span className="text-[10px] text-[#780000]/80 mt-0.5 block">Capital buffer within policy limits</span>
        </div>
      </div>

      {/* Phase Timeline Cards */}
      <div className="space-y-2.5">
        {(project.phases || []).map((phase, idx) => {
          const variance = phase.budget - phase.actualCost;
          const pctUsed = phase.budget > 0 ? (phase.actualCost / phase.budget) * 100 : 0;
          const isUnder = variance >= 0;

          return (
            <div
              key={phase.id}
              className="bg-white p-3 rounded border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
                <div className="flex items-start space-x-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded bg-[#fdf0d5] border border-[#ecd5a8] text-[#003049] font-normal text-xs shrink-0">
                    0{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-sm font-normal text-slate-900">{phase.name}</h3>
                      <span className={`px-1.5 py-0.2 text-[10px] font-normal uppercase rounded ${
                        phase.status === 'Completed'
                          ? 'bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8]'
                          : phase.status === 'In Progress'
                          ? 'bg-[#fdf0d5] text-[#669bbc] border border-[#ecd5a8]'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {phase.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-2xl">{phase.description}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{phase.startDate} &rarr; {phase.endDate}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Planned Phase Budget</div>
                    <div className="text-sm font-normal text-slate-900">${phase.budget.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">Actual: <span className="text-[#003049] font-normal">${phase.actualCost.toLocaleString()}</span></div>
                  </div>
                  <button
                    onClick={() => openEditPhase(phase)}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                    title="Edit Phase Budget"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Variance Breakdown */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500">Budget Consumption</span>
                  <span className={`font-normal ${pctUsed > 100 ? 'text-[#c1121f]' : 'text-slate-700'}`}>
                    {pctUsed.toFixed(1)}% ({isUnder ? `$${variance.toLocaleString()} remaining` : `$${Math.abs(variance).toLocaleString()} over budget`})
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pctUsed > 100 ? 'bg-[#c1121f]' : pctUsed > 80 ? 'bg-[#669bbc]' : 'bg-[#003049]'
                    }`}
                    style={{ width: `${Math.min(100, pctUsed)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Phase Budget Modal */}
      {isAddingPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white border border-slate-300 rounded max-w-lg w-full p-4 shadow-xl">
            <h3 className="text-sm font-normal text-slate-900 mb-3">
              {editingPhaseId ? 'Edit Project Phase Budget' : 'Configure New Project Phase Budget'}
            </h3>

            <form onSubmit={handleSavePhase} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-0.5 font-normal">Phase Name & Identifier</label>
                <input
                  type="text"
                  required
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  placeholder="e.g. Phase 2: Precision Machining & Hydraulics"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-0.5 font-normal">Description & Scope</label>
                <textarea
                  rows={2}
                  value={phaseDescription}
                  onChange={(e) => setPhaseDescription(e.target.value)}
                  placeholder="Details of materials, subcontractor tasks, and deliverables..."
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5 font-normal">Planned Budget ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={phaseBudget}
                    onChange={(e) => setPhaseBudget(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-0.5 font-normal">Actual Incurred ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={phaseActual}
                    onChange={(e) => setPhaseActual(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5 font-normal">Start Date</label>
                  <input
                    type="date"
                    required
                    value={phaseStartDate}
                    onChange={(e) => setPhaseStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-0.5 font-normal">End Date</label>
                  <input
                    type="date"
                    required
                    value={phaseEndDate}
                    onChange={(e) => setPhaseEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-0.5 font-normal">Status</label>
                <select
                  value={phaseStatus}
                  onChange={(e) => setPhaseStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingPhase(false)}
                  className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 font-normal transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#003049] hover:bg-[#002235] text-white font-normal rounded transition-colors"
                >
                  Save Phase Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  RefreshCw,
  FileDown,
  LayoutDashboard,
  SlidersHorizontal,
  FolderGit2,
  Calendar,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  Project,
  MaterialItem,
  ProduceItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService
} from '../types';
import { ProjectDashboardTab } from './project/ProjectDashboardTab';
import { ProjectCostControlsTab } from './project/ProjectCostControlsTab';

interface CostAnalysisViewProps {
  project: Project | null;
  materials?: MaterialItem[];
  produceItems?: ProduceItem[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  onUpdateProject?: (updatedProject: Project) => void;
  onAddProduceItem?: (item: ProduceItem) => void;
  onAddMaterial?: (mat: MaterialItem) => void;
  onRefreshAnalytics: () => void;
  onExportPDF: () => void;
  onNavigateToProjects: () => void;
}

export const CostAnalysisView: React.FC<CostAnalysisViewProps> = ({
  project,
  materials = [],
  produceItems = [],
  suppliers = [],
  subcontractors = [],
  outsourcedServices = [],
  onUpdateProject = () => {},
  onAddProduceItem,
  onAddMaterial,
  onRefreshAnalytics,
  onExportPDF,
  onNavigateToProjects
}) => {
  // Two tabs as requested by user:
  // Tab 1: 'Project Dashboard' (charts, analytics, project service & product items list view, quick insert from database or scratch)
  // Tab 2: 'Cost Controls' (materials, subcontractor rates, outsourced services, multi-supplier rates comparison, multiple budgetary plans from scratch)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cost-controls'>('dashboard');

  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 m-4 shadow-sm">
        <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-normal text-slate-800">No project selected for analysis</h3>
        <p className="text-slate-500 text-xs mt-1">Please select an existing contract or create a new project.</p>
        <button
          onClick={onNavigateToProjects}
          className="mt-3 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
        >
          Open Projects Directory
        </button>
      </div>
    );
  }

  const activePlanName = project.budgetaryPlans?.find(p => p.id === project.activePlanId)?.name || 'Plan A (Baseline)';

  return (
    <div className="space-y-4">
      {/* Top Project Breadcrumb & Actions Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="font-mono text-[#003049] font-normal uppercase">{project.code}</span>
            <span>•</span>
            <span>{project.category}</span>
            <span>&gt;</span>
            <span>{project.subCategory}</span>
            <span>•</span>
            <span className="text-[#c1121f] font-normal flex items-center space-x-1">
              <Building2 className="w-3 h-3" />
              <span>{project.client}</span>
            </span>
          </div>

          <h2 className="text-base font-normal text-[#003049] mt-0.5 flex items-center space-x-2">
            <span>{project.name}</span>
            <span className="text-xs text-slate-500 font-normal">({project.targetProduct})</span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Active Plan Pill */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#fdf0d5] text-[#780000] border border-[#ecd5a8] px-2.5 py-1 rounded-lg text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#c1121f]" />
            <span className="font-normal text-[11px]">{activePlanName}</span>
          </div>

          <button
            onClick={onRefreshAnalytics}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-normal rounded-lg border border-slate-200 transition-colors shadow-2xs"
            title="Recalculate Python analytics engine"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Recalculate</span>
          </button>

          <button
            onClick={onExportPDF}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
          >
            <FileDown className="w-3.5 h-3.5 text-[#fdf0d5]" />
            <span>Export PDF Quote</span>
          </button>
        </div>
      </div>

      {/* Two Main Tabs: 'Project Dashboard' and 'Cost Controls' */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 flex items-center justify-start space-x-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-normal transition-all ${
            activeTab === 'dashboard'
              ? 'bg-[#003049] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#fdf0d5]" />
          <div className="text-left">
            <span className="block text-xs font-normal leading-tight">Project Dashboard</span>
            <span className={`block text-[10px] leading-tight ${activeTab === 'dashboard' ? 'text-slate-300' : 'text-slate-400'}`}>
              Analytics, Charts &amp; Deliverables List
            </span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('cost-controls')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-normal transition-all ${
            activeTab === 'cost-controls'
              ? 'bg-[#003049] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-[#fdf0d5]" />
          <div className="text-left">
            <span className="block text-xs font-normal leading-tight">Cost Controls</span>
            <span className={`block text-[10px] leading-tight ${activeTab === 'cost-controls' ? 'text-slate-300' : 'text-slate-400'}`}>
              Materials, Multi-Supplier Rates &amp; Budget Plans
            </span>
          </div>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'dashboard' ? (
        <ProjectDashboardTab
          project={project}
          produceItems={produceItems}
          onUpdateProject={onUpdateProject}
          onAddProduceItem={onAddProduceItem}
        />
      ) : (
        <ProjectCostControlsTab
          project={project}
          materials={materials}
          suppliers={suppliers}
          subcontractors={subcontractors}
          outsourcedServices={outsourcedServices}
          onUpdateProject={onUpdateProject}
          onAddMaterial={onAddMaterial}
        />
      )}
    </div>
  );
};

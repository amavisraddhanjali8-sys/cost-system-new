import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  Sparkles,
  ArrowLeft,
  FileDown,
  RefreshCw,
  Plus,
  Copy,
  Layers,
  LayoutDashboard,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  Building2,
  ChevronDown,
  Trash2,
  ShieldCheck,
  Package,
  HardHat,
  Truck,
  ArrowRight,
  Palette,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  FolderInput
} from 'lucide-react';
import {
  Project,
  BudgetaryPlan,
  ProjectCostItem,
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem
} from '../types';
import { ProjectDashboardTab } from './project/ProjectDashboardTab';
import { ProjectCostControlsTab } from './project/ProjectCostControlsTab';
import { CreateBudgetPlanModal } from './project/CreateBudgetPlanModal';
import { ImportPlanFromOtherProjectModal } from './project/ImportPlanFromOtherProjectModal';
import { PlanTemplatesLibraryModal } from './project/PlanTemplatesLibraryModal';
import { SavePlanAsTemplateModal } from './project/SavePlanAsTemplateModal';
import { ModernTileCard } from './ModernTileCard';
import { calculateProjectMetrics } from '../utils/costCalculations';
import { getRandomThemeIndex, getThemeById } from '../data/tileThemes';

export interface ProjectHomeViewProps {
  project: Project | null;
  allProjects: Project[];
  onSelectProject: (p: Project) => void;
  onUpdateProject: (updatedProject: Project) => void;
  materials: MaterialItem[];
  suppliers: Supplier[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  produceItems?: ProduceItem[];
  onAddProduceItem?: (item: any) => void;
  onAddMaterial?: (m: MaterialItem) => void;
  onRefreshAnalytics?: () => void;
  onExportPDF?: () => void;
  onNavigateBack?: () => void;
  initialSubTab?: 'plans' | 'dashboard' | 'cost-controls';
}

export const ProjectHomeView: React.FC<ProjectHomeViewProps> = ({
  project,
  allProjects,
  onSelectProject,
  onUpdateProject,
  materials,
  suppliers,
  subcontractors,
  outsourcedServices,
  produceItems = [],
  onAddProduceItem,
  onAddMaterial,
  onRefreshAnalytics,
  onExportPDF,
  onNavigateBack,
  initialSubTab = 'plans'
}) => {
  const [subTab, setSubTab] = useState<'plans' | 'dashboard' | 'cost-controls'>(initialSubTab);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [planToSaveAsTemplate, setPlanToSaveAsTemplate] = useState<BudgetaryPlan | null>(null);

  const handleOpenSaveAsTemplate = (planToSave: BudgetaryPlan) => {
    setPlanToSaveAsTemplate(planToSave);
    setIsSaveTemplateModalOpen(true);
  };

  // Fallback if no project is selected
  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 m-4 shadow-sm">
        <FolderGit2 className="w-12 h-12 text-[#003049]/40 mx-auto mb-3" />
        <h3 className="text-base font-normal text-slate-800">No project currently selected</h3>
        <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
          Please select an enterprise project from your active portfolio or create a new contract.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {allProjects.length > 0 && (
            <button
              onClick={() => onSelectProject(allProjects[0])}
              className="px-4 py-2 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
            >
              Open First Project ({allProjects[0].code})
            </button>
          )}
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-normal rounded-lg transition-colors border border-slate-200"
            >
              Back to Resource Center
            </button>
          )}
        </div>
      </div>
    );
  }

  // Ensure project has at least Plan A and Plan B
  const plans: BudgetaryPlan[] = useMemo(() => {
    if (project.budgetaryPlans && project.budgetaryPlans.length > 0) {
      return project.budgetaryPlans;
    }

    // Generate Default Plan A (Baseline) and Plan B (Value-Engineered)
    const baselineItems: ProjectCostItem[] = project.selectedItems || [];

    // Plan B items with ~12% savings on materials & local suppliers
    const planBItems: ProjectCostItem[] = baselineItems.map((item, idx) => {
      if (item.type === 'material') {
        const discountedRate = Number((item.unitCost * 0.88).toFixed(2));
        const total = item.quantity * discountedRate * (1 - (item.discountPct || 0) / 100);
        return {
          ...item,
          id: `pB-${item.id}-${idx}`,
          unitCost: discountedRate,
          totalCost: Number(total.toFixed(2)),
          supplierOrProvider: `${item.supplierOrProvider} (Domestic Tier-2 Contract)`
        };
      }
      return {
        ...item,
        id: `pB-${item.id}-${idx}`
      };
    });

    const defaultPlanA: BudgetaryPlan = {
      id: 'plan-01',
      name: 'Plan A: Certified Enterprise Sourcing (Baseline)',
      description: 'Primary baseline using AS9100D certified mills, ISO 9001 vendors and verified subcontractors.',
      isBaseline: true,
      targetMarginPct: project.targetMarginPct || 35,
      overheadPct: project.overheadPct || 8.5,
      contingencyPct: project.contingencyPct || 5.0,
      selectedItems: baselineItems,
      createdAt: '2026-03-01',
      themeId: 'airbus-cobalt'
    };

    const defaultPlanB: BudgetaryPlan = {
      id: 'plan-02',
      name: 'Plan B: Value-Engineered / Domestic Alternative',
      description: 'Replaced overseas titanium billets with certified domestic alloy extrusions, reducing direct costs.',
      isBaseline: false,
      targetMarginPct: (project.targetMarginPct || 35) + 3.5,
      overheadPct: 7.5,
      contingencyPct: 4.0,
      selectedItems: planBItems,
      createdAt: '2026-03-05',
      themeId: 'emerald-oasis'
    };

    return [defaultPlanA, defaultPlanB];
  }, [project.budgetaryPlans, project.selectedItems, project.targetMarginPct, project.overheadPct, project.contingencyPct]);

  const activePlanId = project.activePlanId || plans[0]?.id || 'plan-01';
  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === activePlanId) || plans[0];
  }, [plans, activePlanId]);

  // Handler to set active plan
  const handleSelectActivePlan = (planId: string) => {
    const targetPlan = plans.find((p) => p.id === planId) || plans[0];
    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      targetPlan.targetMarginPct,
      targetPlan.overheadPct,
      targetPlan.contingencyPct,
      targetPlan.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      activePlanId: planId,
      budgetaryPlans: plans,
      analytics: newMetrics
    });
  };

  // Handler to duplicate a plan
  const handleDuplicatePlan = (plan: BudgetaryPlan) => {
    const newId = `plan-${Date.now()}`;
    const duplicate: BudgetaryPlan = {
      ...plan,
      id: newId,
      name: `${plan.name} (Copy)`,
      isBaseline: false,
      selectedItems: (plan.selectedItems || []).map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      })),
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedPlans = [...plans, duplicate];
    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      activePlanId: newId
    });
  };

  // Handler to delete a plan
  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) return;
    const updatedPlans = plans.filter((p) => p.id !== planId);
    const newActiveId = activePlanId === planId ? updatedPlans[0].id : activePlanId;
    const targetPlan = updatedPlans.find((p) => p.id === newActiveId) || updatedPlans[0];

    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      targetPlan.targetMarginPct,
      targetPlan.overheadPct,
      targetPlan.contingencyPct,
      targetPlan.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      activePlanId: newActiveId,
      analytics: newMetrics
    });
  };

  // Handler to update a plan's theme
  const handleUpdatePlanTheme = (planId: string, themeId: string, customGrad?: string) => {
    const updatedPlans = plans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          themeId,
          customGradient: customGrad
        };
      }
      return p;
    });

    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans
    });
  };

  // Handler to create a new plan
  const handleCreateNewPlan = (newPlan: BudgetaryPlan) => {
    const updatedPlans = [...plans, newPlan];
    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      newPlan.targetMarginPct,
      newPlan.overheadPct,
      newPlan.contingencyPct,
      newPlan.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      activePlanId: newPlan.id,
      analytics: newMetrics
    });
    setIsCreatePlanModalOpen(false);
  };

  // Compute metrics for all plans to show comparison
  const plansWithMetrics = useMemo(() => {
    return plans.map((p, idx) => {
      const metrics = calculateProjectMetrics(
        project.quotedPrice,
        p.targetMarginPct || project.targetMarginPct,
        p.overheadPct || 8.5,
        p.contingencyPct || 5.0,
        p.selectedItems || [],
        project.phases || []
      );
      const matCount = (p.selectedItems || []).filter((i) => i.type === 'material').length;
      const subCount = (p.selectedItems || []).filter((i) => i.type === 'subcontractor').length;
      const outCount = (p.selectedItems || []).filter((i) => i.type === 'outsourced').length;
      return {
        plan: p,
        metrics,
        matCount,
        subCount,
        outCount,
        defaultTheme: getRandomThemeIndex(idx)
      };
    });
  }, [plans, project.quotedPrice, project.targetMarginPct, project.phases]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. TOP HEADER & BREADCRUMB BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {/* Breadcrumbs & Navigation Back */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              {onNavigateBack && (
                <button
                  onClick={onNavigateBack}
                  className="flex items-center space-x-1 text-[#003049] hover:text-[#002235] font-normal hover:underline mr-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Resource Center</span>
                </button>
              )}
              <span>•</span>
              <span className="font-mono text-[#003049] font-normal uppercase">{project.code}</span>
              <span>•</span>
              <span className="text-slate-600">{project.productCategory || 'Heavy Automation'}</span>
              <span>&gt;</span>
              <span className="text-slate-600">{project.productSubCategory || 'Stamping & Press'}</span>
              <span>•</span>
              <span className="text-[#c1121f] font-normal flex items-center space-x-1">
                <Building2 className="w-3 h-3" />
                <span>{project.clientName}</span>
              </span>
            </div>

            {/* Project Title & Scope */}
            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              <h1 className="text-lg font-normal text-[#003049] flex items-center space-x-2">
                <span>{project.name}</span>
              </h1>
              <span className="text-xs text-slate-500 font-normal">({project.targetProduct})</span>
              <span className="px-2 py-0.5 text-[10px] font-normal uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {project.status || 'In Execution'}
              </span>
            </div>

            {/* Key Meta Stats Strip */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
              <div className="flex items-center space-x-1">
                <span className="text-slate-400">Quoted Value:</span>
                <span className="text-slate-900 font-normal">${Number(project.quotedPrice || 0).toLocaleString()}</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400">Target Margin:</span>
                <span className="text-[#003049] font-normal">{Number(project.targetMarginPct || 0).toFixed(1)}%</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400">Deadline:</span>
                <span className="text-slate-700 font-normal">{project.deliveryDeadline || '2026-09-15'}</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1 bg-[#fdf0d5] text-[#780000] border border-[#ecd5a8] px-2 py-0.5 rounded text-[11px]">
                <Sparkles className="w-3 h-3 text-[#c1121f]" />
                <span className="font-normal">Active: {activePlan.name.split(':')[0]}</span>
              </div>
            </div>
          </div>

          {/* Action cluster: Recalculate, Export PDF */}
          <div className="flex flex-wrap items-center gap-2">
            {onRefreshAnalytics && (
              <button
                onClick={onRefreshAnalytics}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-normal rounded-lg border border-slate-200 transition-colors shadow-2xs"
                title="Recalculate Python analytics engine"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Recalculate</span>
              </button>
            )}

            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
              >
                <FileDown className="w-3.5 h-3.5 text-[#fdf0d5]" />
                <span>Export PDF Quote</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. THREE PRIMARY TABS IN PROJECT HOME */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 flex flex-wrap items-center justify-start gap-1.5">
        {/* Tab 1: Project Plans (Plan A, Plan B Tiles) */}
        <button
          onClick={() => setSubTab('plans')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-normal transition-all ${
            subTab === 'plans'
              ? 'bg-[#003049] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-[#fdf0d5]" />
          <div className="text-left">
            <span className="block text-xs font-normal leading-tight">Project Plans (Plan A, Plan B)</span>
            <span className={`block text-[10px] leading-tight ${subTab === 'plans' ? 'text-slate-300' : 'text-slate-400'}`}>
              Interactive Modern Tiles &amp; Strategy Compare
            </span>
          </div>
        </button>

        {/* Tab 2: Project / Plan Dashboard */}
        <button
          onClick={() => setSubTab('dashboard')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-normal transition-all ${
            subTab === 'dashboard'
              ? 'bg-[#003049] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#fdf0d5]" />
          <div className="text-left">
            <span className="block text-xs font-normal leading-tight">Project &amp; Plan Dashboard</span>
            <span className={`block text-[10px] leading-tight ${subTab === 'dashboard' ? 'text-slate-300' : 'text-slate-400'}`}>
              Analytics, Gross/Net Margins &amp; Deliverables
            </span>
          </div>
        </button>

        {/* Tab 3: Cost Control Page (Strictly for this Project & Plan) */}
        <button
          onClick={() => setSubTab('cost-controls')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-normal transition-all ${
            subTab === 'cost-controls'
              ? 'bg-[#003049] text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-[#fdf0d5]" />
          <div className="text-left">
            <span className="block text-xs font-normal leading-tight">Cost Control Page</span>
            <span className={`block text-[10px] leading-tight ${subTab === 'cost-controls' ? 'text-slate-300' : 'text-slate-400'}`}>
              Materials, Subcontractors &amp; Supplier Rates
            </span>
          </div>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: PROJECT PLANS VIEW (Plan A, Plan B Modern Tiles) */}
      {subTab === 'plans' && (
        <div className="space-y-4">
          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-normal rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-2xs"
              title="Import and isolate a plan from another project in your portfolio"
            >
              <FolderInput className="w-3.5 h-3.5 text-[#003049]" />
              <span>Include Plan from Other Project</span>
              {allProjects.filter(p => p.id !== project.id).length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#003049] text-white text-[10px] rounded-full font-mono">
                  {allProjects.filter(p => p.id !== project.id).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-normal rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-2xs"
              title="Browse and customize pre-configured sourcing templates"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#c1121f]" />
              <span>Templates Library</span>
            </button>

            <button
              onClick={() => handleOpenSaveAsTemplate(activePlan)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-normal rounded-lg transition-colors border border-amber-200 cursor-pointer shadow-2xs"
              title="Save current active plan as a reusable template"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Save Active as Template</span>
            </button>

            <button
              onClick={() => setIsCreatePlanModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>+ Create New Plan</span>
            </button>
          </div>

          {/* GRID OF PLAN TILES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plansWithMetrics.map(({ plan, metrics, matCount, subCount, outCount, defaultTheme }, idx) => {
              const isActive = plan.id === activePlanId;
              const themeId = plan.themeId || (idx === 0 ? 'airbus-cobalt' : idx === 1 ? 'emerald-oasis' : defaultTheme.id);
              const customGrad = plan.customGradient;
              const planTag = plan.isBaseline
                ? `PLAN ${String.fromCharCode(65 + idx)} • BASELINE APPROVED`
                : `PLAN ${String.fromCharCode(65 + idx)} • VALUE SCENARIO`;

              return (
                <div key={plan.id} className="relative flex flex-col">
                  {/* Modern Tile Card Component */}
                  <ModernTileCard
                    id={plan.id}
                    tag={planTag}
                    title={plan.name}
                    brief={plan.description || 'Custom sourcing and fabrication allocation scenario.'}
                    actionLabel="OPEN COST CONTROL PAGE"
                    actionVariant="link"
                    themeId={themeId}
                    customGradient={customGrad}
                    selected={isActive}
                    onChangeTheme={(tId, grad) => handleUpdatePlanTheme(plan.id, tId, grad)}
                    onDuplicate={() => handleDuplicatePlan(plan)}
                    onSaveAsTemplate={() => handleOpenSaveAsTemplate(plan)}
                    onDelete={plans.length > 1 ? () => handleDeletePlan(plan.id) : undefined}
                    onClick={() => {
                      handleSelectActivePlan(plan.id);
                    }}
                    onAction={() => {
                      handleSelectActivePlan(plan.id);
                      setSubTab('cost-controls');
                    }}
                    extraMeta={
                      <div className="mt-2 space-y-2 bg-black/25 backdrop-blur-xs p-2.5 rounded-xl border border-white/20 text-white text-xs">
                        {/* Financial Metrics Strip */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-white/70 block text-[10px]">Planned Direct Cost</span>
                            <span className="font-medium text-white">${metrics.totalDirectCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/70 block text-[10px]">Projected Gross Margin</span>
                            <span className="font-medium text-white">{metrics.grossMarginPct.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-white/70 block text-[10px]">Overhead &amp; Contingency</span>
                            <span className="font-medium text-white">${(metrics.overheadAmount + metrics.contingencyAmount).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-white/70 block text-[10px]">Projected Net Profit</span>
                            <span className="font-medium text-white">${metrics.netProfit.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Breakdown count badge */}
                        <div className="pt-1.5 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90">
                          <span className="flex items-center space-x-1">
                            <Package className="w-3 h-3" />
                            <span>{matCount} Mat</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <HardHat className="w-3 h-3" />
                            <span>{subCount} Sub</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Truck className="w-3 h-3" />
                            <span>{outCount} Out</span>
                          </span>
                          <span>•</span>
                          <span className="font-medium">{(plan.selectedItems || []).length} Total Items</span>
                        </div>
                      </div>
                    }
                  />

                  {/* Secondary Quick Action Bar below Tile */}
                  <div className="mt-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center space-x-1">
                      {isActive ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active Plan</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectActivePlan(plan.id)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Set as Active
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenSaveAsTemplate(plan)}
                        className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-normal transition-colors flex items-center space-x-1"
                        title="Save this plan as a reusable template"
                      >
                        <Bookmark className="w-3 h-3 text-amber-700" />
                        <span>Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectActivePlan(plan.id);
                          setSubTab('dashboard');
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-normal transition-colors"
                        title="View Plan Dashboard"
                      >
                        Dashboard →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectActivePlan(plan.id);
                          setSubTab('cost-controls');
                        }}
                        className="px-2 py-1 rounded bg-[#003049] hover:bg-[#002235] text-white text-[11px] font-normal transition-colors"
                        title="Open Cost Control Page for this Plan"
                      >
                        Cost Controls →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add / Plan Options Tile */}
            <div className="min-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 flex flex-col justify-between text-center transition-all duration-200 shadow-2xs">
              <div className="pt-2">
                <div className="w-10 h-10 rounded-full bg-[#003049]/10 flex items-center justify-center text-[#003049] mx-auto mb-2">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-medium text-slate-900">
                  Add Plan Scenario
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Every project has unique separated plans. Choose how to add your next plan:
                </p>
              </div>

              <div className="space-y-1.5 my-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePlanModalOpen(true)}
                  className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 font-normal flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#003049]" />
                  <span>Start Blank Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 font-normal flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <FolderInput className="w-3.5 h-3.5 text-[#003049]" />
                  <span>Include from Other Project</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 font-normal flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#c1121f]" />
                  <span>From Template Library</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400">
                All plans remain completely isolated to {project.code}
              </div>
            </div>
          </div>

          {/* SIDE-BY-SIDE STRATEGIC PLAN COMPARISON BANNER */}
          {plansWithMetrics.length >= 2 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-6">
              <div className="flex items-center space-x-2 text-xs font-normal text-[#003049] uppercase tracking-wider mb-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#c1121f]" />
                <span>Side-by-Side Sourcing Matrix Comparison (Plan A vs Plan B)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 text-slate-900 border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-normal">Plan Scenario</th>
                      <th className="py-2.5 px-3 font-normal">Classification</th>
                      <th className="py-2.5 px-3 font-normal text-right">Planned Direct Cost</th>
                      <th className="py-2.5 px-3 font-normal text-right">Gross Margin %</th>
                      <th className="py-2.5 px-3 font-normal text-right">Projected Net Profit</th>
                      <th className="py-2.5 px-3 font-normal text-right">Cost Variance vs Plan A</th>
                      <th className="py-2.5 px-3 font-normal text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plansWithMetrics.map(({ plan, metrics }, idx) => {
                      const baselineMetrics = plansWithMetrics[0].metrics;
                      const costDiff = metrics.totalDirectCost - baselineMetrics.totalDirectCost;
                      const isBase = idx === 0;

                      return (
                        <tr key={plan.id} className={plan.id === activePlanId ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {plan.name}
                            {plan.id === activePlanId && (
                              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {plan.isBaseline ? 'Approved Baseline' : 'Alternative Scenario'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-normal text-slate-900">
                            ${metrics.totalDirectCost.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-[#003049]">
                            {metrics.grossMarginPct.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-normal text-slate-900">
                            ${metrics.netProfit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {isBase ? (
                              <span className="text-slate-400">Baseline (0.00)</span>
                            ) : costDiff < 0 ? (
                              <span className="text-emerald-700 font-medium">
                                -${Math.abs(costDiff).toLocaleString()} (Saves {Math.abs((costDiff / baselineMetrics.totalDirectCost) * 100).toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-rose-700 font-medium">
                                +${costDiff.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenSaveAsTemplate(plan)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] rounded transition-colors flex items-center space-x-1"
                                title="Save this plan scenario as a reusable template"
                              >
                                <Bookmark className="w-3 h-3 text-amber-700" />
                                <span>Save Template</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleSelectActivePlan(plan.id);
                                  setSubTab('cost-controls');
                                }}
                                className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-[11px] rounded transition-colors"
                              >
                                Cost Controls
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROJECT & PLAN DASHBOARD */}
      {subTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Active Plan Selector Strip inside Dashboard */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-normal">Dashboard Focused on:</span>
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectActivePlan(p.id)}
                    className={`px-3 py-1 rounded-md text-xs font-normal transition-all ${
                      p.id === activePlanId
                        ? 'bg-[#003049] text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p.name.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Contract Value: <span className="font-normal text-slate-900">${Number(project.quotedPrice || 0).toLocaleString()}</span>
            </div>
          </div>

          <ProjectDashboardTab
            project={project}
            produceItems={produceItems}
            onUpdateProject={onUpdateProject}
            onAddProduceItem={onAddProduceItem}
          />
        </div>
      )}

      {/* TAB 3: COST CONTROL PAGE (Strictly for this Project and Plan Only) */}
      {subTab === 'cost-controls' && (
        <div className="space-y-4">
          <ProjectCostControlsTab
            project={project}
            allProjects={allProjects}
            materials={materials}
            suppliers={suppliers}
            subcontractors={subcontractors}
            outsourcedServices={outsourcedServices}
            onUpdateProject={onUpdateProject}
            onAddMaterial={onAddMaterial}
          />
        </div>
      )}

      {/* Create Plan from Scratch Modal */}
      {isCreatePlanModalOpen && (
        <CreateBudgetPlanModal
          isOpen={isCreatePlanModalOpen}
          onClose={() => setIsCreatePlanModalOpen(false)}
          currentPlanItems={activePlan.selectedItems || []}
          onCreatePlan={handleCreateNewPlan}
        />
      )}

      {/* Include / Import Plan from Another Project Modal */}
      {isImportModalOpen && (
        <ImportPlanFromOtherProjectModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentProject={project}
          allProjects={allProjects}
          onImportPlan={handleCreateNewPlan}
        />
      )}

      {/* Budgetary Plan Templates Library Modal */}
      {isTemplatesModalOpen && (
        <PlanTemplatesLibraryModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          currentProject={project}
          onApplyTemplate={handleCreateNewPlan}
          onOpenSaveCurrentPlan={() => {
            setIsTemplatesModalOpen(false);
            handleOpenSaveAsTemplate(activePlan);
          }}
        />
      )}

      {/* Save Plan as Template Modal */}
      {isSaveTemplateModalOpen && planToSaveAsTemplate && (
        <SavePlanAsTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => {
            setIsSaveTemplateModalOpen(false);
            setPlanToSaveAsTemplate(null);
          }}
          plan={planToSaveAsTemplate}
          projectCode={project.code}
          onSaved={() => {
            setIsSaveTemplateModalOpen(false);
            setPlanToSaveAsTemplate(null);
          }}
        />
      )}
    </div>
  );
};

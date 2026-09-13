import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Wrench,
  Truck,
  ArrowRight,
  ShieldCheck,
  Award,
  Clock,
  Copy,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  FolderInput
} from 'lucide-react';
import {
  Project,
  ProjectCostItem,
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  BudgetaryPlan
} from '../../types';
import { SupplierRatesComparisonModal } from './SupplierRatesComparisonModal';
import { QuickInsertSubcontractorModal } from './QuickInsertSubcontractorModal';
import { QuickInsertOutsourcedModal } from './QuickInsertOutsourcedModal';
import { CreateBudgetPlanModal } from './CreateBudgetPlanModal';
import { ImportPlanFromOtherProjectModal } from './ImportPlanFromOtherProjectModal';
import { PlanTemplatesLibraryModal } from './PlanTemplatesLibraryModal';
import { SavePlanAsTemplateModal } from './SavePlanAsTemplateModal';
import { calculateProjectMetrics } from '../../utils/costCalculations';

interface ProjectCostControlsTabProps {
  project: Project;
  allProjects?: Project[];
  materials: MaterialItem[];
  suppliers: Supplier[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  onUpdateProject: (updatedProject: Project) => void;
  onAddMaterial?: (mat: MaterialItem) => void;
}

export const ProjectCostControlsTab: React.FC<ProjectCostControlsTabProps> = ({
  project,
  allProjects = [],
  materials,
  suppliers,
  subcontractors,
  outsourcedServices,
  onUpdateProject,
  onAddMaterial
}) => {
  // Modal states
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedMaterialForCompare, setSelectedMaterialForCompare] = useState<MaterialItem | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSubcontractorForCompare, setSelectedSubcontractorForCompare] = useState<SubcontractorRateItem | null>(null);
  const [isOutModalOpen, setIsOutModalOpen] = useState(false);
  const [selectedOutsourcedForCompare, setSelectedOutsourcedForCompare] = useState<OutsourcedService | null>(null);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<'all' | 'material' | 'subcontractor' | 'outsourced'>('all');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editRate, setEditRate] = useState<number>(0);
  const [editDiscount, setEditDiscount] = useState<number>(0);

  // Budgetary plans
  const plans: BudgetaryPlan[] = useMemo(() => {
    if (project.budgetaryPlans && project.budgetaryPlans.length > 0) {
      return project.budgetaryPlans;
    }
    // Fallback baseline plan
    return [
      {
        id: 'plan-01',
        name: 'Plan A: Certified Enterprise Sourcing (Baseline)',
        description: 'Primary baseline using AS9100D certified mills, ISO 9001 vendors and verified subcontractors.',
        isBaseline: true,
        targetMarginPct: project.targetMarginPct || 35,
        overheadPct: 8.5,
        contingencyPct: 5.0,
        selectedItems: project.selectedItems || [],
        createdAt: '2026-03-01'
      }
    ];
  }, [project.budgetaryPlans, project.selectedItems, project.targetMarginPct]);

  const activePlanId = project.activePlanId || plans[0]?.id || 'plan-01';
  const activePlan = useMemo(() => {
    return plans.find(p => p.id === activePlanId) || plans[0];
  }, [plans, activePlanId]);

  const currentItems = activePlan.selectedItems || [];

  // Filtered items
  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return currentItems;
    return currentItems.filter(item => item.type === typeFilter);
  }, [currentItems, typeFilter]);

  // Plan live metrics calculation
  const planMetrics = useMemo(() => {
    return calculateProjectMetrics(
      project.quotedPrice,
      activePlan.targetMarginPct || project.targetMarginPct,
      activePlan.overheadPct || 8.5,
      activePlan.contingencyPct || 5.0,
      currentItems,
      project.phases || []
    );
  }, [project.quotedPrice, activePlan, currentItems, project.phases]);

  // Category sums
  const materialsTotal = currentItems
    .filter(i => i.type === 'material')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const subTotal = currentItems
    .filter(i => i.type === 'subcontractor')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const outTotal = currentItems
    .filter(i => i.type === 'outsourced')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);

  // Update helper that updates active plan's items and recalculates project
  const updateActivePlanItems = (newItems: ProjectCostItem[], customQuotedPrice?: number) => {
    const updatedPlans = plans.map(p => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          selectedItems: newItems
        };
      }
      return p;
    });

    const targetQuoted = customQuotedPrice !== undefined ? customQuotedPrice : project.quotedPrice;

    const newMetrics = calculateProjectMetrics(
      targetQuoted,
      activePlan.targetMarginPct || project.targetMarginPct,
      activePlan.overheadPct || 8.5,
      activePlan.contingencyPct || 5.0,
      newItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      quotedPrice: targetQuoted,
      budgetaryPlans: updatedPlans,
      selectedItems: activePlan.isBaseline ? newItems : project.selectedItems,
      analytics: newMetrics
    });
  };

  // Add cost item to active plan
  const handleAddCostItem = (item: ProjectCostItem, syncRevenue = true) => {
    const newItems = [item, ...currentItems];
    const targetQuoted =
      syncRevenue && item.totalRevenue && item.totalRevenue > 0
        ? Number(((project.quotedPrice || 0) + item.totalRevenue).toFixed(2))
        : project.quotedPrice;
    updateActivePlanItems(newItems, targetQuoted);
  };

  // Remove cost item
  const handleRemoveCostItem = (id: string) => {
    const newItems = currentItems.filter(i => i.id !== id);
    updateActivePlanItems(newItems);
  };

  // Start edit
  const handleStartEdit = (item: ProjectCostItem) => {
    setEditingItemId(item.id);
    setEditQty(item.quantity);
    setEditRate(item.unitCost);
    setEditDiscount(item.discountPct || 0);
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    const newItems = currentItems.map(item => {
      if (item.id === id) {
        const total = editQty * editRate * (1 - editDiscount / 100);
        return {
          ...item,
          quantity: editQty,
          unitCost: editRate,
          discountPct: editDiscount,
          totalCost: Number(total.toFixed(2))
        };
      }
      return item;
    });
    setEditingItemId(null);
    updateActivePlanItems(newItems);
  };

  // Create new plan from scratch
  const handleCreatePlan = (newPlan: BudgetaryPlan) => {
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
  };

  // Switch active plan
  const handleSwitchPlan = (planId: string) => {
    const targetPlan = plans.find(p => p.id === planId) || plans[0];
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
      analytics: newMetrics
    });
  };

  // Set active plan as baseline
  const handleSetBaseline = () => {
    const updatedPlans = plans.map(p => ({
      ...p,
      isBaseline: p.id === activePlan.id
    }));

    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      selectedItems: activePlan.selectedItems
    });
  };

  // Duplicate active plan
  const handleDuplicatePlan = () => {
    const dupId = `plan-${Date.now()}`;
    const dupPlan: BudgetaryPlan = {
      ...activePlan,
      id: dupId,
      name: `${activePlan.name} (Copy)`,
      isBaseline: false,
      selectedItems: (activePlan.selectedItems || []).map(i => ({
        ...i,
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      })),
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedPlans = [...plans, dupPlan];
    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      activePlanId: dupId
    });
  };

  // Delete active plan
  const handleDeletePlan = () => {
    if (plans.length <= 1) return;
    const remaining = plans.filter(p => p.id !== activePlan.id);
    const newActive = remaining[0];
    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      newActive.targetMarginPct,
      newActive.overheadPct,
      newActive.contingencyPct,
      newActive.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      budgetaryPlans: remaining,
      activePlanId: newActive.id,
      analytics: newMetrics
    });
  };

  // Open supplier comparison for an existing item
  const handleOpenComparisonForItem = (item: ProjectCostItem) => {
    const matchedMat = materials.find(m => m.id === item.itemId || m.name === item.name);
    if (matchedMat) {
      setSelectedMaterialForCompare(matchedMat);
    } else {
      // Create a temporary representation
      setSelectedMaterialForCompare({
        id: item.itemId,
        code: 'MAT-SPEC',
        name: item.name,
        category: item.category,
        subCategory: 'Procured Spec',
        moreSubCategory: 'Custom Procurement',
        itemClassification: 'raw_material',
        supplierId: 'sup-01',
        supplierName: item.supplierOrProvider,
        unit: item.unit,
        retailPrice: item.unitCost,
        defaultDiscountPct: item.discountPct || 0,
        inStock: 100,
        reorderPoint: 20,
        leadTimeDays: 7,
        lastUpdated: new Date().toISOString().split('T')[0],
        priceHistory: []
      });
    }
    setIsMaterialModalOpen(true);
  };

  // Open subcontractor comparison for an existing item
  const handleOpenSubComparisonForItem = (item: ProjectCostItem) => {
    const matchedSub = subcontractors.find(s => s.id === item.itemId || s.name === item.name);
    if (matchedSub) {
      setSelectedSubcontractorForCompare(matchedSub);
    } else {
      setSelectedSubcontractorForCompare({
        id: item.itemId,
        code: 'SUB-SPEC',
        name: item.name,
        subcontractorId: 'sub-01',
        subcontractorName: item.supplierOrProvider,
        serviceType: item.name,
        category: item.category,
        unit: item.unit,
        baseRate: item.unitCost,
        rate: item.unitCost,
        skillLevel: 'Senior Specialist',
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setIsSubModalOpen(true);
  };

  // Open outsourced service comparison for an existing item
  const handleOpenOutsourcedComparisonForItem = (item: ProjectCostItem) => {
    const matchedOut = outsourcedServices.find(s => s.id === item.itemId || s.name === item.name);
    if (matchedOut) {
      setSelectedOutsourcedForCompare(matchedOut);
    } else {
      setSelectedOutsourcedForCompare({
        id: item.itemId,
        code: 'OUT-SPEC',
        name: item.name,
        providerId: 'prov-01',
        providerName: item.supplierOrProvider,
        category: item.category,
        subCategory: 'Specialized Outsourced Service',
        baseUnitType: item.unit,
        rate: item.unitCost,
        retailPrice: item.unitCost * 1.3,
        tierRates: [],
        slaLevel: 'Standard SLA',
        priceHistory: [],
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setIsOutModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 1. PLAN DETAIL & FINANCIAL ROLLUP STRIP */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Active Plan Detail & Actions Strip */}
        <div className="p-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center space-x-2">
              {plans.length > 1 ? (
                <div className="flex items-center space-x-1.5">
                  <select
                    value={activePlan.id}
                    onChange={(e) => handleSwitchPlan(e.target.value)}
                    className="font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049] cursor-pointer"
                    title="Switch Budget Plan"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isBaseline ? '(Baseline)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="font-semibold text-slate-900">{activePlan.name}</span>
              )}

              {activePlan.isBaseline ? (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Approved Contract Baseline</span>
                </span>
              ) : (
                <button
                  onClick={handleSetBaseline}
                  className="text-[10px] text-[#003049] bg-[#fdf0d5] hover:bg-[#ecd5a8] px-2 py-0.5 rounded border border-[#ecd5a8] transition-colors cursor-pointer"
                >
                  Set as Active Baseline
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{activePlan.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allProjects && allProjects.filter(p => p.id !== project.id).length > 0 && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 text-slate-700 hover:text-[#003049] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors text-xs cursor-pointer shadow-2xs"
                title="Include a plan from another project in your portfolio"
              >
                <FolderInput className="w-3.5 h-3.5 text-[#003049]" />
                <span className="hidden sm:inline">Include Plan</span>
              </button>
            )}

            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-slate-700 hover:text-[#003049] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors text-xs cursor-pointer shadow-2xs"
              title="Browse pre-configured plan templates"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#c1121f]" />
              <span className="hidden sm:inline">Templates</span>
            </button>

            <button
              onClick={() => setIsSaveTemplateModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors text-xs cursor-pointer shadow-2xs"
              title="Save this plan as a reusable template"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-700" />
              <span>Save as Template</span>
            </button>

            <button
              onClick={handleDuplicatePlan}
              className="flex items-center space-x-1 px-2.5 py-1 text-slate-700 hover:text-[#003049] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors text-xs cursor-pointer shadow-2xs"
              title="Clone this plan as a new starting scenario"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            {plans.length > 1 && (
              <button
                onClick={handleDeletePlan}
                className="flex items-center space-x-1 px-2.5 py-1 text-slate-400 hover:text-[#c1121f] hover:bg-red-50 border border-transparent rounded-lg transition-colors text-xs cursor-pointer"
                title="Delete this budgetary plan"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={() => setIsCreatePlanModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Create a new budgetary scenario"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>+ New Plan</span>
            </button>
          </div>
        </div>

        {/* Active Plan Financial Rollup Badges */}
        <div className="bg-[#fdf0d5]/40 border-t border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">Direct Sourcing Cost</span>
            <span className="font-normal text-slate-900">${planMetrics.totalDirectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Overhead ({activePlan.overheadPct || 8.5}%)</span>
            <span className="font-normal text-slate-900">${planMetrics.overheadAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Contingency ({activePlan.contingencyPct || 5.0}%)</span>
            <span className="font-normal text-slate-900">${planMetrics.contingencyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Total Plan Cost</span>
            <span className="font-normal text-[#003049]">${planMetrics.totalProjectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Plan Gross Margin</span>
            <span className="font-normal text-[#c1121f] text-sm">{planMetrics.grossMarginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* 2. COST CONTROLS CATEGORY TABS & QUICK INSERT BUTTONS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded text-[11px] font-normal transition-colors ${
                typeFilter === 'all' ? 'bg-[#003049] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items ({currentItems.length})
            </button>
            <button
              onClick={() => setTypeFilter('material')}
              className={`px-3 py-1 rounded text-[11px] font-normal transition-colors ${
                typeFilter === 'material' ? 'bg-[#003049] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Materials (${materialsTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
            <button
              onClick={() => setTypeFilter('subcontractor')}
              className={`px-3 py-1 rounded text-[11px] font-normal transition-colors ${
                typeFilter === 'subcontractor' ? 'bg-[#003049] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Subcontractor Labour (${subTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
            <button
              onClick={() => setTypeFilter('outsourced')}
              className={`px-3 py-1 rounded text-[11px] font-normal transition-colors ${
                typeFilter === 'outsourced' ? 'bg-[#003049] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Outsourced Services (${outTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
          </div>

          {/* Quick Insert Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Quick Insert Material Button with Golden Emphasis */}
            <button
              onClick={() => {
                setSelectedMaterialForCompare(null);
                setIsMaterialModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#c1121f] hover:bg-[#a10e19] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>+ Quick Insert Material (Compare Supplier Rates)</span>
            </button>

            <button
              onClick={() => setIsSubModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
            >
              <Wrench className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>+ Subcontractor Labour</span>
            </button>

            <button
              onClick={() => setIsOutModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#669bbc] hover:bg-[#4e82a3] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
            >
              <Truck className="w-3.5 h-3.5 text-white" />
              <span>+ Outsourced Service</span>
            </button>
          </div>
        </div>

        {/* 3. COST ITEMS DETAILED TABLE */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#fdf0d5]/70 text-[#003049] uppercase text-[10px] tracking-normal border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-normal">Line Item Specification</th>
                <th className="py-2.5 px-2 font-normal">Type</th>
                <th className="py-2.5 px-3 font-normal">Supplier / Provider &amp; Sourcing</th>
                <th className="py-2.5 px-2 font-normal">Phase</th>
                <th className="py-2.5 px-2 font-normal">Quantity</th>
                <th className="py-2.5 px-2.5 font-normal">Unit Rate</th>
                <th className="py-2.5 px-2 font-normal">Discount</th>
                <th className="py-2.5 px-3 font-normal text-right">Total Cost</th>
                <th className="py-2.5 px-3 font-normal text-center">Supplier Rates Comparison</th>
                <th className="py-2.5 px-2 font-normal text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    <p className="text-xs">No cost items currently in this view.</p>
                    <button
                      onClick={() => {
                        setSelectedMaterialForCompare(null);
                        setIsMaterialModalOpen(true);
                      }}
                      className="mt-2 text-xs text-[#003049] underline hover:text-[#c1121f]"
                    >
                      + Quick insert a material and compare supplier rates
                    </button>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isEditing = editingItemId === item.id;
                  const isMaterial = item.type === 'material';
                  const phaseObj = (project.phases || []).find(p => p.id === item.phaseId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Category */}
                      <td className="py-2 px-3">
                        <div className="font-normal text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.category}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-normal uppercase ${
                            item.type === 'material'
                              ? 'bg-[#003049] text-[#fdf0d5]'
                              : item.type === 'subcontractor'
                              ? 'bg-[#669bbc] text-white'
                              : 'bg-[#780000] text-white'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Supplier or Provider */}
                      <td className="py-2 px-3">
                        <div className="font-normal text-slate-800 flex items-center space-x-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{item.supplierOrProvider}</span>
                        </div>
                        {item.alternativeOptions && item.alternativeOptions.length > 0 && (
                          <div className="text-[10px] text-emerald-700 mt-0.5">
                            {item.alternativeOptions.length} alternative quotes evaluated
                          </div>
                        )}
                      </td>

                      {/* Phase */}
                      <td className="py-2 px-2">
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {phaseObj ? phaseObj.name.split(':')[0] : 'Phase 1'}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editQty}
                            onChange={e => setEditQty(Math.max(1, Number(e.target.value)))}
                            className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                          />
                        ) : (
                          <span className="text-slate-800">
                            {item.quantity} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* Unit Rate */}
                      <td className="py-2 px-2.5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editRate}
                            onChange={e => setEditRate(Number(e.target.value))}
                            className="w-20 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                          />
                        ) : (
                          <span className="text-slate-800">${item.unitCost.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Discount % */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={editDiscount}
                            onChange={e => setEditDiscount(Number(e.target.value))}
                            className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                          />
                        ) : (
                          <span className="text-slate-600">{item.discountPct ? `${item.discountPct}%` : '—'}</span>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="py-2 px-3 text-right">
                        <div className="font-normal text-[#003049]">
                          ${item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {item.totalRevenue && item.totalRevenue > 0 ? (
                          <div className="text-[10px] text-emerald-700 font-normal mt-0.5">
                            Rev: ${item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {item.grossProfit !== undefined ? ` (+${item.markupPct || 0}% markup)` : ''}
                          </div>
                        ) : null}
                      </td>

                      {/* Supplier / Contractor / Tariff Rates Comparison Button */}
                      <td className="py-2 px-3 text-center">
                        {isMaterial ? (
                          <button
                            onClick={() => handleOpenComparisonForItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#fdf0d5] hover:bg-[#ecd5a8] text-[#780000] border border-[#ecd5a8] rounded text-[10px] font-normal transition-colors"
                            title="Open all rates offered by multiple suppliers for this material"
                          >
                            <Building2 className="w-3 h-3" />
                            <span>Compare Rates</span>
                          </button>
                        ) : item.type === 'subcontractor' ? (
                          <button
                            onClick={() => handleOpenSubComparisonForItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#003049]/10 hover:bg-[#003049]/20 text-[#003049] border border-[#003049]/30 rounded text-[10px] font-normal transition-colors"
                            title="Compare rates from multiple certified trade contractors"
                          >
                            <Wrench className="w-3 h-3 text-[#003049]" />
                            <span>Compare Contractors</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenOutsourcedComparisonForItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded text-[10px] font-normal transition-colors"
                            title="Compare tariffs from certified carriers & utility escrows"
                          >
                            <Truck className="w-3 h-3 text-sky-700" />
                            <span>Compare Tariffs</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-0.5 bg-[#003049] text-white text-[10px] rounded hover:bg-[#002235]"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Edit Quantity / Rate"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveCostItem(item.id)}
                            className="p-1 text-slate-400 hover:text-[#c1121f] rounded hover:bg-slate-100"
                            title="Remove Cost Line"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Multi-Supplier Rates Comparison Modal */}
      <SupplierRatesComparisonModal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setSelectedMaterialForCompare(null);
        }}
        materials={materials}
        suppliers={suppliers}
        phases={project.phases || []}
        onAddCostItem={handleAddCostItem}
        onAddMaterial={onAddMaterial}
        initialMaterial={selectedMaterialForCompare}
      />

      {/* 2. Subcontractor Labour Quick Insert Modal */}
      <QuickInsertSubcontractorModal
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSelectedSubcontractorForCompare(null);
        }}
        subcontractors={subcontractors}
        phases={project.phases || []}
        onAddCostItem={handleAddCostItem}
        initialSubcontractor={selectedSubcontractorForCompare}
      />

      {/* 3. Outsourced Service Quick Insert Modal */}
      <QuickInsertOutsourcedModal
        isOpen={isOutModalOpen}
        onClose={() => {
          setIsOutModalOpen(false);
          setSelectedOutsourcedForCompare(null);
        }}
        outsourcedServices={outsourcedServices}
        phases={project.phases || []}
        onAddCostItem={handleAddCostItem}
        initialService={selectedOutsourcedForCompare}
      />

      {/* 4. Create Budgetary Plan from Scratch Modal */}
      <CreateBudgetPlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        currentPlanItems={currentItems}
        onCreatePlan={handleCreatePlan}
      />

      {/* 5. Include Plan from Other Project Modal */}
      {isImportModalOpen && (
        <ImportPlanFromOtherProjectModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentProject={project}
          allProjects={allProjects}
          onImportPlan={handleCreatePlan}
        />
      )}

      {/* 6. Plan Templates Library Modal */}
      {isTemplatesModalOpen && (
        <PlanTemplatesLibraryModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          currentProject={project}
          onApplyTemplate={handleCreatePlan}
          onOpenSaveCurrentPlan={() => {
            setIsTemplatesModalOpen(false);
            setIsSaveTemplateModalOpen(true);
          }}
        />
      )}

      {/* 7. Save Active Plan as Template Modal */}
      {isSaveTemplateModalOpen && (
        <SavePlanAsTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => setIsSaveTemplateModalOpen(false)}
          plan={activePlan}
          projectCode={project.code}
          onSaved={() => setIsSaveTemplateModalOpen(false)}
        />
      )}
    </div>
  );
};

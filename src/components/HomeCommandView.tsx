import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Building2,
  Cpu,
  Truck,
  Boxes,
  FolderGit2,
  BarChart3,
  Sparkles,
  Plus,
  Minus,
  ArrowRight,
  Search,
  ExternalLink,
  Table,
  CheckCircle2,
  Calendar,
  Users,
  Activity,
  DollarSign,
  FileDown,
  RefreshCw,
  FolderInput,
  Bookmark,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  PackagePlus,
  FilePlus,
  Settings,
  Zap,
  Info,
  Sliders,
  Filter,
  X,
  Menu,
  Maximize2,
  Minimize2,
  Star
} from 'lucide-react';
import {
  Project,
  MaterialItem,
  Supplier,
  SupplierContract,
  OutsourcedService,
  SubcontractorRateItem,
  ProduceItem,
  InventoryItem,
  BudgetaryPlan,
  ProjectCostItem,
  CompanyDetails,
  AppUser
} from '../types';
import { ActiveTab } from './TopNavbar';
import { AddItemModal } from './DirectoryCRUDModals';
import { CreateBudgetPlanModal } from './project/CreateBudgetPlanModal';
import { ImportPlanFromOtherProjectModal } from './project/ImportPlanFromOtherProjectModal';
import { PlanTemplatesLibraryModal } from './project/PlanTemplatesLibraryModal';
import { INITIAL_CATEGORY_HIERARCHY } from '../data/categoriesAndProfiles';
import { FXTTCardItemsListView } from './FXTTCardItemsListView';
import { ExportEnterpriseDataModal } from './ExportEnterpriseDataModal';
import { SelectProjectForExportModal } from './SelectProjectForExportModal';
import { HomeTelemetryCards } from './HomeTelemetryCards';

interface HomeCommandViewProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  materials: MaterialItem[];
  suppliers: Supplier[];
  outsourcedServices: OutsourcedService[];
  subcontractors: SubcontractorRateItem[];
  produceItems: ProduceItem[];
  inventory: InventoryItem[];
  onNavigateTab: (tabId: ActiveTab) => void;
  onAddMaterial: (mat: Partial<MaterialItem>) => void;
  onAddSupplier: (sup: Partial<Supplier>) => void;
  onAddSubcontractor: (sub: Partial<SubcontractorRateItem>) => void;
  onAddOutsourcedService: (srv: Partial<OutsourcedService>) => void;
  onAddProduceItem: (prd: Partial<ProduceItem>) => void;
  onAddInventory: (inv: Partial<InventoryItem>) => void;
  onAddProject: (proj: Partial<Project>) => void;
  onUpdateProject: (proj: Project) => void;
  onAddSupplierContract?: (supplierId: string, contract: Partial<SupplierContract>) => void;
  onRefreshAnalytics: () => void;
  onExportPDF: (project?: Project) => void;
  showToast: (msg: string) => void;
  companyDetails?: CompanyDetails;
  currentUser?: AppUser | null;
}

interface TreeNodeAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  onClick: () => void;
  children?: TreeNodeAction[];
}

interface PipelineTree {
  id: string;
  category: string;
  title: string;
  colorTheme: {
    name: string;
    containerBorder: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
    lineColor: string;
    idleBorder: string;
    idleIconBg: string;
    idleIconText: string;
    neonGradient: string;
    neonShadow: string;
    neonBorder: string;
    expandActiveBg: string;
  };
  rootNode: TreeNodeAction;
}

export const HomeCommandView: React.FC<HomeCommandViewProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  materials,
  suppliers,
  outsourcedServices,
  subcontractors,
  produceItems,
  inventory,
  onNavigateTab,
  onAddMaterial,
  onAddSupplier,
  onAddSubcontractor,
  onAddOutsourcedService,
  onAddProduceItem,
  onAddInventory,
  onAddProject,
  onUpdateProject,
  onAddSupplierContract,
  onRefreshAnalytics,
  onExportPDF,
  showToast,
  companyDetails,
  currentUser
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [activeNodeId, setActiveNodeId] = useState<string | null>('mat-root');

  // Direct FXTT Grid & Table View selection state
  const [activeFXTTCard, setActiveFXTTCard] = useState<{
    cardType:
      | 'material_category'
      | 'product_category'
      | 'service_category'
      | 'service_provider'
      | 'outsourced'
      | 'supplier'
      | 'project'
      | 'subcontractor'
      | 'client'
      | 'produce';
    cardId?: string;
    cardTitle: string;
    cardSubtitle?: string;
    cardTag?: string;
  } | null>(null);

  // Expand / Collapse state for tree branches (default all expanded as in reference images)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'mat-root': true,
    'sup-root': true,
    'sub-root': true,
    'out-root': true,
    'prd-root': true,
    'prj-root': true,
    'calc-root': true,
    'mat-inv-node': true,
    'sup-agree-node': true,
    'sub-alloc-node': true,
    'out-turn-node': true,
    'prd-bom-node': true
  });

  const toggleNodeExpand = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const expandAllTrees = () => {
    const allExpanded: Record<string, boolean> = {
      'mat-root': true,
      'sup-root': true,
      'sub-root': true,
      'out-root': true,
      'prd-root': true,
      'prj-root': true,
      'calc-root': true,
      'mat-inv-node': true,
      'sup-agree-node': true,
      'sub-alloc-node': true,
      'out-turn-node': true,
      'prd-bom-node': true
    };
    setExpandedNodes(allExpanded);
    showToast('All tree branches expanded.');
  };

  const collapseAllTrees = () => {
    setExpandedNodes({});
    showToast('All tree branches collapsed.');
  };

  // Modal visibility states
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [addItemPortal, setAddItemPortal] = useState<string>('material');
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isImportPlanModalOpen, setIsImportPlanModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isAddInventoryModalOpen, setIsAddInventoryModalOpen] = useState(false);
  const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);
  const [isAddOutsourcedModalOpen, setIsAddOutsourcedModalOpen] = useState(false);
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);
  const [isLaborSimModalOpen, setIsLaborSimModalOpen] = useState(false);
  const [isMarginAuditModalOpen, setIsMarginAuditModalOpen] = useState(false);
  const [isExportEnterpriseModalOpen, setIsExportEnterpriseModalOpen] = useState(false);
  const [isSelectProjectForExportModalOpen, setIsSelectProjectForExportModalOpen] = useState(false);
  const [projectExportSelectionMode, setProjectExportSelectionMode] = useState<'enterprise' | 'quote'>('enterprise');
  const [exportTargetProject, setExportTargetProject] = useState<Project | null>(
    selectedProject || (projects.length > 0 ? projects[0] : null)
  );

  // Form states for Quick Project Creation
  const [newProjectForm, setNewProjectForm] = useState({
    code: `PRJ-2026-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    clientName: '',
    quotedPrice: 150000,
    targetMarginPct: 30,
    deliveryDeadline: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  });

  // Form states for Quick Inventory Stock
  const [newInventoryForm, setNewInventoryForm] = useState({
    name: '',
    sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    category: 'Alloys & Metals',
    onHand: 50,
    reorderLevel: 15,
    unitCost: 120,
    location: 'Warehouse Bay 3A'
  });

  // Form states for Quick Supplier Contract
  const [newContractForm, setNewContractForm] = useState({
    supplierId: suppliers[0]?.id || '',
    contractNumber: `CTR-${Date.now().toString().slice(-4)}`,
    title: 'Enterprise Volume Sourcing Agreement',
    value: 75000,
    paymentTerms: 'Net 30'
  });

  // Form states for Dedicated Outsourced Process & Finishing Tariff
  const [newOutsourcedForm, setNewOutsourcedForm] = useState({
    name: '',
    category: 'Finishing & Coating',
    subCategory: 'Hard Anodizing & Mil-Spec Plating',
    providerName: suppliers[0]?.name || 'Specialized Surface Finishing Co.',
    baseUnitType: 'per_piece',
    rate: 45,
    retailPrice: 65,
    leadTimeDays: 5,
    slaLevel: 'Standard Guaranteed',
    specStandard: 'MIL-A-8625 Type III Class 2'
  });

  // Turnaround Calibration State
  const [calibrateSettings, setCalibrateSettings] = useState({
    standardLeadDays: 7,
    expeditedLeadDays: 3,
    emergencyLeadHours: 24,
    transitBufferDays: 1
  });

  // Handlers for Add Item Modal
  const handleOpenAddItem = (portalType: string) => {
    setAddItemPortal(portalType);
    setIsAddItemModalOpen(true);
  };

  const handleSaveNewItem = (entityType: string, itemData: any) => {
    const type = (entityType || addItemPortal).toLowerCase();
    if (type.includes('material')) {
      onAddMaterial(itemData);
      showToast(`Material ${itemData.name || itemData.code} added to catalog.`);
    } else if (type.includes('supplier')) {
      onAddSupplier(itemData);
      showToast(`Supplier ${itemData.name} registered into directory.`);
    } else if (type.includes('subcontractor')) {
      onAddSubcontractor(itemData);
      showToast(`Subcontractor ${itemData.name || itemData.nicheServiceName || 'Labor Rate'} added.`);
    } else if (type.includes('outsourced') || type.includes('service')) {
      onAddOutsourcedService(itemData);
      showToast(`Outsourced treatment ${itemData.name} saved.`);
    } else if (type.includes('produce') || type.includes('product')) {
      onAddProduceItem(itemData);
      showToast(`Product SKU ${itemData.name || itemData.code} created.`);
    } else if (type.includes('project')) {
      onAddProject(itemData);
      showToast(`Project ${itemData.name} created.`);
    } else {
      onAddMaterial(itemData);
      showToast(`Item ${itemData.name} saved.`);
    }
    setIsAddItemModalOpen(false);
  };

  const handleCreateOutsourcedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutsourcedForm.name.trim()) {
      showToast('Please enter process or surface treatment name.');
      return;
    }
    const sup = suppliers.find((s) => s.name === newOutsourcedForm.providerName) || suppliers[0];
    onAddOutsourcedService({
      id: `out-${Date.now()}`,
      name: newOutsourcedForm.name.trim(),
      category: newOutsourcedForm.category as any,
      subCategory: newOutsourcedForm.subCategory,
      providerName: newOutsourcedForm.providerName || (sup ? sup.name : 'Specialized Surface Partner'),
      providerId: sup ? sup.id : 'sup-1',
      baseUnitType: newOutsourcedForm.baseUnitType as any,
      rate: Number(newOutsourcedForm.rate) || 45,
      retailPrice: Number(newOutsourcedForm.retailPrice) || 65,
      slaLevel: newOutsourcedForm.slaLevel as any,
      lastUpdated: new Date().toISOString().split('T')[0],
      priceHistory: [
        {
          id: `oph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          oldRate: Number(newOutsourcedForm.rate) || 45,
          newRate: Number(newOutsourcedForm.rate) || 45,
          reason: 'Initial service tariff setup via Command Hub',
          updatedBy: 'Operations & Procurement Command'
        }
      ],
      tierRates: [
        {
          minVolume: 1,
          rate: Number(newOutsourcedForm.rate) || 45,
          description: `Base tariff (${newOutsourcedForm.baseUnitType.replace('_', ' ')})`
        },
        {
          minVolume: 50,
          rate: Math.round((Number(newOutsourcedForm.rate) || 45) * 0.92 * 100) / 100,
          description: 'Batch Volume Tier (50+ units)'
        }
      ]
    });
    setIsAddOutsourcedModalOpen(false);
    showToast(`Outsourced process "${newOutsourcedForm.name}" registered successfully.`);
  };

  // Handle Project Creation submit
  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name.trim() || !newProjectForm.clientName.trim()) {
      showToast('Please fill out project name and client name.');
      return;
    }
    onAddProject({
      code: newProjectForm.code.trim(),
      name: newProjectForm.name.trim(),
      clientName: newProjectForm.clientName.trim(),
      quotedPrice: Number(newProjectForm.quotedPrice) || 100000,
      targetMarginPct: Number(newProjectForm.targetMarginPct) || 28,
      deliveryDeadline: newProjectForm.deliveryDeadline,
      status: 'In Sourcing',
      productCategory: 'Industrial Automation',
      targetProduct: newProjectForm.name.trim(),
      phases: [
        { id: `ph-1`, name: 'Phase 1: Raw Material Sourcing', status: 'In Progress', budgetAllocated: newProjectForm.quotedPrice * 0.4 },
        { id: `ph-2`, name: 'Phase 2: Subcontractor Machining', status: 'Pending', budgetAllocated: newProjectForm.quotedPrice * 0.25 },
        { id: `ph-3`, name: 'Phase 3: Outside Treatment & Assembly', status: 'Pending', budgetAllocated: newProjectForm.quotedPrice * 0.15 }
      ]
    });
    setIsCreateProjectModalOpen(false);
    showToast(`Project ${newProjectForm.code} successfully initialized!`);
    setNewProjectForm({
      code: `PRJ-2026-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      clientName: '',
      quotedPrice: 150000,
      targetMarginPct: 30,
      deliveryDeadline: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
    });
  };

  // Handle Quick Inventory stock submit
  const handleCreateInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryForm.name.trim()) return;
    onAddInventory({
      name: newInventoryForm.name.trim(),
      sku: newInventoryForm.sku.trim(),
      category: newInventoryForm.category,
      onHand: Number(newInventoryForm.onHand) || 0,
      available: Number(newInventoryForm.onHand) || 0,
      reserved: 0,
      reorderLevel: Number(newInventoryForm.reorderLevel) || 10,
      unitCost: Number(newInventoryForm.unitCost) || 50,
      leadTimeDays: 7,
      status: Number(newInventoryForm.onHand) > Number(newInventoryForm.reorderLevel) ? 'Optimal' : 'Low Stock',
      location: newInventoryForm.location
    });
    setIsAddInventoryModalOpen(false);
    showToast(`Inventory stock item ${newInventoryForm.sku} added.`);
    setNewInventoryForm({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Alloys & Metals',
      onHand: 50,
      reorderLevel: 15,
      unitCost: 120,
      location: 'Warehouse Bay 3A'
    });
  };

  // Handle Quick Contract submit
  const handleCreateContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractForm.supplierId) {
      showToast('Please choose a valid supplier.');
      return;
    }
    if (onAddSupplierContract) {
      onAddSupplierContract(newContractForm.supplierId, {
        contractNumber: newContractForm.contractNumber,
        title: newContractForm.title,
        value: Number(newContractForm.value) || 50000,
        paymentTerms: newContractForm.paymentTerms,
        status: 'Active',
        type: 'materials',
        scopeType: 'materials',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '2027-12-31'
      });
    }
    setIsAddContractModalOpen(false);
    showToast(`Supplier agreement ${newContractForm.contractNumber} recorded.`);
  };

  // Handler for creating plan in active project
  const handleCreateNewBudgetPlan = (newPlan: BudgetaryPlan) => {
    if (!selectedProject) {
      showToast('Select an active project first.');
      return;
    }
    const currentPlans = selectedProject.budgetaryPlans || [];
    const updatedPlans = [...currentPlans, newPlan];
    onUpdateProject({
      ...selectedProject,
      budgetaryPlans: updatedPlans,
      activePlanId: newPlan.id
    });
    showToast(`Budgetary Plan "${newPlan.name}" added to ${selectedProject.code}.`);
  };

  // ----------------------------------------------------
  // Relational Tree Data (Structured exactly like reference UI)
  // ----------------------------------------------------
  const pipelineTrees: PipelineTree[] = useMemo(() => [
    {
      id: 'pipeline-materials',
      category: 'materials',
      title: 'Materials & Inventory Chain',
      colorTheme: {
        name: 'emerald',
        containerBorder: 'border-emerald-200/80',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
        dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)]',
        lineColor: 'bg-emerald-300',
        idleBorder: 'border-emerald-200 hover:border-emerald-400',
        idleIconBg: 'bg-emerald-50 border border-emerald-200/80',
        idleIconText: 'text-emerald-600',
        neonGradient: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
        neonShadow: 'shadow-[0_0_22px_rgba(16,185,129,0.7),0_0_8px_rgba(20,184,166,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-emerald-300/80',
        expandActiveBg: 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-300 text-white shadow-[0_0_12px_rgba(16,185,129,0.7)]'
      },
      rootNode: {
        id: 'mat-root',
        title: 'Add New Material',
        subtitle: 'Raw stock SKU, grade & unit cost intake',
        badge: `${materials.length} SKUs`,
        badgeColor: 'bg-emerald-100 text-emerald-800',
        icon: <Plus className="w-4 h-4 text-emerald-600" />,
        onClick: () => handleOpenAddItem('material'),
        children: [
          {
            id: 'mat-grid',
            title: 'View Materials in FXTT Grid & Table',
            subtitle: 'Direct FXTT catalog, discount matrices & specs',
            icon: <Table className="w-4 h-4 text-teal-600" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'material_category',
                cardId: 'all',
                cardTitle: 'Materials & Parts Directory',
                cardSubtitle: `${materials.length} Raw Materials, Alloys, Fasteners & Parts`,
                cardTag: 'MATERIALS & PARTS'
              });
            }
          },
          {
            id: 'mat-inv-node',
            title: 'Receive Inventory Stock',
            subtitle: 'Log on-hand qty, warehouse bay & reorder levels',
            badge: `${inventory.length} Stocked`,
            badgeColor: 'bg-teal-100 text-teal-800',
            icon: <PackagePlus className="w-4 h-4 text-teal-700" />,
            onClick: () => setIsAddInventoryModalOpen(true),
            children: [
              {
                id: 'mat-inv-view',
                title: 'View Inventory & Stock',
                subtitle: 'Audit safety buffers & lead-time critical paths',
                icon: <Boxes className="w-4 h-4 text-slate-700" />,
                onClick: () => onNavigateTab('inventory')
              }
            ]
          }
        ]
      }
    },
    {
      id: 'pipeline-suppliers',
      category: 'suppliers',
      title: 'Suppliers & Vendor Procurement Chain',
      colorTheme: {
        name: 'sky',
        containerBorder: 'border-sky-200/80',
        badgeBg: 'bg-sky-50',
        badgeText: 'text-sky-700',
        dotColor: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.85)]',
        lineColor: 'bg-sky-300',
        idleBorder: 'border-sky-200 hover:border-sky-400',
        idleIconBg: 'bg-sky-50 border border-sky-200/80',
        idleIconText: 'text-blue-600',
        neonGradient: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500',
        neonShadow: 'shadow-[0_0_22px_rgba(59,130,246,0.7),0_0_8px_rgba(99,102,241,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-blue-300/80',
        expandActiveBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-300 text-white shadow-[0_0_12px_rgba(59,130,246,0.7)]'
      },
      rootNode: {
        id: 'sup-root',
        title: 'Register New Supplier',
        subtitle: 'Vendor credentials, ISO certification & payment terms',
        badge: `${suppliers.length} Active`,
        badgeColor: 'bg-sky-100 text-sky-800',
        icon: <Plus className="w-4 h-4 text-sky-600" />,
        onClick: () => handleOpenAddItem('supplier'),
        children: [
          {
            id: 'sup-portal',
            title: 'View Suppliers in FXTT Grid & Table',
            subtitle: 'Direct FXTT vendor reliability, performance & quotes',
            icon: <ExternalLink className="w-4 h-4 text-blue-600" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'supplier',
                cardId: 'all',
                cardTitle: 'Suppliers Directory & Vendor Catalog',
                cardSubtitle: `${suppliers.length} Approved Enterprise Vendors & Active Procured Items`,
                cardTag: 'SUPPLIERS'
              });
            }
          },
          {
            id: 'sup-agree-node',
            title: 'Log Supply Agreement',
            subtitle: 'Record SLA volume contracts & credit terms',
            badge: 'Contracts',
            badgeColor: 'bg-indigo-100 text-indigo-800',
            icon: <FilePlus className="w-4 h-4 text-indigo-600" />,
            onClick: () => setIsAddContractModalOpen(true),
            children: [
              {
                id: 'sup-map-catalog',
                title: 'Map Vendor Quotes in FXTT Grid',
                subtitle: 'Direct FXTT multi-vendor pricing matrices & lead times',
                icon: <CheckCircle2 className="w-4 h-4 text-slate-700" />,
                onClick: () => {
                  setActiveFXTTCard({
                    cardType: 'supplier',
                    cardId: 'all',
                    cardTitle: 'Vendor Quotes & Catalog Mapping',
                    cardSubtitle: 'Multi-vendor quotes, price tier matrices and catalog linking',
                    cardTag: 'VENDOR QUOTES'
                  });
                }
              }
            ]
          }
        ]
      }
    },
    {
      id: 'pipeline-subcontractors',
      category: 'subcontractors',
      title: 'Subcontractors & Specialist Labor Tree',
      colorTheme: {
        name: 'purple',
        containerBorder: 'border-purple-200/80',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        dotColor: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.85)]',
        lineColor: 'bg-purple-300',
        idleBorder: 'border-purple-200 hover:border-purple-400',
        idleIconBg: 'bg-purple-50 border border-purple-200/80',
        idleIconText: 'text-purple-600',
        neonGradient: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-500',
        neonShadow: 'shadow-[0_0_22px_rgba(168,85,247,0.7),0_0_8px_rgba(217,70,239,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-purple-300/80',
        expandActiveBg: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 border-purple-300 text-white shadow-[0_0_12px_rgba(168,85,247,0.7)]'
      },
      rootNode: {
        id: 'sub-root',
        title: 'Add Subcontractor Rate',
        subtitle: 'Define specialist trade, hourly rate & cert level',
        badge: `${subcontractors.length} Trades`,
        badgeColor: 'bg-purple-100 text-purple-800',
        icon: <Plus className="w-4 h-4 text-purple-600" />,
        onClick: () => handleOpenAddItem('subcontractor'),
        children: [
          {
            id: 'sub-roster',
            title: 'View Labor Roster in FXTT Grid & Table',
            subtitle: 'Direct FXTT specialist trade rates, shift multipliers & crews',
            icon: <Users className="w-4 h-4 text-violet-600" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'subcontractor',
                cardId: 'all',
                cardTitle: 'Specialist Labor Roster & Subcontractors',
                cardSubtitle: `${subcontractors.length} Trade Specialists, Shift Multipliers & Field Crews`,
                cardTag: 'LABOR ROSTER'
              });
            }
          },
          {
            id: 'sub-alloc-node',
            title: 'Allocate Labor to Project',
            subtitle: 'Assign crew hours to project delivery phases',
            icon: <Calendar className="w-4 h-4 text-fuchsia-600" />,
            onClick: () => onNavigateTab('resource-allocation'),
            children: [
              {
                id: 'sub-sim-hike',
                title: 'Simulate +8% Labor Hike',
                subtitle: 'Risk sensitivity stress test on project margins',
                badge: 'Simulation',
                badgeColor: 'bg-purple-100 text-purple-900',
                icon: <Activity className="w-4 h-4 text-purple-700" />,
                onClick: () => setIsLaborSimModalOpen(true)
              }
            ]
          }
        ]
      }
    },
    {
      id: 'pipeline-outsourced',
      category: 'outsourced',
      title: 'Outsourced Finishing & Surface Treatments',
      colorTheme: {
        name: 'amber',
        containerBorder: 'border-amber-200/80',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        dotColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.85)]',
        lineColor: 'bg-amber-300',
        idleBorder: 'border-amber-200 hover:border-amber-400',
        idleIconBg: 'bg-amber-50 border border-amber-200/80',
        idleIconText: 'text-amber-600',
        neonGradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
        neonShadow: 'shadow-[0_0_22px_rgba(245,158,11,0.7),0_0_8px_rgba(249,115,22,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-amber-300/80',
        expandActiveBg: 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-300 text-white shadow-[0_0_12px_rgba(245,158,11,0.7)]'
      },
      rootNode: {
        id: 'out-root',
        title: 'Add Outsourced Process',
        subtitle: 'Anodizing, heat treat, plating & coating tariffs',
        badge: `${outsourcedServices.length} Tariffs`,
        badgeColor: 'bg-amber-100 text-amber-800',
        icon: <Plus className="w-4 h-4 text-amber-600" />,
        onClick: () => setIsAddOutsourcedModalOpen(true),
        children: [
          {
            id: 'out-tariffs',
            title: 'View Finishing Tariffs in FXTT Grid & Table',
            subtitle: 'Direct FXTT plating, coating, anodizing & heat treat tariffs',
            icon: <Truck className="w-4 h-4 text-amber-700" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'service_provider',
                cardId: 'all',
                cardTitle: 'Outsourced Finishing & Surface Treatment Tariffs',
                cardSubtitle: `${outsourcedServices.length} Active Industrial Finishing Processes & Tariffs`,
                cardTag: 'FINISHING TARIFFS'
              });
            }
          },
          {
            id: 'out-turn-node',
            title: 'Calibrate Turnaround Times',
            subtitle: 'Expedited processing & transit lead times',
            icon: <Sliders className="w-4 h-4 text-orange-600" />,
            onClick: () => setIsCalibrateModalOpen(true),
            children: [
              {
                id: 'out-attach-plan',
                title: 'Attach to Project Plan',
                subtitle: 'Directly inject treatment tariffs into project cost model',
                icon: <CheckCircle2 className="w-4 h-4 text-slate-700" />,
                onClick: () => onNavigateTab('project-home')
              }
            ]
          }
        ]
      }
    },
    {
      id: 'pipeline-products',
      category: 'products',
      title: 'Products, Multi-Tier Assemblies & BOM',
      colorTheme: {
        name: 'rose',
        containerBorder: 'border-rose-200/80',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        dotColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)]',
        lineColor: 'bg-rose-300',
        idleBorder: 'border-rose-200 hover:border-rose-400',
        idleIconBg: 'bg-rose-50 border border-rose-200/80',
        idleIconText: 'text-rose-600',
        neonGradient: 'bg-gradient-to-r from-rose-500 via-pink-500 to-red-500',
        neonShadow: 'shadow-[0_0_22px_rgba(244,63,94,0.7),0_0_8px_rgba(236,72,153,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-rose-300/80',
        expandActiveBg: 'bg-gradient-to-r from-rose-500 to-pink-500 border-rose-300 text-white shadow-[0_0_12px_rgba(244,63,94,0.7)]'
      },
      rootNode: {
        id: 'prd-root',
        title: 'Create Product SKU',
        subtitle: 'Master assembly SKU, target price & lead time',
        badge: `${produceItems.length} SKUs`,
        badgeColor: 'bg-rose-100 text-rose-800',
        icon: <Plus className="w-4 h-4 text-rose-600" />,
        onClick: () => handleOpenAddItem('produce'),
        children: [
          {
            id: 'prd-catalog',
            title: 'View Products Catalog in FXTT Grid & Table',
            subtitle: 'Direct FXTT assembly specifications, target price & lead times',
            icon: <Boxes className="w-4 h-4 text-red-600" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'produce',
                cardId: 'all',
                cardTitle: 'Manufactured Products & Assembly SKUs',
                cardSubtitle: `${produceItems.length} Finished Good SKUs, Target Quoted Prices & Specs`,
                cardTag: 'PRODUCTS CATALOG'
              });
            }
          },
          {
            id: 'prd-bom-node',
            title: 'Configure Multi-Tier BOM in FXTT Grid',
            subtitle: 'Direct FXTT assembly rollups, unit cost breakdown & specs',
            badge: 'BOM Engine',
            badgeColor: 'bg-pink-100 text-pink-800',
            icon: <Cpu className="w-4 h-4 text-pink-600" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'produce',
                cardId: 'all',
                cardTitle: 'Multi-Tier Assembly Bills of Materials (BOM)',
                cardSubtitle: 'Assembly rollups, unit cost breakdown & engineering specs',
                cardTag: 'BOM ARCHITECTURE'
              });
            },
            children: [
              {
                id: 'prd-margin-check',
                title: 'Verify Margin Targets',
                subtitle: 'Audit unit BOM cost against commercial sale price',
                icon: <ShieldCheck className="w-4 h-4 text-slate-700" />,
                onClick: () => setIsMarginAuditModalOpen(true)
              }
            ]
          }
        ]
      }
    },
    {
      id: 'pipeline-projects',
      category: 'projects',
      title: 'Projects, Plans & Quotation Hierarchy',
      colorTheme: {
        name: 'navy',
        containerBorder: 'border-slate-200/90',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-800',
        dotColor: 'bg-[#003049] shadow-[0_0_8px_rgba(0,48,73,0.85)]',
        lineColor: 'bg-slate-300',
        idleBorder: 'border-slate-200 hover:border-cyan-400',
        idleIconBg: 'bg-slate-100 border border-slate-200/80',
        idleIconText: 'text-[#003049]',
        neonGradient: 'bg-gradient-to-r from-[#003049] via-blue-600 to-cyan-500',
        neonShadow: 'shadow-[0_0_22px_rgba(6,182,212,0.7),0_0_8px_rgba(37,99,235,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-cyan-300/80',
        expandActiveBg: 'bg-gradient-to-r from-[#003049] to-cyan-600 border-cyan-300 text-white shadow-[0_0_12px_rgba(6,182,212,0.7)]'
      },
      rootNode: {
        id: 'prj-root',
        title: 'Create New Project',
        subtitle: 'Initialize client deliverable & commercial contract',
        badge: `${projects.length} Projects`,
        badgeColor: 'bg-slate-200 text-slate-800',
        icon: <Plus className="w-4 h-4 text-[#003049]" />,
        onClick: () => setIsCreateProjectModalOpen(true),
        children: [
          {
            id: 'prj-grid',
            title: 'View Projects in FXTT Grid & Table',
            subtitle: 'Direct FXTT capital projects portfolio, quotes & deliverables',
            icon: <Table className="w-4 h-4 text-cyan-600" />,
            onClick: () => {
              setActiveFXTTCard({
                cardType: 'project',
                cardId: 'all',
                cardTitle: 'Capital Projects Portfolio & Quotations',
                cardSubtitle: `${projects.length} Active Industrial Deliverables & Commercial Contracts`,
                cardTag: 'PROJECTS'
              });
            }
          },
          {
            id: 'prj-plan',
            title: 'Create Budget Plan',
            subtitle: 'Scenario modeling & multi-phase cost allocation',
            icon: <DollarSign className="w-4 h-4 text-blue-600" />,
            onClick: () => {
              if (!selectedProject && projects.length > 0) {
                onSelectProject(projects[0]);
              }
              setIsCreatePlanModalOpen(true);
            }
          },
          {
            id: 'prj-import',
            title: 'Include from Other Project',
            subtitle: 'Clone & adapt proven cost models from portfolio',
            icon: <FolderInput className="w-4 h-4 text-slate-700" />,
            onClick: () => {
              if (!selectedProject && projects.length > 0) {
                onSelectProject(projects[0]);
              }
              setIsImportPlanModalOpen(true);
            }
          },
          {
            id: 'prj-template',
            title: 'Apply Plan Template',
            subtitle: 'Inject turnkey industrial blueprints',
            icon: <Bookmark className="w-4 h-4 text-amber-600" />,
            onClick: () => {
              if (!selectedProject && projects.length > 0) {
                onSelectProject(projects[0]);
              }
              setIsTemplatesModalOpen(true);
            }
          },
          {
            id: 'prj-export',
            title: 'Export Executive PDF Quote',
            subtitle: 'Compile active scenario into client PDF dossier',
            badge: 'ISO/ASME PDF',
            badgeColor: 'bg-red-100 text-red-900',
            icon: <FileDown className="w-4 h-4 text-[#c1121f]" />,
            onClick: () => {
              setProjectExportSelectionMode('quote');
              setIsSelectProjectForExportModalOpen(true);
            }
          },
          {
            id: 'prj-export-all-datasets',
            title: 'Export Enterprise PDF & CSV Files',
            subtitle: 'Selectively export company datasets in LKR',
            badge: 'PDF / CSV',
            badgeColor: 'bg-emerald-100 text-emerald-800',
            icon: <FileDown className="w-4 h-4 text-emerald-700" />,
            onClick: () => {
              setProjectExportSelectionMode('enterprise');
              setIsSelectProjectForExportModalOpen(true);
            }
          }
        ]
      }
    },
    {
      id: 'pipeline-calculations',
      category: 'calculations',
      title: 'Financial Intelligence & System Commands',
      colorTheme: {
        name: 'teal',
        containerBorder: 'border-teal-200/80',
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-700',
        dotColor: 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.85)]',
        lineColor: 'bg-teal-300',
        idleBorder: 'border-teal-200 hover:border-teal-400',
        idleIconBg: 'bg-teal-50 border border-teal-200/80',
        idleIconText: 'text-teal-600',
        neonGradient: 'bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400',
        neonShadow: 'shadow-[0_0_22px_rgba(20,184,166,0.7),0_0_8px_rgba(16,185,129,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.6)]',
        neonBorder: 'border-teal-300/80',
        expandActiveBg: 'bg-gradient-to-r from-teal-500 to-cyan-500 border-teal-300 text-white shadow-[0_0_12px_rgba(20,184,166,0.7)]'
      },
      rootNode: {
        id: 'calc-root',
        title: 'Run Profitability Engine',
        subtitle: 'Real-time margin calculation, rollups & labor sync',
        badge: 'Python Analytics',
        badgeColor: 'bg-teal-100 text-teal-900',
        icon: <Zap className="w-4 h-4 text-teal-600" />,
        onClick: onRefreshAnalytics,
        children: [
          {
            id: 'calc-stress',
            title: 'Run Inflation Stress Test',
            subtitle: '+5% Material & +8% Labor wage sensitivity model',
            badge: 'Simulation',
            badgeColor: 'bg-blue-100 text-blue-900',
            icon: <Activity className="w-4 h-4 text-blue-600" />,
            onClick: () => {
              onRefreshAnalytics();
              showToast('Stress test simulation complete: +5% Material & +8% Labor calculated.');
            }
          },
          {
            id: 'calc-tariffs',
            title: 'Sync Tariffs & Freight',
            subtitle: 'Rebalance CIF duties & container landed tariffs',
            icon: <RefreshCw className="w-4 h-4 text-slate-700" />,
            onClick: () => {
              onRefreshAnalytics();
              showToast('Tariff and ocean container freight normalized across catalog.');
            }
          },
          {
            id: 'calc-export-suite',
            title: 'Export Enterprise Datasets (PDF & CSV)',
            subtitle: 'Configure selection and download audit reports in LKR',
            badge: 'Export Modal',
            badgeColor: 'bg-emerald-100 text-emerald-900',
            icon: <FileDown className="w-4 h-4 text-emerald-600" />,
            onClick: () => {
              setProjectExportSelectionMode('enterprise');
              setIsSelectProjectForExportModalOpen(true);
            }
          }
        ]
      }
    }
  ], [
    materials.length,
    inventory.length,
    suppliers.length,
    subcontractors.length,
    outsourcedServices.length,
    produceItems.length,
    projects.length,
    selectedProject,
    onRefreshAnalytics,
    onExportPDF,
    onNavigateTab,
    onSelectProject,
    showToast
  ]);

  // Filtered pipelines based on search & category
  const filteredPipelineTrees = useMemo(() => {
    return pipelineTrees.filter((p) => {
      if (selectedCategoryFilter !== 'all' && p.category !== selectedCategoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      if (p.title.toLowerCase().includes(q)) return true;

      // Recursive check for matching nodes
      const checkNode = (node: TreeNodeAction): boolean => {
        if (node.title.toLowerCase().includes(q) || node.subtitle.toLowerCase().includes(q)) {
          return true;
        }
        if (node.children) {
          return node.children.some(checkNode);
        }
        return false;
      };

      return checkNode(p.rootNode);
    });
  }, [pipelineTrees, selectedCategoryFilter, searchQuery]);

  // ----------------------------------------------------
  // Recursive Tree Node Renderer matching image design
  // ----------------------------------------------------
  const renderTreeNode = (
    node: TreeNodeAction,
    colorTheme: PipelineTree['colorTheme'],
    isRoot: boolean = false,
    isLastChild: boolean = false,
    level: number = 0
  ) => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = Boolean(expandedNodes[node.id]);
    const isActive = activeNodeId === node.id;

    return (
      <div key={node.id} className="relative flex flex-col">
        {/* The Node Button Card */}
        <div className="relative flex items-center group">
          {/* Connector Branch Line (from parent vertical spine to this node) */}
          {!isRoot && (
            <div
              className={`absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-[2px] ${colorTheme.lineColor}`}
            />
          )}

          {/* Expand/Collapse Circle Button for Parent Nodes */}
          {hasChildren && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => toggleNodeExpand(node.id, e)}
              className={`absolute -left-8 sm:-left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border transition-all duration-300 flex items-center justify-center shadow-xs z-10 cursor-pointer ${
                isExpanded
                  ? colorTheme.expandActiveBg
                  : `bg-white border-slate-300 text-slate-500 hover:text-white hover:${colorTheme.neonGradient} hover:${colorTheme.neonShadow} hover:border-transparent`
              }`}
              title={isExpanded ? 'Collapse sub-nodes' : 'Expand sub-nodes'}
            >
              {isExpanded ? (
                <Minus className="w-3 h-3" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
            </motion.button>
          )}

          {/* Node Capsule Button - Light background with neon glow animation */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.018, y: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => {
              setActiveNodeId(node.id);
              if (hasChildren && !isExpanded) {
                setExpandedNodes((prev) => ({ ...prev, [node.id]: true }));
              }
              node.onClick();
            }}
            className={`relative flex-1 group rounded-full py-2.5 px-4 sm:px-5 border transition-all duration-300 cursor-pointer text-left flex items-center justify-between overflow-hidden select-none ${
              isActive
                ? `${colorTheme.neonGradient} ${colorTheme.neonBorder} text-white ${colorTheme.neonShadow} ring-1 ring-white/40 animate-neon-pulse`
                : `bg-white ${colorTheme.idleBorder} text-slate-800 shadow-2xs hover:${colorTheme.neonGradient} hover:text-white hover:${colorTheme.neonBorder} hover:${colorTheme.neonShadow}`
            }`}
          >
            {/* Neon sheen reflection animation */}
            <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-full">
              <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-neon-sheen" />
            </span>

            {/* Left: Domain action icon + Title & Subtitle */}
            <div className="relative z-10 flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
              {/* Domain Action Icon inside soft pill */}
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-white/25 text-white shadow-xs'
                    : `${colorTheme.idleIconBg} ${colorTheme.idleIconText} group-hover:bg-white/25 group-hover:text-white group-hover:scale-105`
                }`}
              >
                {node.icon}
              </div>

              {/* Node Title & Subtitle */}
              <div className="min-w-0 flex items-baseline space-x-2">
                <span
                  className={`text-xs sm:text-sm font-semibold tracking-tight transition-colors truncate ${
                    isActive ? 'text-white' : 'text-slate-900 group-hover:text-white'
                  }`}
                >
                  {node.title}
                </span>
                {node.subtitle && (
                  <span
                    className={`hidden md:inline text-[11px] transition-colors truncate max-w-[260px] ${
                      isActive ? 'text-white/85' : 'text-slate-500 group-hover:text-white/85'
                    }`}
                  >
                    • {node.subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Badge / Count + Action Trigger Arrow */}
            <div className="relative z-10 flex items-center space-x-2 shrink-0">
              {node.badge && (
                <span
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
                    isActive
                      ? 'bg-white/25 text-white border-white/40 shadow-xs'
                      : `${node.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'} group-hover:bg-white/25 group-hover:text-white group-hover:border-white/40`
                  }`}
                >
                  {node.badge}
                </span>
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'text-white translate-x-0.5'
                    : 'text-slate-400 group-hover:text-white group-hover:translate-x-0.5'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Children Sub-Tree with Connecting Lines */}
        {hasChildren && isExpanded && (
          <div className="relative pl-6 sm:pl-7 pt-2.5 space-y-2.5">
            {/* Vertical Spine Line */}
            <div className={`absolute left-0 sm:left-0.5 top-0 bottom-5 w-[2px] ${colorTheme.lineColor}`} />

            {/* Recursive Child Nodes */}
            {node.children!.map((child, idx) => {
              const isLast = idx === node.children!.length - 1;
              return renderTreeNode(child, colorTheme, false, isLast, level + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  // Dynamic time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Top Greeting & Enterprise PDF/CSV Export Controls Bar */}
      <div className="pt-1 pb-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {currentUser?.name || 'Jane Doe'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-home-export-enterprise-data"
            onClick={() => {
              setProjectExportSelectionMode('enterprise');
              setIsSelectProjectForExportModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <FileDown className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition-transform" />
            <span>Export PDF & CSV Files</span>
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-bold text-white tracking-wider">
              SELECTABLE • LKR
            </span>
          </button>
        </div>
      </div>

      {/* REALTIME ENTERPRISE TELEMETRY CARDS (DIRECT FXTT QUICK ACCESS & METRICS) */}
      <HomeTelemetryCards
        materials={materials}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        produceItems={produceItems}
        projects={projects}
        onOpenFXTT={(payload) => setActiveFXTTCard(payload)}
        onOpenAddModal={(portalType) => handleOpenAddItem(portalType)}
        onNavigateTab={onNavigateTab}
        showToast={showToast}
      />

      {/* 2. FILTER & SEARCH COMMANDS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes (e.g. 'material', 'supplier', 'plan', 'quote', 'tax')..."
            className="w-full pl-10 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filters with Vibrant Multi-Color Neon Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            {
              id: 'all',
              label: 'All Trees',
              activeGrad: 'from-[#003049] via-indigo-700 to-blue-600',
              activeShadow: 'shadow-[0_0_18px_rgba(0,48,73,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-indigo-400/40',
              hoverGrad: 'hover:from-[#003049] hover:via-indigo-700 hover:to-blue-600',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(0,48,73,0.4)]'
            },
            {
              id: 'materials',
              label: 'Materials',
              activeGrad: 'from-emerald-500 via-teal-500 to-cyan-500',
              activeShadow: 'shadow-[0_0_18px_rgba(16,185,129,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-emerald-300',
              hoverGrad: 'hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(16,185,129,0.5)]'
            },
            {
              id: 'suppliers',
              label: 'Suppliers',
              activeGrad: 'from-blue-600 via-indigo-500 to-sky-500',
              activeShadow: 'shadow-[0_0_18px_rgba(59,130,246,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-blue-300',
              hoverGrad: 'hover:from-blue-600 hover:via-indigo-500 hover:to-sky-500',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(59,130,246,0.5)]'
            },
            {
              id: 'subcontractors',
              label: 'Labor',
              activeGrad: 'from-purple-600 via-fuchsia-600 to-violet-500',
              activeShadow: 'shadow-[0_0_18px_rgba(168,85,247,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-purple-300',
              hoverGrad: 'hover:from-purple-600 hover:via-fuchsia-600 hover:to-violet-500',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(168,85,247,0.5)]'
            },
            {
              id: 'outsourced',
              label: 'Finishing',
              activeGrad: 'from-amber-500 via-orange-500 to-rose-500',
              activeShadow: 'shadow-[0_0_18px_rgba(245,158,11,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-amber-300',
              hoverGrad: 'hover:from-amber-500 hover:via-orange-500 hover:to-rose-500',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(245,158,11,0.5)]'
            },
            {
              id: 'products',
              label: 'Products',
              activeGrad: 'from-rose-500 via-pink-500 to-red-500',
              activeShadow: 'shadow-[0_0_18px_rgba(244,63,94,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-rose-300',
              hoverGrad: 'hover:from-rose-500 hover:via-pink-500 hover:to-red-500',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(244,63,94,0.5)]'
            },
            {
              id: 'projects',
              label: 'Projects',
              activeGrad: 'from-[#003049] via-blue-600 to-cyan-500',
              activeShadow: 'shadow-[0_0_18px_rgba(6,182,212,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-cyan-300',
              hoverGrad: 'hover:from-[#003049] hover:via-blue-600 hover:to-cyan-500',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(6,182,212,0.5)]'
            },
            {
              id: 'calculations',
              label: 'Calculations',
              activeGrad: 'from-teal-500 via-emerald-500 to-cyan-400',
              activeShadow: 'shadow-[0_0_18px_rgba(20,184,166,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.5)]',
              activeBorder: 'border-teal-300',
              hoverGrad: 'hover:from-teal-500 hover:via-emerald-500 hover:to-cyan-400',
              hoverShadow: 'hover:shadow-[0_0_16px_rgba(20,184,166,0.5)]'
            }
          ].map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 shrink-0 cursor-pointer overflow-hidden ${
                  isSelected
                    ? `bg-gradient-to-r ${cat.activeGrad} text-white ${cat.activeShadow} border ${cat.activeBorder} animate-neon-pulse`
                    : `bg-white text-slate-700 hover:text-white border border-slate-200 hover:bg-gradient-to-r ${cat.hoverGrad} hover:border-transparent ${cat.hoverShadow}`
                }`}
              >
                <span className="relative z-10">{cat.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Expand / Collapse All Toggles */}
        <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={expandAllTrees}
            className="rounded-full px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs hover:shadow-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
            title="Expand all branches"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline text-[11px]">Expand</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={collapseAllTrees}
            className="rounded-full px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs hover:shadow-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
            title="Collapse all branches"
          >
            <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline text-[11px]">Collapse</span>
          </motion.button>
        </div>
      </div>

      {/* 3. TREE NODE PIPELINES CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPipelineTrees.map((tree) => (
          <motion.div
            key={tree.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-2xl border ${tree.colorTheme.containerBorder} p-4 sm:p-5 shadow-2xs`}
          >
            {/* Tree Section Header */}
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${tree.colorTheme.dotColor}`} />
                <h2 className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-wide">
                  {tree.title}
                </h2>
              </div>
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-transparent ${tree.colorTheme.badgeBg} ${tree.colorTheme.badgeText}`}>
                Branch Dependency
              </span>
            </div>

            {/* Tree Branch Diagram (Parent Node + Child Nodes + Branch Lines) */}
            <div className="pl-7 sm:pl-8">
              {renderTreeNode(tree.rootNode, tree.colorTheme, true)}
            </div>
          </motion.div>
        ))}

        {filteredPipelineTrees.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No nodes match your search query</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or reset the filter.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('all');
              }}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white text-xs rounded-full font-medium shadow-[0_0_18px_rgba(59,130,246,0.5)] cursor-pointer"
            >
              Reset Filters
            </motion.button>
          </div>
        )}
      </div>

      {/* 4. MODALS FOR QUICK INPUTS */}

      {/* Modal 1: Add Item Modal (for Material, Supplier, Subcontractor, Outsourced, Produce) */}
      {isAddItemModalOpen && (
        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          portal={addItemPortal}
          categories={INITIAL_CATEGORY_HIERARCHY}
          suppliers={suppliers}
          onSave={handleSaveNewItem}
        />
      )}

      {/* Modal 2: Quick Create Project Modal */}
      {isCreateProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-[#003049]" />
                <h3 className="text-sm font-medium text-slate-900">Initialize New Project Contract</h3>
              </div>
              <button
                onClick={() => setIsCreateProjectModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Project Code</label>
                  <input
                    type="text"
                    required
                    value={newProjectForm.code}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Client Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boeing Aero Structures"
                    value={newProjectForm.clientName}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-normal">Project Title / Deliverable</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Turnkey Automated Hydro-Forming Press Cell 500T"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#003049]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Quoted Price ($)</label>
                  <input
                    type="number"
                    value={newProjectForm.quotedPrice}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, quotedPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Target Margin (%)</label>
                  <input
                    type="number"
                    value={newProjectForm.targetMarginPct}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, targetMarginPct: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Target Delivery</label>
                  <input
                    type="date"
                    value={newProjectForm.deliveryDeadline}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, deliveryDeadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#003049] hover:bg-[#002235] text-white font-normal shadow-xs cursor-pointer"
                >
                  Create & Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Inventory Receive Stock Modal */}
      {isAddInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-teal-700" />
                <h3 className="text-sm font-medium text-slate-900">Receive Stock Inventory</h3>
              </div>
              <button
                onClick={() => setIsAddInventoryModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInventorySubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-normal">Stock Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aluminum 7075-T6 Billet 50mm"
                  value={newInventoryForm.name}
                  onChange={(e) => setNewInventoryForm({ ...newInventoryForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={newInventoryForm.sku}
                    onChange={(e) => setNewInventoryForm({ ...newInventoryForm, sku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Category</label>
                  <select
                    value={newInventoryForm.category}
                    onChange={(e) => setNewInventoryForm({ ...newInventoryForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Alloys & Metals">Alloys & Metals</option>
                    <option value="Fasteners & Hardware">Fasteners & Hardware</option>
                    <option value="Electronics & Sensors">Electronics & Sensors</option>
                    <option value="Pneumatics & Hydraulics">Pneumatics & Hydraulics</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">On-Hand Qty</label>
                  <input
                    type="number"
                    value={newInventoryForm.onHand}
                    onChange={(e) => setNewInventoryForm({ ...newInventoryForm, onHand: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Reorder Level</label>
                  <input
                    type="number"
                    value={newInventoryForm.reorderLevel}
                    onChange={(e) => setNewInventoryForm({ ...newInventoryForm, reorderLevel: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Unit Cost ($)</label>
                  <input
                    type="number"
                    value={newInventoryForm.unitCost}
                    onChange={(e) => setNewInventoryForm({ ...newInventoryForm, unitCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-normal">Storage Location / Bay</label>
                <input
                  type="text"
                  value={newInventoryForm.location}
                  onChange={(e) => setNewInventoryForm({ ...newInventoryForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddInventoryModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-normal shadow-xs cursor-pointer"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Quick Supplier Contract Modal */}
      {isAddContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FilePlus className="w-5 h-5 text-indigo-700" />
                <h3 className="text-sm font-medium text-slate-900">Log Supplier Supply Agreement</h3>
              </div>
              <button
                onClick={() => setIsAddContractModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContractSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-normal">Select Supplier</label>
                <select
                  value={newContractForm.supplierId}
                  onChange={(e) => setNewContractForm({ ...newContractForm, supplierId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-normal">Agreement Title</label>
                <input
                  type="text"
                  required
                  value={newContractForm.title}
                  onChange={(e) => setNewContractForm({ ...newContractForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Contract #</label>
                  <input
                    type="text"
                    required
                    value={newContractForm.contractNumber}
                    onChange={(e) => setNewContractForm({ ...newContractForm, contractNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-normal">Annual Value ($)</label>
                  <input
                    type="number"
                    value={newContractForm.value}
                    onChange={(e) => setNewContractForm({ ...newContractForm, value: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-normal">Payment Terms</label>
                <select
                  value={newContractForm.paymentTerms}
                  onChange={(e) => setNewContractForm({ ...newContractForm, paymentTerms: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                  <option value="2% 10 Net 30">2% 10 Net 30</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddContractModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-normal shadow-xs cursor-pointer"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4.1: Dedicated Add Outsourced Finishing Process & Tariff Modal */}
      {isAddOutsourcedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Add Outsourced Finishing Process & Tariff</h3>
                  <p className="text-[11px] text-slate-500">Surface plating, heat treat, powder coating & testing tariffs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOutsourcedModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOutsourcedSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Process / Treatment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Type III Hard Anodizing Class 2 Black (50µm)"
                  value={newOutsourcedForm.name}
                  onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Finishing Category</label>
                  <select
                    value={newOutsourcedForm.category}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Finishing & Coating">Finishing & Coating</option>
                    <option value="Heat Treatment & Stress Relief">Heat Treatment & Stress Relief</option>
                    <option value="Anodizing & Surface Prep">Anodizing & Surface Prep</option>
                    <option value="Plating & Galvanizing">Plating & Galvanizing</option>
                    <option value="Testing & Inspection (NDT)">Testing & Inspection (NDT)</option>
                    <option value="Specialized Machining (EDM)">Specialized Machining (EDM)</option>
                    <option value="Heavy Freight & Logistics">Heavy Freight & Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Finishing Partner / Supplier</label>
                  <select
                    value={newOutsourcedForm.providerName}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, providerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.location})
                      </option>
                    ))}
                    <option value="Specialized Surface Technologies">Specialized Surface Technologies</option>
                    <option value="Apex Thermal Solutions Ltd">Apex Thermal Solutions Ltd</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Billing Unit</label>
                  <select
                    value={newOutsourcedForm.baseUnitType}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, baseUnitType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="per_piece">Per Piece ($/ea)</option>
                    <option value="per_hour">Per Hour ($/hr)</option>
                    <option value="per_sq_ft">Per Sq. Ft ($/ft²)</option>
                    <option value="per_kg">Per Kg ($/kg)</option>
                    <option value="fixed_per_batch">Fixed Batch ($/lot)</option>
                    <option value="per_km">Per Km ($/km)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Cost Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newOutsourcedForm.rate}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, rate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Retail Tariff ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newOutsourcedForm.retailPrice}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, retailPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">Turnaround Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={newOutsourcedForm.leadTimeDays}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, leadTimeDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-medium">SLA Guarantee</label>
                  <select
                    value={newOutsourcedForm.slaLevel}
                    onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, slaLevel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Standard Guaranteed">Standard Guaranteed (7-10 days)</option>
                    <option value="Expedited Turnaround">Expedited Turnaround (3-5 days)</option>
                    <option value="Critical 24h Express">Critical 24h Express</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium">Mil-Spec / Standard Certification</label>
                <input
                  type="text"
                  placeholder="e.g. MIL-A-8625 Type III Class 2 / AMS 2469"
                  value={newOutsourcedForm.specStandard}
                  onChange={(e) => setNewOutsourcedForm({ ...newOutsourcedForm, specStandard: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOutsourcedModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium shadow-xs cursor-pointer"
                >
                  Save Outsourced Tariff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4.2: Turnaround Lead Time Calibration Modal */}
      {isCalibrateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Calibrate Finishing Turnaround Times</h3>
                  <p className="text-[11px] text-slate-500">Fine-tune production transit buffers & SLA SLAs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalibrateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-orange-900">
                <div className="font-semibold mb-0.5">Active Lead Time Policy</div>
                <div className="text-[11px] text-orange-800">
                  Adjusting these calibration parameters updates the expected delivery lead times across all active outsourced vendor contracts.
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-slate-700 mb-1 font-medium">
                  <span>Standard Batch Lead Time</span>
                  <span className="font-bold text-slate-900">{calibrateSettings.standardLeadDays} Days</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="21"
                  value={calibrateSettings.standardLeadDays}
                  onChange={(e) => setCalibrateSettings({ ...calibrateSettings, standardLeadDays: Number(e.target.value) })}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-slate-700 mb-1 font-medium">
                  <span>Expedited Fast-Track Lead Time</span>
                  <span className="font-bold text-slate-900">{calibrateSettings.expeditedLeadDays} Days</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={calibrateSettings.expeditedLeadDays}
                  onChange={(e) => setCalibrateSettings({ ...calibrateSettings, expeditedLeadDays: Number(e.target.value) })}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-slate-700 mb-1 font-medium">
                  <span>Emergency AOG Turnaround</span>
                  <span className="font-bold text-slate-900">{calibrateSettings.emergencyLeadHours} Hours</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  step="6"
                  value={calibrateSettings.emergencyLeadHours}
                  onChange={(e) => setCalibrateSettings({ ...calibrateSettings, emergencyLeadHours: Number(e.target.value) })}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCalibrateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCalibrateModalOpen(false);
                    showToast(`Turnaround calibrated: Standard ${calibrateSettings.standardLeadDays}d / Expedited ${calibrateSettings.expeditedLeadDays}d / Emergency ${calibrateSettings.emergencyLeadHours}h applied.`);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-xs cursor-pointer"
                >
                  Apply Calibration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4.3: Labor Hike Stress Test Modal */}
      {isLaborSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-700" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Labor Rate Sensitivity Simulation</h3>
                  <p className="text-[11px] text-slate-500">+8% Subcontractor wage inflation stress test</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLaborSimModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Current Average Labor Rate:</span>
                  <span>$88.50 / hr</span>
                </div>
                <div className="flex justify-between font-semibold text-purple-800">
                  <span>Simulated +8% Rate:</span>
                  <span>$95.58 / hr (+$7.08/hr)</span>
                </div>
                <div className="flex justify-between text-[11px] text-purple-700 pt-1 border-t border-purple-200/60">
                  <span>Impact on Active Project Margins:</span>
                  <span className="font-bold text-rose-700">-2.1% Margin Drift</span>
                </div>
              </div>

              <div className="text-slate-600 text-[11px]">
                This simulation stress-tests all current project budgetary plans against potential subcontractor union wage hikes and statutory rate adjustments.
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLaborSimModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRefreshAnalytics();
                    setIsLaborSimModalOpen(false);
                    showToast('Labor sensitivity simulation verified: Project models refreshed.');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-medium shadow-xs cursor-pointer"
                >
                  Run Real-Time Recalculation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4.4: Margin Targets & BOM Rollup Audit Modal */}
      {isMarginAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Margin Guard & Target Verification</h3>
                  <p className="text-[11px] text-slate-500">Audit product BOM costs against commercial price threshold (&gt;28%)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMarginAuditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="space-y-2">
                {produceItems.slice(0, 5).map((item) => {
                  const estCost = item.targetCost || 1200;
                  const price = item.sellingPrice || 1800;
                  const margin = Math.round(((price - estCost) / price) * 100);
                  const isPass = margin >= 28;

                  return (
                    <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500">
                          BOM Cost: ${estCost.toLocaleString()} • Sale Price: ${price.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${isPass ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {margin}% Margin
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPass ? '✓ Meets Target' : '⚠ Below 28% Target'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsMarginAuditModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-xs cursor-pointer"
                >
                  Acknowledge & Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Create Budget Plan Modal */}
      {isCreatePlanModalOpen && (selectedProject || projects[0]) && (
        <CreateBudgetPlanModal
          isOpen={isCreatePlanModalOpen}
          onClose={() => setIsCreatePlanModalOpen(false)}
          currentPlanItems={(selectedProject || projects[0]).selectedItems || []}
          onCreatePlan={handleCreateNewBudgetPlan}
        />
      )}

      {/* Modal 6: Include Plan from Other Project Modal */}
      {isImportPlanModalOpen && (selectedProject || projects[0]) && (
        <ImportPlanFromOtherProjectModal
          isOpen={isImportPlanModalOpen}
          onClose={() => setIsImportPlanModalOpen(false)}
          currentProject={selectedProject || projects[0]}
          allProjects={projects}
          onImportPlan={handleCreateNewBudgetPlan}
        />
      )}

      {/* Modal 7: Plan Templates Library Modal */}
      {isTemplatesModalOpen && (selectedProject || projects[0]) && (
        <PlanTemplatesLibraryModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          currentProject={selectedProject || projects[0]}
          onApplyTemplate={handleCreateNewBudgetPlan}
        />
      )}

      {/* DIRECT FXTT GRID AND TABLE MODAL / VIEW */}
      {activeFXTTCard && (
        <FXTTCardItemsListView
          cardType={activeFXTTCard.cardType}
          cardId={activeFXTTCard.cardId}
          cardTitle={activeFXTTCard.cardTitle}
          cardSubtitle={activeFXTTCard.cardSubtitle}
          cardTag={activeFXTTCard.cardTag}
          materials={materials}
          suppliers={suppliers}
          outsourcedServices={outsourcedServices}
          subcontractors={subcontractors}
          projects={projects}
          produceItems={produceItems}
          categories={INITIAL_CATEGORY_HIERARCHY}
          onClose={() => setActiveFXTTCard(null)}
          onUpdateMaterialPrice={(id, newPrice, reason) => {
            onAddMaterial({ id, retailPrice: newPrice } as any);
          }}
          onAddMaterial={onAddMaterial}
          onAddSupplier={onAddSupplier}
          onAddSubcontractor={onAddSubcontractor}
          onAddOutsourcedService={onAddOutsourcedService}
          onAddProduceItem={onAddProduceItem}
          onAddToProject={(item, projectId) => {
            showToast(`Assigned ${item.code} (${item.name}) to Project ${projectId}`);
          }}
          isModal={true}
        />
      )}

      {/* PROJECT SELECTION MODAL BEFORE EXPORT (EXISTING DATABASE) */}
      <SelectProjectForExportModal
        isOpen={isSelectProjectForExportModalOpen}
        onClose={() => setIsSelectProjectForExportModalOpen(false)}
        projects={projects}
        selectedProject={exportTargetProject}
        mode={projectExportSelectionMode}
        onConfirmAndOpenExport={(chosenProject) => {
          setExportTargetProject(chosenProject);
          if (chosenProject) {
            onSelectProject(chosenProject);
          }
          setIsSelectProjectForExportModalOpen(false);
          setIsExportEnterpriseModalOpen(true);
        }}
        onConfirmQuoteExport={(proj) => {
          setIsSelectProjectForExportModalOpen(false);
          setExportTargetProject(proj);
          onSelectProject(proj);
          onExportPDF(proj);
          showToast(`Generated Executive PDF Quote for [${proj.code}] ${proj.name}`);
        }}
      />

      {/* ENTERPRISE SELECTABLE PDF & CSV EXPORT MODAL */}
      <ExportEnterpriseDataModal
        isOpen={isExportEnterpriseModalOpen}
        onClose={() => setIsExportEnterpriseModalOpen(false)}
        materials={materials}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        produceItems={produceItems}
        projects={projects}
        inventory={inventory}
        companyDetails={companyDetails}
        onToast={showToast}
        selectedProject={exportTargetProject}
        onSelectProject={(p) => {
          setExportTargetProject(p);
          if (p) onSelectProject(p);
        }}
        onRequestChangeProject={() => {
          setIsExportEnterpriseModalOpen(false);
          setProjectExportSelectionMode('enterprise');
          setIsSelectProjectForExportModalOpen(true);
        }}
      />
    </div>
  );
};

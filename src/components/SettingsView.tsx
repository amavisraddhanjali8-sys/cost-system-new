import React, { useState, useRef } from 'react';
import {
  Building2,
  Users,
  Shield,
  Briefcase,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Lock,
  Mail,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  Hash,
  Download,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Database,
  HardDrive,
  Check,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  FileDown,
  Sun,
  Moon,
  Monitor,
  Barcode,
  Volume2,
  Zap
} from 'lucide-react';
import { getStoredThemeMode, setStoredThemeMode, ThemeMode } from '../services/themeService';
import { playHardwareScanBeep, addBarcodeScanListener, BarcodeScanEventDetail } from '../services/globalBarcodeScanner';
import {
  AppUser,
  AccountRequest,
  CompanyDetails,
  UserRole,
  MaterialItem,
  InventoryItem,
  InventoryTransaction,
  Project,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem
} from '../types';
import {
  AutoNumberRule,
  AutoNumberEntityType,
  getStoredAutoNumberRules,
  saveAutoNumberRules,
  resetAutoNumberRules,
  generateSampleNumber,
  peekNextNumber
} from '../services/autoNumberingService';
import { persistentDatabase } from '../services/persistentDatabase';
import { exportMasterExecutiveReportPDF } from '../utils/pdfExport';
import {
  exportMaterialsToCSV,
  exportProduceItemsToCSV,
  exportInventoryToCSV,
  exportInventoryTransactionsToCSV,
  exportSubcontractorsToCSV,
  exportOutsourcedServicesToCSV,
  exportProjectsToCSV,
  exportSuppliersToCSV
} from '../utils/csvExport';
import { formatLKR } from '../utils/currency';

interface SettingsViewProps {
  currentUser: AppUser;
  companyDetails: CompanyDetails;
  onUpdateCompanyDetails: (details: CompanyDetails) => void;
  users: AppUser[];
  onAddUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => void;
  onUpdateUser: (id: string, updates: Partial<AppUser>) => void;
  onDeleteUser: (id: string) => void;
  accountRequests: AccountRequest[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  showToast: (msg: string) => void;
  materials?: MaterialItem[];
  inventory?: InventoryItem[];
  transactions?: InventoryTransaction[];
  projects?: Project[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourced?: OutsourcedService[];
  produceItems?: ProduceItem[];
  onRestoreDatabase?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  companyDetails,
  onUpdateCompanyDetails,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  accountRequests,
  onApproveRequest,
  onRejectRequest,
  showToast,
  materials = [],
  inventory = [],
  transactions = [],
  projects = [],
  suppliers = [],
  subcontractors = [],
  outsourced = [],
  produceItems = [],
  onRestoreDatabase
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'auto_numbering' | 'export_data' | 'users' | 'appearance'>('company');

  // Appearance & Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [recentScanTest, setRecentScanTest] = useState<{
    code: string;
    timestamp: string;
    avgIntervalMs?: number;
    charCount?: number;
    match?: string;
  } | null>(null);

  // Subscribe to barcode scanner test scans
  React.useEffect(() => {
    const unsubscribe = addBarcodeScanListener((detail: BarcodeScanEventDetail) => {
      // Find matches in catalog
      const mat = materials.find((m) => m.barcode === detail.code || m.code?.toUpperCase() === detail.code.toUpperCase());
      const prod = produceItems.find((p) => p.barcode === detail.code || p.itemCode?.toUpperCase() === detail.code.toUpperCase());
      const inv = inventory.find((i) => i.barcode === detail.code || i.sku?.toUpperCase() === detail.code.toUpperCase());

      let matchLabel = 'No matching catalog record found (Unregistered Barcode)';
      if (mat) {
        matchLabel = `Material: ${mat.name} (${mat.code})`;
      } else if (prod) {
        matchLabel = `Product Item: ${prod.name} (${prod.itemCode})`;
      } else if (inv) {
        matchLabel = `Inventory Item: ${inv.materialName} (SKU: ${inv.sku})`;
      }

      setRecentScanTest({
        code: detail.code,
        timestamp: new Date(detail.timestamp).toLocaleTimeString(),
        avgIntervalMs: detail.averageIntervalMs,
        charCount: detail.charCount,
        match: matchLabel
      });
    });

    const handleThemeChange = () => {
      setThemeMode(getStoredThemeMode());
    };
    window.addEventListener('fxtt-theme-changed', handleThemeChange);

    return () => {
      unsubscribe();
      window.removeEventListener('fxtt-theme-changed', handleThemeChange);
    };
  }, [materials, produceItems, inventory]);

  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setStoredThemeMode(mode);
    // Also save in user profile if updating currentUser
    onUpdateUser(currentUser.id, { themePreference: mode });
    showToast(
      mode === 'dark'
        ? 'Night Shift Dark Mode enabled (High-contrast, reduced eye fatigue).'
        : mode === 'light'
        ? 'Day Shift Light Mode enabled.'
        : 'Theme synchronized with device operating system.'
    );
  };

  // Auto-Numbering Schemes State
  const [rules, setRules] = useState<AutoNumberRule[]>(() => getStoredAutoNumberRules());
  const [isSyncingCounters, setIsSyncingCounters] = useState(false);

  // 1-Click Master Export States
  const [isExportingAll, setIsExportingAll] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpdateRule = (entityType: AutoNumberEntityType, field: keyof AutoNumberRule, value: any) => {
    setRules(prev => prev.map(r => r.entityType === entityType ? { ...r, [field]: value } : r));
  };

  const handleSaveRules = () => {
    saveAutoNumberRules(rules);
    showToast('Auto-numbering configuration saved and synchronized with all system modules.');
  };

  const handleResetRules = () => {
    const defaults = resetAutoNumberRules();
    setRules(defaults);
    showToast('Auto-numbering rules restored to factory enterprise defaults.');
  };

  const handleSyncCounters = () => {
    setIsSyncingCounters(true);
    setTimeout(() => {
      // Analyze current max numbers across all database collections to prevent collisions
      const updatedRules = rules.map(rule => {
        let maxFound = 0;
        if (rule.entityType === 'material') {
          materials.forEach(m => {
            const match = m.code?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'project') {
          projects.forEach(p => {
            const match = p.code?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'inventory_in' || rule.entityType === 'inventory_out') {
          transactions.forEach(t => {
            const match = (t.transactionNumber || t.id)?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'subcontractor') {
          subcontractors.forEach(s => {
            const match = s.code?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'outsourced_service') {
          outsourced.forEach(o => {
            const match = o.id?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        } else if (rule.entityType === 'supplier') {
          suppliers.forEach(s => {
            const match = s.id?.match(/\d+/g);
            if (match) {
              const num = parseInt(match[match.length - 1], 10);
              if (num > maxFound) maxFound = num;
            }
          });
        }
        if (maxFound >= rule.nextNumber) {
          return { ...rule, nextNumber: maxFound + 1 };
        }
        return rule;
      });

      setRules(updatedRules);
      saveAutoNumberRules(updatedRules);
      setIsSyncingCounters(false);
      showToast('Sequential counters successfully synchronized with central database without collisions.');
    }, 600);
  };

  // 1-Click Master Export Everything
  const handleExportAll = () => {
    setIsExportingAll(true);
    try {
      // 1. Master Executive PDF Report (LKR)
      exportMasterExecutiveReportPDF(
        companyDetails,
        materials,
        inventory,
        transactions,
        projects,
        subcontractors,
        outsourced,
        suppliers
      );

      // Stagger CSV downloads cleanly
      setTimeout(() => exportMaterialsToCSV(materials), 300);
      setTimeout(() => exportInventoryToCSV(inventory), 600);
      setTimeout(() => exportInventoryTransactionsToCSV(transactions), 900);
      setTimeout(() => exportSubcontractorsToCSV(subcontractors), 1200);
      setTimeout(() => exportOutsourcedServicesToCSV(outsourced), 1500);
      setTimeout(() => exportProjectsToCSV(projects), 1800);
      setTimeout(() => exportSuppliersToCSV(suppliers), 2100);
      setTimeout(() => exportProduceItemsToCSV(produceItems), 2400);
      setTimeout(() => persistentDatabase.exportCompleteDatabase(), 2700);

      setTimeout(() => {
        setIsExportingAll(false);
        showToast('1-Click Master Export completed: Executive PDF & 9 datasets downloaded in LKR.');
      }, 3000);
    } catch (e) {
      console.error(e);
      setIsExportingAll(false);
      showToast('Master export encountered an issue. Please try again.');
    }
  };

  // Database Restore from JSON File (Strict 10MB maximum limit)
  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_10MB = 10 * 1024 * 1024;
    if (file.size > MAX_10MB) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      showToast(`Database restore file exceeds 10 MB maximum limit (${sizeMb} MB). Please upload a file under 10 MB.`);
      if (dbFileInputRef.current) dbFileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = persistentDatabase.restoreDatabase(text);
        if (success) {
          showToast('Central persistent database restored successfully.');
          if (onRestoreDatabase) onRestoreDatabase();
        } else {
          showToast('Failed to restore database: Invalid backup structure.');
        }
      } catch (err) {
        showToast('Error parsing database backup file.');
      }
    };
    reader.readAsText(file);
    if (dbFileInputRef.current) dbFileInputRef.current.value = '';
  };

  // Company Details Form State
  const [compForm, setCompForm] = useState<CompanyDetails>({ ...companyDetails });
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Users Filter State
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Add/Edit User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormEmpId, setUserFormEmpId] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>('PROJECT_MANAGER');
  const [userFormDept, setUserFormDept] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('user123');
  const [userFormStatus, setUserFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Handle Logo Upload via File (Strict 10MB limit)
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_10MB = 10 * 1024 * 1024;
    if (file.size > MAX_10MB) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      showToast(`Company logo file exceeds 10 MB maximum limit (${sizeMb} MB).`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCompForm(prev => ({ ...prev, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const MAX_10MB = 10 * 1024 * 1024;
    if (file.size > MAX_10MB) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      showToast(`Company logo file exceeds 10 MB maximum limit (${sizeMb} MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCompForm(prev => ({ ...prev, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompanyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompanyDetails(compForm);
    showToast('Company details and branding configuration updated successfully.');
  };

  // Open modal for new user
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserFormEmpId(`EMP-${Date.now().toString().slice(-4)}`);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormRole('PROJECT_MANAGER');
    setUserFormDept('Project Engineering');
    setUserFormPassword('pass123');
    setUserFormStatus('Active');
    setIsUserModalOpen(true);
  };

  // Open modal for editing user
  const handleOpenEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setUserFormEmpId(user.employeeId);
    setUserFormName(user.name);
    setUserFormEmail(user.email);
    setUserFormRole(user.role);
    setUserFormDept(user.department);
    setUserFormPassword(user.password || '');
    setUserFormStatus(user.status);
    setIsUserModalOpen(true);
  };

  // Save User Form
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormEmpId || !userFormName || !userFormEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormEmail.trim())) {
      showToast('Please enter a valid email address (e.g. name@company.com).');
      return;
    }

    if (editingUserId) {
      onUpdateUser(editingUserId, {
        employeeId: userFormEmpId.trim().toUpperCase(),
        name: userFormName.trim(),
        email: userFormEmail.trim(),
        role: userFormRole,
        department: userFormDept.trim(),
        password: userFormPassword.trim(),
        status: userFormStatus
      });
      showToast(`User ${userFormName} updated successfully.`);
    } else {
      onAddUser({
        employeeId: userFormEmpId.trim().toUpperCase(),
        name: userFormName.trim(),
        email: userFormEmail.trim(),
        role: userFormRole,
        department: userFormDept.trim(),
        password: userFormPassword.trim(),
        status: userFormStatus
      });
      showToast(`New user ${userFormName} created.`);
    }

    setIsUserModalOpen(false);
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingRequests = accountRequests.filter(r => r.status === 'Pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              <span>System Settings</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage corporate identity, logo positioning, and system users access control
            </p>
          </div>

          {/* Sub-Tabs: Company details vs Auto-Numbering vs Exports vs Users */}
          <div className="inline-flex h-9 p-0.5 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('company')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                activeSubTab === 'company'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Company Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('auto_numbering')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                activeSubTab === 'auto_numbering'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auto-Numbering</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('export_data')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                activeSubTab === 'export_data'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>1-Click Exports (PDF & CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                activeSubTab === 'users'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Users</span>
              {currentUser.role === 'ADMIN' && pendingRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('appearance')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                activeSubTab === 'appearance'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-purple-600" />
              <span>Display & Night Shift</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-900 text-white text-[9px] font-bold rounded-full uppercase">
                Dark
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: COMPANY DETAILS */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompanyDetails} className="space-y-6">
          {/* Logo Upload & Placement Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>Company Logo & Top Header Placement</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload your company logo and choose whether it appears in the top navigation left or right corner.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Dropzone */}
              <div className="md:col-span-2">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsLogoDragging(true); }}
                  onDragLeave={() => setIsLogoDragging(false)}
                  onDrop={handleLogoDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isLogoDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    Click to browse or drag & drop company logo
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports transparent PNG, SVG, or high-res JPG (recommended max height: 60px)
                  </p>
                </div>

                {/* Preset Logos for Fast Testing */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Or use a sample logo:</span>
                  <button
                    type="button"
                    onClick={() => setCompForm(prev => ({
                      ...prev,
                      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=60'
                    }))}
                    className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Tech Gradient
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setCompForm(prev => ({
                      ...prev,
                      logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=160&auto=format&fit=crop&q=60'
                    }))}
                    className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    Industrial Crest
                  </button>
                  {compForm.logoUrl && (
                    <>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setCompForm(prev => ({ ...prev, logoUrl: '' }))}
                        className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove Logo
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Logo Preview & Corner Placement Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Current Logo Preview
                  </label>
                  <div className="h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 shadow-2xs">
                    {compForm.logoUrl ? (
                      <img
                        src={compForm.logoUrl}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 italic">No custom logo loaded</span>
                    )}
                  </div>
                </div>

                {/* Left or Right Corner Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Header Corner Placement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCompForm(prev => ({ ...prev, logoPosition: 'left' }))}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        compForm.logoPosition === 'left'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">Left Corner</div>
                      <div className="text-[10px] text-slate-500">Next to brand title</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompForm(prev => ({ ...prev, logoPosition: 'right' }))}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        compForm.logoPosition === 'right'
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">Right Corner</div>
                      <div className="text-[10px] text-slate-500">Beside user profile</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Details Form Fields */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Corporate Legal & Operational Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={compForm.name}
                  onChange={(e) => setCompForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Registration / License No.
                </label>
                <input
                  type="text"
                  value={compForm.registrationNumber}
                  onChange={(e) => setCompForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tax Identification / EIN *
                </label>
                <input
                  type="text"
                  required
                  value={compForm.taxId}
                  onChange={(e) => setCompForm(prev => ({ ...prev, taxId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Operating Currency
                </label>
                <select
                  value={compForm.currency}
                  onChange={(e) => setCompForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                >
                  <option value="LKR (Rs.)">LKR (Rs.) - Sri Lanka Rupee (Default Enterprise Standard)</option>
                  <option value="USD ($)">USD ($) - US Dollar</option>
                  <option value="EUR (€)">EUR (€) - Euro</option>
                  <option value="GBP (£)">GBP (£) - British Pound</option>
                  <option value="JPY (¥)">JPY (¥) - Japanese Yen</option>
                  <option value="CAD ($)">CAD ($) - Canadian Dollar</option>
                  <option value="AUD ($)">AUD ($) - Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Corporate Email *</span>
                </label>
                <input
                  type="email"
                  required
                  value={compForm.email}
                  onChange={(e) => setCompForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Primary Telephone</span>
                </label>
                <input
                  type="text"
                  value={compForm.phone}
                  onChange={(e) => setCompForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Corporate Website</span>
                </label>
                <input
                  type="text"
                  value={compForm.website}
                  onChange={(e) => setCompForm(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  System Header Tagline
                </label>
                <input
                  type="text"
                  value={compForm.tagline || ''}
                  onChange={(e) => setCompForm(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g. Materials, Outsourced Tariffs & Multi-Phase Costing"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Headquarters Physical Address</span>
                </label>
                <textarea
                  rows={2}
                  value={compForm.address}
                  onChange={(e) => setCompForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-200">
              <button
                type="submit"
                className="h-9 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all duration-150 cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Company Details</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: AUTO-NUMBERING CONFIGURATION */}
      {activeSubTab === 'auto_numbering' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  <span>Enterprise Auto-Numbering Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure custom prefix schemas, zero-padding lengths, suffixes, and sequential counters for all system entity identifiers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncCounters}
                  disabled={isSyncingCounters}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Scan current database collections and auto-bump next counters higher than existing items"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncingCounters ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCounters ? 'Syncing...' : 'Sync with Central DB'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetRules}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const preview = generateSampleNumber(rule);
              return (
                <div
                  key={rule.entityType}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Label & Active Switch */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{rule.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{rule.description}</p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.active}
                          onChange={(e) => handleUpdateRule(rule.entityType, 'active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    </div>

                    {/* Preview Box */}
                    <div className="my-3 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between">
                      <div className="text-[11px] font-medium text-slate-500">Live Auto ID Preview:</div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono text-xs font-bold text-emerald-800 tracking-wider">
                          {preview}
                        </span>
                      </div>
                    </div>

                    {/* Form Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={rule.prefix}
                          onChange={(e) => handleUpdateRule(rule.entityType, 'prefix', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. MAT-"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Suffix
                        </label>
                        <input
                          type="text"
                          value={rule.suffix || ''}
                          onChange={(e) => handleUpdateRule(rule.entityType, 'suffix', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="Optional"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Zero Padding
                        </label>
                        <select
                          value={rule.paddingDigits}
                          onChange={(e) => handleUpdateRule(rule.entityType, 'paddingDigits', Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value={3}>3 digits (001)</option>
                          <option value={4}>4 digits (0001)</option>
                          <option value={5}>5 digits (00001)</option>
                          <option value={6}>6 digits (000001)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                          Next Counter
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={rule.nextNumber}
                          onChange={(e) => handleUpdateRule(rule.entityType, 'nextNumber', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Save Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Changes apply instantly to all newly registered items, inventory movements, and project codes.
            </div>
            <button
              type="button"
              onClick={handleSaveRules}
              className="h-9 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all duration-150 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Save Auto-Numbering Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 1-CLICK EXPORTS (PDF & CSV) & STABLE DATABASE MONITOR */}
      {activeSubTab === 'export_data' && (
        <div className="space-y-6">
          {/* Hidden File Input for Database JSON Restore */}
          <input
            ref={dbFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreDatabase}
            className="hidden"
          />

          {/* MASTER 1-CLICK HERO CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enterprise 1-Click Generation Suite</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Generate & Download Everything in 1-Click
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Downloads the multi-page Executive Master Audit PDF Report in Sri Lanka Rupees (LKR / Rs.) alongside all 9 individual system CSV datasets and the complete static central database JSON backup package.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span>Included:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Executive PDF (LKR)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Materials CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Suppliers CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Labour Rates CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Outsourced Tariffs CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Products & Assemblies CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Projects CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Stock Ledger CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Central DB JSON</span>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleExportAll}
                  disabled={isExportingAll}
                  className="w-full sm:w-auto h-12 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isExportingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating & Downloading Suite...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-slate-950" />
                      <span>⚡ 1-Click Master Export All (PDFs + CSVs + DB)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* INDIVIDUAL EXPORT MODULES (Bento Grid) */}
          <div>
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Individual Module Exports (LKR Standard)
              </h4>
              <p className="text-[11px] text-slate-500">
                Download individual reports or datasets on-demand formatted with Sri Lanka Rupee (LKR / Rs.) valuation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Executive Master Audit PDF */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Executive Master Audit Report</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Multi-page corporate PDF report covering total enterprise valuation, stock positions, project allocations, and audited records in LKR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportMasterExecutiveReportPDF(
                      companyDetails,
                      materials,
                      inventory,
                      transactions,
                      projects,
                      subcontractors,
                      outsourced,
                      suppliers
                    );
                    showToast('Executive Master PDF report downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>Download PDF (LKR)</span>
                </button>
              </div>

              {/* 2. Materials Master Catalog CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Materials Master Catalog</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    CSV dataset containing all material items, item codes, classifications, unit rates in LKR, and linked suppliers. ({materials.length} records)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportMaterialsToCSV(materials);
                    showToast('Materials catalog CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export Materials CSV</span>
                </button>
              </div>

              {/* 3. Inventory Stock Ledger CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Inventory Stock Ledger</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Complete physical inventory levels, allocated projects, bin locations, and total stock valuations in LKR. ({inventory.length} records)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportInventoryToCSV(inventory);
                    showToast('Inventory stock ledger CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Inventory CSV</span>
                </button>
              </div>

              {/* 4. Audited Inventory Transactions CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Transactions Audit Trail</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Certified traceability movements with transaction numbers, central SKUs, batch/lot numbers, and LKR totals. ({transactions.length} records)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportInventoryTransactionsToCSV(transactions);
                    showToast('Inventory transactions CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600" />
                  <span>Export Transactions CSV</span>
                </button>
              </div>

              {/* 5. Subcontractor Trade Rates CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Subcontractor Labour Tariffs</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Specialist labour rates, skill classifications, daily/hourly tariffs in LKR, and trade codes. ({subcontractors.length} trades)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportSubcontractorsToCSV(subcontractors);
                    showToast('Subcontractors tariff CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Export Labour CSV</span>
                </button>
              </div>

              {/* 6. Outsourced Services CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Outsourced Services Tariffs</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Machinery, logistics, quality testing, and specialized utility service rate cards in LKR. ({outsourced.length} services)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportOutsourcedServicesToCSV(outsourced);
                    showToast('Outsourced services CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600" />
                  <span>Export Services CSV</span>
                </button>
              </div>

              {/* 7. Enterprise Projects CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Enterprise Projects Ledger</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Project pipeline with codes, clients, target margins, cost breakdowns, and quoted valuations in LKR. ({projects.length} projects)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportProjectsToCSV(projects);
                    showToast('Projects ledger CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export Projects CSV</span>
                </button>
              </div>

              {/* 8. Approved Suppliers Directory CSV */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Approved Suppliers Directory</h5>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vendor registry with contact persons, performance ratings, payment terms, and contracts. ({suppliers.length} vendors)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportSuppliersToCSV(suppliers);
                    showToast('Suppliers directory CSV downloaded.');
                  }}
                  className="mt-4 w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Export Suppliers CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* STATIC & STABLE CENTRAL DATABASE ZERO-DOWNTIME MONITOR */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Static & Stable Central Database Monitor
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Online & Immune to Refresh</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Internal central database is configured to be static and resilient — all records persist permanently across page reloads, hard refreshes, and server restarts.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    persistentDatabase.exportCompleteDatabase();
                    showToast('Static central database JSON backup downloaded.');
                  }}
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Backup JSON DB</span>
                </button>

                <button
                  type="button"
                  onClick={() => dbFileInputRef.current?.click()}
                  className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Restore DB</span>
                </button>
              </div>
            </div>

            {/* Central DB Live Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Catalog Materials</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{materials.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Synchronized</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Inventory Stock</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{inventory.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Active SKU link</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Traceability Audits</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{transactions.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Unique numbered</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Enterprise Projects</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{projects.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">Budgeted in LKR</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">System Currency</div>
                <div className="text-base font-bold text-emerald-700 mt-0.5">LKR (Rs.)</div>
                <div className="text-[10px] text-slate-500 font-medium">Sri Lanka Rupee</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: USERS */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* ACCESS RESTRICTION FOR NON-ADMIN USERS */}
          {currentUser.role !== 'ADMIN' ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Administrator Access Required</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Only users with the <span className="font-semibold text-indigo-600">Admin</span> role can access, add, and manage user accounts in this system.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Your Current Account:</span>
                  <span className="font-semibold text-slate-800">{currentUser.name} ({currentUser.employeeId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                    Project Manager
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Privileges:</span>
                  <span className="text-slate-600">Inventory IN/OUT, Projects, Materials, Catalogs</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                To manage user credentials or adjust roles, please sign in with an Administrator account (e.g. Jane Doe • EMP-ADM-01).
              </p>
            </div>
          ) : (
            /* ADMIN USER MANAGEMENT PANEL */
            <>
              {/* User Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Users</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{users.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Admins</div>
                  <div className="text-xl font-bold text-indigo-600 mt-1">
                    {users.filter(u => u.role === 'ADMIN').length}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Project Managers</div>
                  <div className="text-xl font-bold text-blue-600 mt-1">
                    {users.filter(u => u.role === 'PROJECT_MANAGER').length}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending Requests</div>
                  <div className="text-xl font-bold text-amber-600 mt-1">{pendingRequests.length}</div>
                </div>
              </div>

              {/* ADMIN PROFILE CARD & EMAIL UPDATE */}
              {users.find((u) => u.role === 'ADMIN') && (() => {
                const adminUser = users.find((u) => u.role === 'ADMIN')!;
                return (
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{adminUser.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Primary Administrator
                          </span>
                          <span className="text-slate-400 font-mono text-xs">[{adminUser.employeeId}]</span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                          <span>Email: <strong className="text-slate-800 font-medium">{adminUser.email}</strong></span>
                          <span>•</span>
                          <span>Dept: <strong className="text-slate-800 font-medium">{adminUser.department || 'Executive Management'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditUser(adminUser)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Change Admin Details & Email</span>
                    </button>
                  </div>
                );
              })()}

              {/* PENDING ACCOUNT REQUESTS SECTION (FROM LOGIN PAGE) */}
              {pendingRequests.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-amber-500 text-white">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                          Pending Account Requests ({pendingRequests.length})
                        </h4>
                        <p className="text-[11px] text-amber-700">
                          Employees requesting system access via the login screen
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white border border-amber-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{req.name}</span>
                            <span className="text-slate-400 text-xs font-mono">[{req.employeeId}]</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-semibold ${
                              req.requestedRole === 'ADMIN'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              Requested: {req.requestedRole === 'ADMIN' ? 'Admin' : 'Project Manager'}
                            </span>
                            <span className="text-[10px] text-slate-500">Dept: {req.department}</span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Email: <span className="font-medium text-slate-800">{req.email}</span> • Reason: "{req.reason}"
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApproveRequest(req.id)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Activate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectRequest(req.id)}
                            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users Toolbar & Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {/* Toolbar */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search users by name, employee ID, department..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="inline-flex h-8 p-0.5 bg-slate-200/70 rounded-lg border border-slate-200/80 shadow-2xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setRoleFilter('ALL')}
                        className={`px-2.5 h-full rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                          roleFilter === 'ALL'
                            ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoleFilter('ADMIN')}
                        className={`px-2.5 h-full rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                          roleFilter === 'ADMIN'
                            ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Admins
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoleFilter('PROJECT_MANAGER')}
                        className={`px-2.5 h-full rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                          roleFilter === 'PROJECT_MANAGER'
                            ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Project Mgrs
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddUser}
                    className="h-8 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Employee ID</th>
                        <th className="py-2.5 px-3">Full Name & Email</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Created Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            No users found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              {user.employeeId}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                {user.avatarUrl ? (
                                  <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                    {user.authProvider === 'google' && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold border border-blue-200">
                                        Google
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {user.role === 'ADMIN' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <Shield className="w-3 h-3" />
                                  <span>Admin</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Briefcase className="w-3 h-3" />
                                  <span>Project Manager</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {user.department}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (user.id === currentUser.id) {
                                    showToast('Cannot deactivate your own active session account.');
                                    return;
                                  }
                                  const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
                                  onUpdateUser(user.id, { status: newStatus });
                                  showToast(`User ${user.name} marked as ${newStatus}.`);
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                                  user.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                }`}
                                title="Click to toggle status"
                              >
                                {user.status}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500">
                              {user.createdAt}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(user)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {user.id !== currentUser.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Delete user ${user.name} (${user.employeeId})?`)) {
                                        onDeleteUser(user.id);
                                        showToast(`User ${user.name} deleted.`);
                                      }
                                    }}
                                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 5: DISPLAY, NIGHT SHIFT DARK MODE & BARCODE SCANNER SETTINGS */}
      {activeSubTab === 'appearance' && (
        <div className="space-y-6">
          {/* THEME SELECTION PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-600" />
                  <span>Theme & Night-Shift Ergonomics</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-contrast dark mode tailored for night-shift operators, warehouse environments, and reduced ocular strain.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Active: {themeMode === 'dark' ? 'Night Shift (Dark)' : themeMode === 'light' ? 'Day Shift (Light)' : 'System Automatic'}</span>
              </div>
            </div>

            {/* 3 Theme Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Day Shift Light Mode */}
              <div
                onClick={() => handleSelectTheme('light')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  themeMode === 'light'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-5 h-5" />
                    </div>
                    {themeMode === 'light' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Day Shift (Light Mode)</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Crisp white canvas, high-legibility dark slate typography, ideal for daylight offices and sunny workstations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Standard daylight</span>
                  <span className="font-semibold text-slate-700">6500K Color Profile</span>
                </div>
              </div>

              {/* Night Shift Dark Mode */}
              <div
                onClick={() => handleSelectTheme('dark')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  themeMode === 'dark'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 text-cyan-400 flex items-center justify-center shadow-xs">
                      <Moon className="w-5 h-5" />
                    </div>
                    {themeMode === 'dark' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900">Night Shift (Dark Mode)</h4>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 text-[9px] font-bold uppercase">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    High-contrast deep slate canvas (`#090d16`), anti-glare, eye-safe phosphor contrast, luminous status badges for 24/7 night-shift productivity.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Reduced blue glare</span>
                  <span className="font-semibold text-cyan-600">Zero Eye Fatigue</span>
                </div>
              </div>

              {/* System Default */}
              <div
                onClick={() => handleSelectTheme('system')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  themeMode === 'system'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Monitor className="w-5 h-5" />
                    </div>
                    {themeMode === 'system' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">System Automatic</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Automatically coordinates with your operating system or mobile device's day/night sunset schedule.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Reactive sync</span>
                  <span className="font-semibold text-slate-700">Auto Sensor</span>
                </div>
              </div>
            </div>
          </div>

          {/* HARDWARE BARCODE SCANNER (KEYBOARD WEDGE / RAPID SEQUENCE DETECTOR) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Barcode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>Global Hardware Barcode Scanner Listener</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <Zap className="w-3 h-3" /> Online & Listening
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Intersects rapid keystrokes (&lt; 65ms per character) followed by Enter from any USB, Bluetooth, or wireless scanner gun to auto-populate materials and inventory.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => playHardwareScanBeep(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Test auditory feedback tone"
              >
                <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Test Scanner Chime</span>
              </button>
            </div>

            {/* Specifications & Live Diagnostics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Keystroke Burst Speed</span>
                <span className="font-bold text-slate-900 mt-0.5 block">&le; 65ms per key</span>
                <span className="text-[10px] text-slate-400">Differentiates physical laser guns from manual typing</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Hardware Compatibility</span>
                <span className="font-bold text-slate-900 mt-0.5 block">USB / Bluetooth / 2.4GHz Wedge</span>
                <span className="text-[10px] text-slate-400">Honeywell, Zebra, Symbol, Netum, Tera, Inateck, etc.</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Automated Action</span>
                <span className="font-bold text-slate-900 mt-0.5 block">Instant Lookup & Fill</span>
                <span className="text-[10px] text-slate-400">Auto-populates active catalog, inventory & search fields</span>
              </div>
            </div>

            {/* Interactive Hardware Scanner Test Field */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Live Scanner Verification Console
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Point any handheld barcode scanner gun at a barcode on your screen, box, or paper label and pull the trigger to test:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  data-barcode-input="true"
                  id="scanner-test-field"
                  value={scannerTestInput}
                  onChange={(e) => setScannerTestInput(e.target.value)}
                  placeholder="Pull scanner gun trigger now or type code then press Enter..."
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setScannerTestInput('')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {recentScanTest && (
                <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Barcode Intercepted: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-blue-700 font-bold">{recentScanTest.code}</code>
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Match Status: <strong className="text-slate-800">{recentScanTest.match}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono">
                    <div>Speed: {recentScanTest.avgIntervalMs}ms / key ({recentScanTest.charCount} chars)</div>
                    <div>Logged at: {recentScanTest.timestamp}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {editingUserId ? 'Edit User Account' : 'Create New System User'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Employee ID / User ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormEmpId}
                    onChange={(e) => setUserFormEmpId(e.target.value)}
                    placeholder="e.g. EMP-ADM-03"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    User Role *
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="ADMIN">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  placeholder="e.g. Johnathan Smith"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={userFormEmail}
                  onChange={(e) => setUserFormEmail(e.target.value)}
                  placeholder="e.g. j.smith@fxtt-enterprise.com"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={userFormDept}
                    onChange={(e) => setUserFormDept(e.target.value)}
                    placeholder="e.g. Procurement"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={userFormStatus}
                    onChange={(e) => setUserFormStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    placeholder="Set account password"
                    className="w-full pl-3 pr-9 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {editingUserId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

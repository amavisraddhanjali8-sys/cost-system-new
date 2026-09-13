import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Package,
  X,
  Camera,
  Check,
  Layers,
  ArrowRight,
  RotateCcw,
  Keyboard,
  ScanLine,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Hash,
  ShieldCheck,
  Link2,
  ExternalLink,
  Printer
} from 'lucide-react';
import { MaterialItem, Project, InventoryItem, Supplier, InventoryTransaction } from '../types';
import { INITIAL_MATERIALS } from '../data/initialData';
import { generateBarcodeBits } from '../utils/barcodeGenerator';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { generateNextNumber, peekNextNumber } from '../services/autoNumberingService';
import { formatLKR } from '../utils/currency';
import { persistentDatabase } from '../services/persistentDatabase';
import { addBarcodeScanListener } from '../services/globalBarcodeScanner';

// Barcode Visual SVG Renderer
export const BarcodeVisual: React.FC<{ code: string; className?: string }> = ({ code, className = '' }) => {
  const bits = useMemo(() => generateBarcodeBits(code || 'ITEM'), [code]);
  const barWidth = 2;
  const height = 38;
  const totalWidth = bits.length * barWidth;

  return (
    <div className={`inline-flex flex-col items-center bg-white px-2.5 py-1 border border-slate-300 rounded shadow-2xs ${className}`}>
      <svg width={totalWidth} height={height} className="block">
        {bits.split('').map((bit, idx) =>
          bit === '1' ? (
            <rect key={idx} x={idx * barWidth} y={0} width={barWidth} height={height} fill="#0f172a" />
          ) : null
        )}
      </svg>
      <span className="font-mono text-[10px] font-bold text-slate-800 tracking-wider mt-0.5">
        *{code.toUpperCase()}*
      </span>
    </div>
  );
};

export interface InventoryProcurementViewProps {
  materials?: MaterialItem[];
  inventory?: InventoryItem[];
  projects?: Project[];
  suppliers?: Supplier[];
  onAddInventoryItem?: (item: Partial<InventoryItem>) => void;
  onUpdateInventoryStock?: (id: string, onHand: number) => void;
  onRecordTransaction?: (transaction: InventoryTransaction) => void;
}

export const InventoryProcurementView: React.FC<InventoryProcurementViewProps> = ({
  materials: propMaterials,
  inventory = [],
  projects = [],
  suppliers = [],
  onRecordTransaction,
  onUpdateInventoryStock
}) => {
  // Materials state (synchronized with props or fallback data)
  const [materials, setMaterials] = useState<MaterialItem[]>(
    propMaterials && propMaterials.length > 0 ? propMaterials : INITIAL_MATERIALS
  );

  useEffect(() => {
    if (propMaterials && propMaterials.length > 0) {
      setMaterials(propMaterials);
    }
  }, [propMaterials]);

  // Modal for Viewing Full Central Traceability Certificate
  const [traceabilityModalTx, setTraceabilityModalTx] = useState<InventoryTransaction | null>(null);

  // 1. Transaction Type: 'IN' (Stock increase) or 'OUT' (Stock decrease)
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('IN');

  // 2. Project Selection State
  // 'none' represents No Project / General Inventory
  const [selectedProjectId, setSelectedProjectId] = useState<string>('none');
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState<boolean>(false);
  const projectDropdownRef = useRef<HTMLDivElement | null>(null);

  // 3. Material Selection State & Scanner Mode Toggle ('MANUAL' vs 'CAMERA')
  const [scanInputMode, setScanInputMode] = useState<'MANUAL' | 'CAMERA'>('MANUAL');
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState<boolean>(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);
  const [cameraScanActive, setCameraScanActive] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const materialDropdownRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 4. Transaction Details State
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [discountPct, setDiscountPct] = useState<number>(0);

  // Feedback Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Recorded Transactions History with Static Persistent Database
  const [recentTransactions, setRecentTransactions] = useState<InventoryTransaction[]>(() => {
    return persistentDatabase.getTransactions([
      {
        id: 'tx-init-1',
        transactionNumber: 'TX-IN-00101',
        type: 'IN',
        date: new Date().toISOString().slice(0, 10),
        timestamp: '11:42 AM',
        projectId: 'prj-1',
        projectCode: 'PRJ-AERO-01',
        projectName: 'Commercial Airliner Wing Assembly',
        materialId: 'mat-01',
        materialCode: 'MAT-ALU-6061-T6',
        materialName: 'Aerospace Structural Aluminum 6061-T6 Plate (12mm)',
        barcode: 'MAT-ALU-6061-T6',
        inventorySku: 'SKU-ALU-01',
        batchLotNumber: 'LOT-2026-0089',
        supplierId: 'sup-01',
        supplierName: 'Vanguard Aerospace Materials Ltd',
        requisitionNumber: 'REQ-2026-0101',
        currency: 'LKR',
        quantity: 25,
        unit: 'sheet',
        price: 420,
        discount: 8,
        discountAmount: 840,
        totalAmount: 9660,
        previousAvailableQuantity: 120,
        newAvailableQuantity: 145
      },
      {
        id: 'tx-init-2',
        transactionNumber: 'TX-OUT-00102',
        type: 'OUT',
        date: new Date().toISOString().slice(0, 10),
        timestamp: '10:15 AM',
        projectId: 'none',
        projectCode: 'GENERAL',
        projectName: 'No Project / General Inventory',
        materialId: 'mat-02',
        materialCode: 'MAT-SS-316L',
        materialName: 'Stainless Steel 316L Precision Ground Round Bar (50mm)',
        barcode: 'MAT-SS-316L',
        inventorySku: 'SKU-SS-02',
        batchLotNumber: 'LOT-2026-0090',
        supplierId: 'sup-02',
        supplierName: 'Apex Precision Metals',
        requisitionNumber: 'REQ-2026-0102',
        currency: 'LKR',
        quantity: 5,
        unit: 'm',
        price: 270.75,
        discount: 0,
        discountAmount: 0,
        totalAmount: 1353.75,
        previousAvailableQuantity: 20,
        newAvailableQuantity: 15
      }
    ]);
  });

  // Keep static database synced whenever transactions change
  useEffect(() => {
    if (recentTransactions && recentTransactions.length > 0) {
      persistentDatabase.saveTransactions(recentTransactions);
    }
  }, [recentTransactions]);

  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
        setIsMaterialDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Projects for selection
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const q = projectSearchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.clientName?.toLowerCase().includes(q)
    );
  }, [projects, projectSearchQuery]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'none') return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filtered Materials for selection
  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return materials.slice(0, 10);
    const q = materialSearchQuery.toLowerCase();
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.subCategory && m.subCategory.toLowerCase().includes(q))
    );
  }, [materials, materialSearchQuery]);

  // When a material is selected, automatically update default price and discount
  const handleSelectMaterial = (material: MaterialItem) => {
    setSelectedMaterial(material);
    setPrice(material.retailPrice || 0);
    setDiscountPct(material.defaultDiscountPct || 0);
    setMaterialSearchQuery('');
    setIsMaterialDropdownOpen(false);
  };

  // Barcode Lookup Handler (used by input Enter key or barcode scanner)
  const handleBarcodeLookup = (barcodeText: string) => {
    const clean = barcodeText.trim();
    if (!clean) return;

    // Search exact barcode, code, id or case-insensitive code/name match
    const found = materials.find(
      (m) =>
        m.barcode?.toLowerCase() === clean.toLowerCase() ||
        m.code.toLowerCase() === clean.toLowerCase() ||
        m.id.toLowerCase() === clean.toLowerCase() ||
        clean.toLowerCase().includes(m.code.toLowerCase())
    );

    if (found) {
      handleSelectMaterial(found);
      setScanFeedback(`Matched: ${found.code} - ${found.name}`);
      setTimeout(() => setScanFeedback(null), 3000);
      setIsBarcodeScannerOpen(false);
    } else {
      // Also check if matches any inventory item by SKU or Barcode
      const invItem = inventory.find(
        (i) =>
          i.barcode?.toLowerCase() === clean.toLowerCase() ||
          i.sku?.toLowerCase() === clean.toLowerCase()
      );
      if (invItem) {
        const matchingMat = materials.find((m) => m.id === invItem.materialId || m.name === invItem.materialName);
        if (matchingMat) {
          handleSelectMaterial(matchingMat);
          setScanFeedback(`Matched Inventory SKU ${invItem.sku}: ${matchingMat.name}`);
          setTimeout(() => setScanFeedback(null), 3000);
          setIsBarcodeScannerOpen(false);
          return;
        }
      }
      setScanFeedback(`No material found for barcode: "${clean}"`);
      setTimeout(() => setScanFeedback(null), 3500);
    }
  };

  // Global rapid keystroke hardware scanner listener subscriber
  useEffect(() => {
    const unsubscribe = addBarcodeScanListener((detail) => {
      setScanInputMode('MANUAL');
      setMaterialSearchQuery(detail.code);
      handleBarcodeLookup(detail.code);
    });
    return unsubscribe;
  }, [materials, inventory]);

  // Camera stream handler for barcode scanner modal
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isBarcodeScannerOpen && cameraScanActive) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
            }
          })
          .catch((err) => {
            console.warn('Camera access unavailable in preview environment:', err);
          });
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isBarcodeScannerOpen, cameraScanActive]);

  // Real-time Calculation values
  const currentAvailable = selectedMaterial ? selectedMaterial.inStock : 0;
  const unit = selectedMaterial ? selectedMaterial.unit || 'pcs' : 'pcs';

  const subtotal = (quantity || 0) * (price || 0);
  const discountAmount = (subtotal * (discountPct || 0)) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Projected new available quantity
  const newAvailable =
    transactionType === 'IN'
      ? currentAvailable + (quantity || 0)
      : currentAvailable - (quantity || 0);

  const isStockInsufficient = transactionType === 'OUT' && (quantity || 0) > currentAvailable;

  // Handle Save Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMaterial) {
      setNotification({ type: 'error', message: 'Please select a material first.' });
      return;
    }

    if (!quantity || quantity <= 0) {
      setNotification({ type: 'error', message: 'Quantity must be greater than zero.' });
      return;
    }

    if (transactionType === 'OUT' && quantity > currentAvailable) {
      setNotification({
        type: 'error',
        message: `Insufficient quantity available (${currentAvailable} ${unit}). Cannot dispatch ${quantity} ${unit}.`
      });
      return;
    }

    const calculatedNewStock = transactionType === 'IN' ? currentAvailable + quantity : currentAvailable - quantity;

    // Generate unique transaction number via configured auto-numbering rule
    const transactionNumber = generateNextNumber(transactionType === 'IN' ? 'inventory_in' : 'inventory_out');
    // Generate/assign unique batch & lot reference
    const batchLotNumber = generateNextNumber('batch_lot');

    // Find linked central inventory SKU if available, or construct standard central SKU
    const matchingInventoryItem = inventory?.find(i => i.materialId === selectedMaterial.id || i.sku === selectedMaterial.code);
    const linkedSku = matchingInventoryItem ? matchingInventoryItem.sku : `SKU-${selectedMaterial.code}`;
    const linkedSupplier = suppliers?.find(s => s.id === selectedMaterial.supplierId || s.name === selectedMaterial.supplier);

    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      transactionNumber,
      type: transactionType,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      projectId: selectedProjectId === 'none' ? undefined : selectedProjectId,
      projectCode: selectedProject ? selectedProject.code : 'GENERAL',
      projectName: selectedProject ? selectedProject.name : 'No Project / General Inventory',
      materialId: selectedMaterial.id,
      materialCode: selectedMaterial.code,
      materialName: selectedMaterial.name,
      barcode: selectedMaterial.code,
      inventoryItemId: matchingInventoryItem?.id,
      inventorySku: linkedSku,
      batchLotNumber,
      supplierId: linkedSupplier?.id || selectedMaterial.supplierId || 'sup-01',
      supplierName: linkedSupplier?.name || selectedMaterial.supplier || 'Approved Catalog Supplier',
      requisitionNumber: `REQ-2026-${Date.now().toString().slice(-4)}`,
      currency: 'LKR',
      quantity,
      unit,
      price,
      discount: discountPct,
      discountAmount,
      totalAmount,
      previousAvailableQuantity: currentAvailable,
      newAvailableQuantity: calculatedNewStock
    };

    // 1. Update internal material stock
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === selectedMaterial.id ? { ...m, inStock: calculatedNewStock } : m
      )
    );

    // 2. Update selected material reference
    setSelectedMaterial((prev) => (prev ? { ...prev, inStock: calculatedNewStock } : null));

    // 3. Save to transaction history
    setRecentTransactions((prev) => [newTx, ...prev]);

    // 4. Trigger external props callback if provided
    if (onRecordTransaction) {
      onRecordTransaction(newTx);
    }
    if (onUpdateInventoryStock) {
      onUpdateInventoryStock(selectedMaterial.id, calculatedNewStock);
    }

    // 5. Reset quantity input
    setQuantity(1);
    setNotification({
      type: 'success',
      message: `Recorded ${transactionType} [${transactionNumber}]: ${quantity} ${unit} of ${selectedMaterial.code} (${selectedMaterial.name}). Linked to Central SKU ${linkedSku} & Batch ${batchLotNumber}. Total: Rs. ${formatLKR(totalAmount, false)}. New Available: ${calculatedNewStock} ${unit}.`
    });

    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'ALL') return recentTransactions;
    return recentTransactions.filter((tx) => tx.type === historyFilter);
  }, [recentTransactions, historyFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Inventory Portal</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Record Materials In & Out
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Select project, scan or search material, specify quantity, price and discount, and record movements in real time.
            </p>
          </div>

          {/* Transaction Type Indicator */}
          <div className="inline-flex h-9 p-0.5 bg-slate-100/90 rounded-lg border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setTransactionType('IN')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                transactionType === 'IN'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Inventory IN</span>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('OUT')}
              className={`px-3.5 h-full rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150 select-none ${
                transactionType === 'OUT'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Inventory OUT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Workflow Form */}
      <form onSubmit={handleSaveTransaction} className="space-y-5">
        {/* 1. TRANSACTION TYPE SELECTION */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-900">Transaction Type</h2>
            <span className="text-xs text-slate-500 font-normal">
              (Choose whether materials are entering or leaving inventory)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Inventory IN Option */}
            <button
              type="button"
              onClick={() => setTransactionType('IN')}
              className={`p-4 rounded-xl border-2 text-left flex items-start space-x-3 transition-all cursor-pointer ${
                transactionType === 'IN'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  transactionType === 'IN' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Inventory IN</span>
                  {transactionType === 'IN' && (
                    <span className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Materials entering inventory. Increases available stock quantity.
                </p>
              </div>
            </button>

            {/* Inventory OUT Option */}
            <button
              type="button"
              onClick={() => setTransactionType('OUT')}
              className={`p-4 rounded-xl border-2 text-left flex items-start space-x-3 transition-all cursor-pointer ${
                transactionType === 'OUT'
                  ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg ${
                  transactionType === 'OUT' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Inventory OUT</span>
                  {transactionType === 'OUT' && (
                    <span className="bg-rose-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Materials leaving inventory. Decreases available stock quantity.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. PROJECT SELECTION */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs" ref={projectDropdownRef}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-900">Project Selection</h2>
              <span className="text-xs text-slate-500 font-normal">
                (Select the relevant project or allocate to general inventory)
              </span>
            </div>

            {selectedProjectId !== 'none' && (
              <button
                type="button"
                onClick={() => setSelectedProjectId('none')}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to No Project</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Quick Option: No Project / General Inventory */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId('none');
                  setIsProjectDropdownOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  selectedProjectId === 'none'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>No Project / General Inventory</span>
                {selectedProjectId === 'none' && <Check className="w-3.5 h-3.5 ml-1" />}
              </button>

              <span className="text-xs text-slate-400 font-medium">— OR Search Project —</span>
            </div>

            {/* Project Search & Select Dropdown */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search project by code (e.g. PRJ-AERO-01), name, or client..."
                  value={projectSearchQuery}
                  onChange={(e) => {
                    setProjectSearchQuery(e.target.value);
                    setIsProjectDropdownOpen(true);
                  }}
                  onFocus={() => setIsProjectDropdownOpen(true)}
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
                {projectSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProjectSearchQuery('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Project Dropdown Results */}
              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div
                    onClick={() => {
                      setSelectedProjectId('none');
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`p-2.5 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                      selectedProjectId === 'none' ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-semibold">No Project / General Inventory</div>
                        <div className="text-[11px] text-slate-500">Unallocated general inventory stock</div>
                      </div>
                    </div>
                    {selectedProjectId === 'none' && <Check className="w-4 h-4 text-slate-900" />}
                  </div>

                  {filteredProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`p-2.5 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                        selectedProjectId === p.id ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-[#0077b6]" />
                        <div>
                          <div className="font-bold text-slate-900">{p.code}: {p.name}</div>
                          <div className="text-[11px] text-slate-500">Client: {p.clientName || 'Valued Client'} • Status: {p.status || 'Active'}</div>
                        </div>
                      </div>
                      {selectedProjectId === p.id && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                  ))}

                  {filteredProjects.length === 0 && (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      No matching projects found.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Currently Selected Project Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Selected Project:</span>
                {selectedProject ? (
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0077b6]" />
                    <span>{selectedProject.code} — {selectedProject.name}</span>
                  </span>
                ) : (
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>No Project / General Inventory</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. MATERIAL SELECTION & BARCODE SCANNING */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4" ref={materialDropdownRef}>
          {/* Header with Title and Mode Switch Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Material Selection & Barcode Scanning</h2>
                <p className="text-[11px] text-slate-500">
                  Switch between manual code typing and live camera barcode auto-detection.
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            {scanInputMode === 'MANUAL' ? (
              <button
                type="button"
                onClick={() => setScanInputMode('CAMERA')}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                title="Open camera to scan barcode"
              >
                <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scan Barcode (Camera)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setScanInputMode('MANUAL')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5 text-slate-600" />
                <span>Switch to Manual Input</span>
              </button>
            )}
          </div>

          {/* ON-SCREEN MODE TOGGLE: Switch between Manual Code Input and Camera Barcode Scanning */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200">
            <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setScanInputMode('MANUAL')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                  scanInputMode === 'MANUAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Manual Code Input</span>
              </button>
              <button
                type="button"
                onClick={() => setScanInputMode('CAMERA')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                  scanInputMode === 'CAMERA'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Barcode Scanner (Any Scanner / Camera / USB / BT)</span>
                <span className="bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Universal
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-500 px-1 flex items-center space-x-1.5">
              {scanInputMode === 'CAMERA' ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Supports any barcode scanner: live camera, USB/Bluetooth handheld gun, or photo file</span>
                </span>
              ) : (
                <span className="text-slate-500">
                  Type code, SKU, or search material name with instant lookup
                </span>
              )}
            </div>
          </div>

          {/* MODE 1: CAMERA-BASED BARCODE SCANNING */}
          {scanInputMode === 'CAMERA' && (
            <div className="space-y-3">
              <CameraBarcodeScanner
                materials={materials}
                autoStart={true}
                onBarcodeDetected={(code) => {
                  handleBarcodeLookup(code);
                }}
              />
            </div>
          )}

          {/* MODE 2: MANUAL CODE INPUT */}
          {scanInputMode === 'MANUAL' && (
            <div className="space-y-3">
              {/* Search Input for Material Name, Code, or Barcode */}
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    data-barcode-input="true"
                    id="inventory-lookup"
                    placeholder="Search Material Name (e.g. Aluminum), Code (e.g. MAT-ALU-6061-T6), or scan barcode..."
                    value={materialSearchQuery}
                    onChange={(e) => {
                      setMaterialSearchQuery(e.target.value);
                      setIsMaterialDropdownOpen(true);
                    }}
                    onFocus={() => setIsMaterialDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeLookup(materialSearchQuery);
                      }
                    }}
                    className="w-full pl-9 pr-24 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleBarcodeLookup(materialSearchQuery)}
                    className="absolute right-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold cursor-pointer shadow-2xs"
                  >
                    Lookup
                  </button>
                </div>

                {/* Material Dropdown Search Results */}
                {isMaterialDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filteredMaterials.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMaterial(m)}
                        className="p-3 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {m.code}
                            </span>
                            <span className="font-semibold text-slate-900">{m.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-3">
                            <span>Category: {m.category || 'General'}</span>
                            <span>•</span>
                            <span>Unit Price: ${m.retailPrice?.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-semibold text-slate-700">
                            {m.inStock} {m.unit || 'pcs'}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium">Available</span>
                        </div>
                      </div>
                    ))}

                    {filteredMaterials.length === 0 && (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        No materials found matching "{materialSearchQuery}".
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick-Pick Catalog Barcode Chips for instant testing */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sample Barcode Quick-Picks (Click to load):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {materials.slice(0, 5).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleBarcodeLookup(m.code)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md text-xs text-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <Barcode className="w-3 h-3 text-slate-500" />
                      <span className="font-mono font-bold text-slate-900">{m.code}</span>
                      <span className="text-slate-400 text-[10px]">({m.inStock} {m.unit})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feedback banner if barcode lookup produced a result */}
          {scanFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg font-medium flex items-center justify-between animate-fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scanFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setScanFeedback(null)}
                className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* DISPLAY SELECTED MATERIAL SPECIFICATION CARD */}
          {selectedMaterial ? (
            <div className="bg-emerald-50/50 border border-emerald-300 rounded-xl p-4 transition-all">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Selected Material Specification
                  </span>
                  <span className="bg-emerald-200/70 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Ready for Transaction
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* 1. Material Name */}
                <div className="md:col-span-2">
                  <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                    Material Name
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                    {selectedMaterial.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Category: <span className="text-slate-700 font-medium">{selectedMaterial.category || 'General'}</span>
                  </div>
                </div>

                {/* 2. Material Code & 3. Barcode */}
                <div>
                  <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">
                    Material Code & Barcode
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 mb-1.5">
                    {selectedMaterial.code}
                  </div>
                  {/* Visual Barcode Component */}
                  <BarcodeVisual code={selectedMaterial.code} />
                </div>

                {/* 4. Current Available Quantity */}
                <div className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs text-center md:text-right">
                  <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                    Current Available Quantity
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                    {selectedMaterial.inStock}
                    <span className="text-xs font-semibold text-slate-600 ml-1">
                      {selectedMaterial.unit || 'pcs'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Unit Price: Rs. {formatLKR(selectedMaterial.retailPrice || 0, false)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
              <Package className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-slate-700">No Material Selected Yet</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Use the on-screen toggle to type a code or open the live camera scanner to auto-detect a barcode.
              </div>
            </div>
          )}
        </div>

        {/* 4. TRANSACTION DETAILS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-sm font-bold text-slate-900">Transaction Details</h2>
            <span className="text-xs text-slate-500 font-normal">
              (Enter Quantity, Unit Price in LKR, and Discount)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity / Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity / Amount ({unit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  disabled={!selectedMaterial}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="absolute right-3 top-2 text-xs font-medium text-slate-400 uppercase">
                  {unit}
                </span>
              </div>
              {isStockInsufficient && (
                <div className="text-[11px] text-rose-600 font-medium mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Exceeds available stock ({currentAvailable} {unit})</span>
                </div>
              )}
            </div>

            {/* Price (LKR) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Price (LKR / Rs.) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-slate-500">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  disabled={!selectedMaterial}
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Catalog price: Rs. {formatLKR(selectedMaterial?.retailPrice || 0, false)}
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discount (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!selectedMaterial}
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full pl-3 pr-7 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">%</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Discount deduction: -Rs. {formatLKR(discountAmount, false)}
              </div>
            </div>
          </div>

          {/* 5. INVENTORY CALCULATION SUMMARY */}
          {selectedMaterial && (
            <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="px-2 py-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Subtotal</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">Rs. {formatLKR(subtotal, false)}</div>
                </div>

                <div className="px-2 py-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Discount ({discountPct}%)</div>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5">-Rs. {formatLKR(discountAmount, false)}</div>
                </div>

                <div className="px-2 py-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net Total (LKR)</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">Rs. {formatLKR(totalAmount, false)}</div>
                </div>

                <div className="px-2 py-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Stock Balance ({transactionType === 'IN' ? 'Increase' : 'Decrease'})
                  </div>
                  <div
                    className={`text-sm font-bold mt-0.5 flex items-center justify-center sm:justify-start space-x-1.5 ${
                      isStockInsufficient ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    <span>{currentAvailable}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-extrabold text-base underline decoration-2 decoration-emerald-500">
                      {newAvailable} {unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* CENTRAL DATABASE TRACEABILITY & UNIQUE IDENTIFIER LINKAGE */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Central Database Unique Number Linkage</span>
                    </span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Synchronized • LKR Standard</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Auto Txn Unique Ref</div>
                    <div className="font-mono text-xs font-bold text-emerald-400 mt-0.5">
                      {peekNextNumber(transactionType === 'IN' ? 'inventory_in' : 'inventory_out')}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Central Material Code</div>
                    <div className="font-mono text-xs font-bold text-cyan-300 mt-0.5 truncate">
                      {selectedMaterial.code}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Central Inventory SKU</div>
                    <div className="font-mono text-xs font-bold text-amber-300 mt-0.5 truncate">
                      {inventory?.find(i => i.materialId === selectedMaterial.id || i.sku === selectedMaterial.code)?.sku || `SKU-${selectedMaterial.code}`}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Batch / Lot Identifier</div>
                    <div className="font-mono text-xs font-bold text-indigo-300 mt-0.5">
                      {peekNextNumber('batch_lot')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAVE TRANSACTION ACTION */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              {selectedMaterial ? (
                <span>
                  Ready to record: <strong className="text-slate-900">{quantity} {unit}</strong> of{' '}
                  <strong className="text-slate-900">{selectedMaterial.code}</strong> for{' '}
                  <strong className="text-slate-900">
                    {selectedProject ? selectedProject.code : 'General Inventory'}
                  </strong>
                </span>
              ) : (
                <span className="text-slate-400">Select a material above to enable recording.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={!selectedMaterial || isStockInsufficient || quantity <= 0}
              className={`h-10 px-5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-2xs select-none ${
                !selectedMaterial || isStockInsufficient || quantity <= 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : transactionType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-700 active:scale-[0.98]'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-700 active:scale-[0.98]'
              }`}
            >
              {transactionType === 'IN' ? (
                <ArrowDownLeft className="w-4 h-4 stroke-[2.2]" />
              ) : (
                <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              )}
              <span>
                Record Inventory {transactionType} {quantity > 0 ? `(${transactionType === 'IN' ? '+' : '-'}${quantity} ${unit})` : ''}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* RECORDED INVENTORY TRANSACTIONS */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recorded Inventory Transactions
            </h3>
            <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {recentTransactions.length}
            </span>
          </div>

          <div className="inline-flex h-8 p-0.5 bg-slate-200/70 rounded-lg border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setHistoryFilter('ALL')}
              className={`px-3 h-full rounded-md text-xs font-medium cursor-pointer transition-all duration-150 select-none ${
                historyFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter('IN')}
              className={`px-3 h-full rounded-md text-xs font-medium cursor-pointer transition-all duration-150 select-none ${
                historyFilter === 'IN'
                  ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              IN Only
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter('OUT')}
              className={`px-3 h-full rounded-md text-xs font-medium cursor-pointer transition-all duration-150 select-none ${
                historyFilter === 'OUT'
                  ? 'bg-white text-rose-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OUT Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Unique Ref #</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Project / Supplier</th>
                <th className="py-2.5 px-3">Material & SKU</th>
                <th className="py-2.5 px-3">Batch / Lot</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Price (LKR)</th>
                <th className="py-2.5 px-3 text-right">Total (LKR)</th>
                <th className="py-2.5 px-3 text-right">Stock Flow</th>
                <th className="py-2.5 px-3 text-center">Traceability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                      {tx.transactionNumber || tx.id}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tx.type === 'IN'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {tx.type === 'IN' ? (
                        <ArrowDownLeft className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      <span>{tx.type}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                    <div className="font-semibold text-slate-900">{tx.date}</div>
                    <div className="text-[10px] text-slate-400">{tx.timestamp}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{tx.projectCode || 'GENERAL'}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                      {tx.supplierName || tx.projectName}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-mono font-bold text-slate-900">{tx.materialCode}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {tx.inventorySku || `SKU-${tx.materialCode}`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                      {tx.batchLotNumber || 'LOT-AUTO'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                    {tx.type === 'IN' ? '+' : '-'}{tx.quantity} {tx.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap font-mono text-[11px]">
                    Rs. {formatLKR(tx.price, false)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono text-xs">
                    Rs. {formatLKR(tx.totalAmount, false)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="text-slate-400">{tx.previousAvailableQuantity}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-slate-900">{tx.newAvailableQuantity}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setTraceabilityModalTx(tx)}
                      title="View Central Traceability Certificate & Unique Number Linkage"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded text-[11px] font-semibold border border-slate-300 cursor-pointer transition-colors shadow-2xs"
                    >
                      <FileText className="w-3 h-3 text-slate-700" />
                      <span>Slip</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-500 text-xs">
                    No transactions recorded yet for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CENTRAL DATABASE TRACEABILITY CERTIFICATE SLIP MODAL */}
      {traceabilityModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Central Database Traceability Slip
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {traceabilityModalTx.type === 'IN' ? 'Goods Received Note (GRN)' : 'Material Issue Note (MIN)'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Txn ID: {traceabilityModalTx.transactionNumber || traceabilityModalTx.id} • Currency: Sri Lanka Rupees (LKR)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTraceabilityModalTx(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Barcode & Status Banner */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <BarcodeVisual code={traceabilityModalTx.transactionNumber || traceabilityModalTx.materialCode} />
              </div>
              <div className="text-center sm:text-right space-y-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Recorded Date & Time</div>
                <div className="text-xs font-bold text-slate-900">{traceabilityModalTx.date} at {traceabilityModalTx.timestamp}</div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center sm:justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Static Persistent Database Certified
                </div>
              </div>
            </div>

            {/* Central Connected Keys Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-600" />
                Connected Central Database Unique Identifiers
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Transaction Ref #</span>
                  <span className="font-mono font-bold text-slate-900">{traceabilityModalTx.transactionNumber || traceabilityModalTx.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Central Material Code</span>
                  <span className="font-mono font-bold text-slate-900">{traceabilityModalTx.materialCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Inventory SKU</span>
                  <span className="font-mono font-bold text-slate-900">{traceabilityModalTx.inventorySku || `SKU-${traceabilityModalTx.materialCode}`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Unique Batch / Lot #</span>
                  <span className="font-mono font-bold text-slate-900">{traceabilityModalTx.batchLotNumber || 'LOT-AUTO-2026'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Project Allocation</span>
                  <span className="font-semibold text-slate-900 truncate block">{traceabilityModalTx.projectCode} - {traceabilityModalTx.projectName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Supplier / Vendor</span>
                  <span className="font-semibold text-slate-900 truncate block">{traceabilityModalTx.supplierName || 'Approved Catalog Supplier'}</span>
                </div>
              </div>
            </div>

            {/* Financials & Stock Ledgers in LKR */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price (LKR)</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Net Total (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{traceabilityModalTx.materialName}</div>
                      <div className="text-[10px] font-mono text-slate-500">ID: {traceabilityModalTx.materialId}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {traceabilityModalTx.quantity} {traceabilityModalTx.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                      Rs. {formatLKR(traceabilityModalTx.price, false)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                      {traceabilityModalTx.discount > 0 ? `${traceabilityModalTx.discount}%` : '0%'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700 font-mono text-sm whitespace-nowrap">
                      Rs. {formatLKR(traceabilityModalTx.totalAmount, false)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-slate-50 p-3 flex items-center justify-between text-xs border-t border-slate-200">
                <span className="text-slate-600">Stock Balance Transition:</span>
                <span className="font-semibold text-slate-900">
                  {traceabilityModalTx.previousAvailableQuantity} {traceabilityModalTx.unit} → <span className="font-bold text-emerald-700">{traceabilityModalTx.newAvailableQuantity} {traceabilityModalTx.unit}</span>
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-400">
                System Reference: REQ-{traceabilityModalTx.date.replace(/-/g, '')}-LKR
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setTraceabilityModalTx(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARCODE SCANNER MODAL */}
      {isBarcodeScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 rounded-xl max-w-lg w-full p-4 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">Camera Barcode Scanner & Auto-Detection</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBarcodeScannerOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CameraBarcodeScanner
              materials={materials}
              autoStart={true}
              onBarcodeDetected={(code) => {
                handleBarcodeLookup(code);
                setIsBarcodeScannerOpen(false);
              }}
              onClose={() => setIsBarcodeScannerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

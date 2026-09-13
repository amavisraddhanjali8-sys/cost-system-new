import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
  Database,
  History,
  Sparkles
} from 'lucide-react';
import {
  ImportEntityType,
  parseSpreadsheetFile,
  processMaterialsImport,
  processProduceImport,
  processSuppliersImport,
  processSubcontractorsImport,
  processOutsourcedImport,
  processInventoryImport,
  processPriceHistoryImport,
  downloadSampleTemplate,
  ParsedImportResult
} from '../utils/excelImport';
import {
  MaterialItem,
  ProduceItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  InventoryItem,
  PriceHistoryRecord
} from '../types';

interface DataImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: ImportEntityType;
  targetType?: ImportEntityType;
  categoryScope?: string;
  materials?: MaterialItem[];
  produceItems?: ProduceItem[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  onImportMaterials?: (items: Partial<MaterialItem>[]) => void;
  onImportProduce?: (items: Partial<ProduceItem>[]) => void;
  onImportSuppliers?: (items: Partial<Supplier>[]) => void;
  onImportSubcontractors?: (items: Partial<SubcontractorRateItem>[]) => void;
  onImportOutsourced?: (items: Partial<OutsourcedService>[]) => void;
  onImportInventory?: (items: Partial<InventoryItem>[]) => void;
  onImportPriceHistory?: (records: { itemCode: string; record: PriceHistoryRecord }[]) => void;
  onNotification?: (msg: string) => void;
}

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_CSV_SIZE_MB = 10;

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  isOpen,
  onClose,
  defaultEntity = 'materials',
  targetType,
  categoryScope,
  materials,
  produceItems,
  suppliers,
  subcontractors,
  outsourcedServices,
  onImportMaterials,
  onImportProduce,
  onImportSuppliers,
  onImportSubcontractors,
  onImportOutsourced,
  onImportInventory,
  onImportPriceHistory,
  onNotification
}) => {
  const initialEntity = targetType || defaultEntity;
  const [entityType, setEntityType] = useState<ImportEntityType>(initialEntity);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setEntityType(targetType || defaultEntity);
    setFile(null);
    setParsedResult(null);
    setErrorMsg(null);
  }, [defaultEntity, targetType, isOpen]);

  if (!isOpen) return null;

  const handleFileSelected = async (selectedFile: File) => {
    setErrorMsg(null);

    // Validate existence
    if (!selectedFile) return;

    // Strict 10MB device upload limit
    if (selectedFile.size > MAX_CSV_SIZE_BYTES) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(
        `File "${selectedFile.name}" (${sizeMb} MB) exceeds the 10 MB maximum limit. Please choose a CSV or spreadsheet up to 10 MB from your device.`
      );
      setFile(null);
      setParsedResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selectedFile.size === 0) {
      setErrorMsg(`File "${selectedFile.name}" is empty (0 bytes). Please upload a valid CSV or spreadsheet.`);
      setFile(null);
      setParsedResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const { rawRows } = await parseSpreadsheetFile(selectedFile);
      if (rawRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows.');
      }

      let res: ParsedImportResult;
      switch (entityType) {
        case 'materials':
          res = processMaterialsImport(rawRows);
          break;
        case 'produce':
          res = processProduceImport(rawRows);
          break;
        case 'suppliers':
          res = processSuppliersImport(rawRows);
          break;
        case 'subcontractors':
          res = processSubcontractorsImport(rawRows);
          break;
        case 'outsourced':
          res = processOutsourcedImport(rawRows);
          break;
        case 'inventory':
          res = processInventoryImport(rawRows);
          break;
        case 'price_history':
          res = processPriceHistoryImport(rawRows);
          break;
        default:
          res = processMaterialsImport(rawRows);
      }

      if (!res.success || res.validRows.length === 0) {
        throw new Error(
          res.errors[0] || 'Unable to parse valid records. Please verify column headers against the template.'
        );
      }

      setParsedResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file. Please upload a valid Excel or CSV file.');
      setParsedResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelected(droppedFile);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.validRows.length === 0) return;

    try {
      switch (entityType) {
        case 'materials':
          onImportMaterials?.(parsedResult.validRows);
          break;
        case 'produce':
          onImportProduce?.(parsedResult.validRows);
          break;
        case 'suppliers':
          onImportSuppliers?.(parsedResult.validRows);
          break;
        case 'subcontractors':
          onImportSubcontractors?.(parsedResult.validRows);
          break;
        case 'outsourced':
          onImportOutsourced?.(parsedResult.validRows);
          break;
        case 'inventory':
          onImportInventory?.(parsedResult.validRows);
          break;
        case 'price_history':
          onImportPriceHistory?.(parsedResult.validRows);
          break;
      }

      const count = parsedResult.validRows.length;
      const entityLabel = entityType.replace('_', ' ').toUpperCase();
      const msg = `Successfully imported ${count} ${entityLabel} records into the system catalog!`;
      onNotification?.(msg);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving imported records.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="bg-[#003049] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Excel & CSV Batch Data Import Wizard</span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-sky-900/60 rounded text-sky-200 border border-sky-700/50">
                  XLSX / XLS / CSV
                </span>
              </h2>
              <p className="text-xs text-sky-200 mt-0.5">
                Import categories, items, inventory records, and price history audit trails seamlessly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Target Entity Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Target Portal & Data Entity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'materials', label: 'Materials Catalog', icon: Layers },
                { id: 'produce', label: 'Produced Products', icon: Sparkles },
                { id: 'suppliers', label: 'Suppliers Directory', icon: Database },
                { id: 'subcontractors', label: 'Subcontractors', icon: FileText },
                { id: 'outsourced', label: 'Outsourced Services', icon: Database },
                { id: 'inventory', label: 'Inventory Stock', icon: Layers },
                { id: 'price_history', label: 'Price History Logs', icon: History }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = entityType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEntityType(item.id as ImportEntityType);
                      setParsedResult(null);
                      setFile(null);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0077b6] bg-blue-50/70 text-[#0077b6] font-semibold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#0077b6]' : 'text-slate-400'}`} />
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Download Sample Template */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Need a formatted template?</div>
              <div className="text-[11px] text-slate-500">
                Download a pre-configured starter spreadsheet with correct headers and demo data.
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadSampleTemplate(entityType, 'csv')}
                className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Sample CSV</span>
              </button>
              <button
                type="button"
                onClick={() => downloadSampleTemplate(entityType, 'xlsx')}
                className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Sample Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* 3. Drop Zone / Device File Uploader */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-[#0077b6]" />
                <span>Upload from Device</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                Max 10 MB limit • CSV / XLSX
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#0077b6] bg-blue-50/50 scale-[0.99]'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`p-3 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#0077b6]'}`}>
                  {file ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    {file ? file.name : 'Choose CSV or Excel file from your device'}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {file ? (
                      <span className="text-emerald-700 font-medium">
                        {(file.size / 1024).toFixed(1)} KB (within 10 MB limit) • Ready to import
                      </span>
                    ) : (
                      'Drag & drop files here or click to browse device files'
                    )}
                  </p>
                </div>

                {!file && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-2 px-3.5 py-1.5 text-xs font-semibold bg-[#0077b6] hover:bg-[#005f94] text-white rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span>Browse Device Files</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Import Warning: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedResult && parsedResult.validRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Validation Ready: {parsedResult.validRows.length} of {parsedResult.totalRows} records parsed
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Previewing first 5 rows</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Row</th>
                      {entityType === 'materials' && (
                        <>
                          <th className="py-2 px-3 font-semibold">Code</th>
                          <th className="py-2 px-3 font-semibold">Name</th>
                          <th className="py-2 px-3 font-semibold">Category</th>
                          <th className="py-2 px-3 font-semibold text-right">Rate ($)</th>
                          <th className="py-2 px-3 font-semibold text-right">In Stock</th>
                        </>
                      )}
                      {entityType === 'produce' && (
                        <>
                          <th className="py-2 px-3 font-semibold">Code</th>
                          <th className="py-2 px-3 font-semibold">Name</th>
                          <th className="py-2 px-3 font-semibold">Category</th>
                          <th className="py-2 px-3 font-semibold text-right">Cost ($)</th>
                          <th className="py-2 px-3 font-semibold text-right">Retail ($)</th>
                        </>
                      )}
                      {entityType === 'suppliers' && (
                        <>
                          <th className="py-2 px-3 font-semibold">Company Name</th>
                          <th className="py-2 px-3 font-semibold">Category</th>
                          <th className="py-2 px-3 font-semibold">Email</th>
                          <th className="py-2 px-3 font-semibold">Country</th>
                          <th className="py-2 px-3 font-semibold text-right">Rating</th>
                        </>
                      )}
                      {entityType === 'subcontractors' && (
                        <>
                          <th className="py-2 px-3 font-semibold">Code</th>
                          <th className="py-2 px-3 font-semibold">Service Name</th>
                          <th className="py-2 px-3 font-semibold">Firm</th>
                          <th className="py-2 px-3 font-semibold text-right">Rate ($/hr)</th>
                        </>
                      )}
                      {entityType === 'outsourced' && (
                        <>
                          <th className="py-2 px-3 font-semibold">Code</th>
                          <th className="py-2 px-3 font-semibold">Service Name</th>
                          <th className="py-2 px-3 font-semibold">Provider</th>
                          <th className="py-2 px-3 font-semibold text-right">Rate ($)</th>
                        </>
                      )}
                      {entityType === 'inventory' && (
                        <>
                          <th className="py-2 px-3 font-semibold">SKU</th>
                          <th className="py-2 px-3 font-semibold">Item Name</th>
                          <th className="py-2 px-3 font-semibold text-right">Stock</th>
                          <th className="py-2 px-3 font-semibold text-right">Cost ($)</th>
                        </>
                      )}
                      {entityType === 'price_history' && (
                        <>
                          <th className="py-2 px-3 font-semibold">Item Code</th>
                          <th className="py-2 px-3 font-semibold">Date</th>
                          <th className="py-2 px-3 font-semibold text-right">Prev ($)</th>
                          <th className="py-2 px-3 font-semibold text-right">New ($)</th>
                          <th className="py-2 px-3 font-semibold">Reason</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedResult.samplePreview.map((r: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        {entityType === 'materials' && (
                          <>
                            <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.code}</td>
                            <td className="py-1.5 px-3 text-slate-800 font-medium truncate max-w-xs">{r.name}</td>
                            <td className="py-1.5 px-3 text-slate-600 truncate">{r.category}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold">${r.retailPrice}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{r.inStock}</td>
                          </>
                        )}
                        {entityType === 'produce' && (
                          <>
                            <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.code}</td>
                            <td className="py-1.5 px-3 text-slate-800 font-medium truncate max-w-xs">{r.name}</td>
                            <td className="py-1.5 px-3 text-slate-600 truncate">{r.category}</td>
                            <td className="py-1.5 px-3 text-right font-mono">${r.costPrice}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">${r.retailPrice}</td>
                          </>
                        )}
                        {entityType === 'suppliers' && (
                          <>
                            <td className="py-1.5 px-3 font-bold text-slate-800">{r.name}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.category}</td>
                            <td className="py-1.5 px-3 text-slate-500">{r.email}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.country}</td>
                            <td className="py-1.5 px-3 text-right font-bold text-amber-600">{r.rating} ★</td>
                          </>
                        )}
                        {entityType === 'subcontractors' && (
                          <>
                            <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.code}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-800">{r.name}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.subcontractorName}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold">${r.baseRate}</td>
                          </>
                        )}
                        {entityType === 'outsourced' && (
                          <>
                            <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.code}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-800">{r.name}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.providerName}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold">${r.rate}</td>
                          </>
                        )}
                        {entityType === 'inventory' && (
                          <>
                            <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.sku}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-800">{r.itemName}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{r.onHand}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold">${r.unitCost}</td>
                          </>
                        )}
                        {entityType === 'price_history' && (
                          <>
                            <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.itemCode}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.record?.date}</td>
                            <td className="py-1.5 px-3 text-right font-mono line-through text-slate-400">${r.record?.previousPrice}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">${r.record?.newPrice}</td>
                            <td className="py-1.5 px-3 text-slate-600 truncate max-w-xs">{r.record?.reason}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {parsedResult ? `${parsedResult.validRows.length} valid rows detected` : 'No file selected'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parsedResult || parsedResult.validRows.length === 0}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                parsedResult && parsedResult.validRows.length > 0
                  ? 'bg-[#0077b6] hover:bg-[#005f94] text-white shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Confirm & Import Records</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Package,
  Wrench,
  CheckCircle2,
  DollarSign,
  Percent,
  Layers,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { ProduceItem, ProjectDeliverableItem } from '../../types';

interface QuickInsertDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  produceItems: ProduceItem[];
  onAddDeliverable: (deliverable: ProjectDeliverableItem) => void;
  onAddProduceItem?: (item: ProduceItem) => void;
}

export const QuickInsertDeliverableModal: React.FC<QuickInsertDeliverableModalProps> = ({
  isOpen,
  onClose,
  produceItems,
  onAddDeliverable,
  onAddProduceItem
}) => {
  const [activeMode, setActiveMode] = useState<'database' | 'scratch'>('database');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'service'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduceId, setSelectedProduceId] = useState<string>('');

  // Selected item customization
  const [quantity, setQuantity] = useState<number>(1);
  const [customQuotedPrice, setCustomQuotedPrice] = useState<number>(0);
  const [customCostPrice, setCustomCostPrice] = useState<number>(0);
  const [status, setStatus] = useState<'Planned' | 'In Assembly' | 'Completed'>('Planned');

  // Scratch form state
  const [scratchName, setScratchName] = useState('');
  const [scratchCode, setScratchCode] = useState('');
  const [scratchType, setScratchType] = useState<'product' | 'service'>('product');
  const [scratchCategory, setScratchCategory] = useState('Industrial Automation & Heavy Machinery');
  const [scratchSubCategory, setScratchSubCategory] = useState('Custom Aerospace Engineering');
  const [scratchDescription, setScratchDescription] = useState('');
  const [scratchUnit, setScratchUnit] = useState('unit');
  const [scratchCostPrice, setScratchCostPrice] = useState<number>(50000);
  const [scratchQuotedPrice, setScratchQuotedPrice] = useState<number>(75000);
  const [scratchLeadTime, setScratchLeadTime] = useState<number>(30);
  const [saveToMasterCatalog, setSaveToMasterCatalog] = useState(true);

  // Filtered items from database
  const filteredDatabaseItems = useMemo(() => {
    return produceItems.filter(item => {
      const matchType = filterType === 'all' || item.type === filterType;
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [produceItems, filterType, searchQuery]);

  // Handle item selection
  const handleSelectProduceItem = (item: ProduceItem) => {
    setSelectedProduceId(item.id);
    setCustomQuotedPrice(item.retailPrice);
    setCustomCostPrice(item.costPrice);
  };

  const selectedProduceItem = useMemo(() => {
    return produceItems.find(p => p.id === selectedProduceId) || null;
  }, [produceItems, selectedProduceId]);

  // Live margin calculation
  const liveMarginPct = useMemo(() => {
    if (customQuotedPrice <= 0) return 0;
    return (((customQuotedPrice - customCostPrice) / customQuotedPrice) * 100);
  }, [customQuotedPrice, customCostPrice]);

  const scratchMarginPct = useMemo(() => {
    if (scratchQuotedPrice <= 0) return 0;
    return (((scratchQuotedPrice - scratchCostPrice) / scratchQuotedPrice) * 100);
  }, [scratchQuotedPrice, scratchCostPrice]);

  // Insert from Database
  const handleInsertFromDatabase = () => {
    if (!selectedProduceItem) return;

    const unitRev = customQuotedPrice;
    const unitCost = customCostPrice;
    const totRev = unitRev * quantity;
    const totCost = unitCost * quantity;
    const margin = totRev > 0 ? ((totRev - totCost) / totRev) * 100 : 0;

    const newDeliverable: ProjectDeliverableItem = {
      id: `deliv-${Date.now()}`,
      code: selectedProduceItem.code,
      name: selectedProduceItem.name,
      type: selectedProduceItem.type,
      category: selectedProduceItem.category,
      subCategory: selectedProduceItem.subCategory,
      description: selectedProduceItem.description,
      quantity,
      unit: selectedProduceItem.unit,
      costPrice: unitCost,
      quotedPrice: unitRev,
      totalRevenue: totRev,
      totalCost: totCost,
      marginPct: Number(margin.toFixed(1)),
      leadTimeDays: selectedProduceItem.leadTimeDays,
      status
    };

    onAddDeliverable(newDeliverable);
    onClose();
  };

  // Insert from Scratch
  const handleInsertFromScratch = () => {
    if (!scratchName) return;

    const code = scratchCode || (scratchType === 'product' ? `PRD-${Date.now().toString().slice(-4)}` : `SRV-${Date.now().toString().slice(-4)}`);
    const totRev = scratchQuotedPrice * quantity;
    const totCost = scratchCostPrice * quantity;
    const margin = totRev > 0 ? ((totRev - totCost) / totRev) * 100 : 0;

    const newDeliverable: ProjectDeliverableItem = {
      id: `deliv-${Date.now()}`,
      code,
      name: scratchName,
      type: scratchType,
      category: scratchCategory,
      subCategory: scratchSubCategory,
      description: scratchDescription,
      quantity,
      unit: scratchUnit,
      costPrice: scratchCostPrice,
      quotedPrice: scratchQuotedPrice,
      totalRevenue: totRev,
      totalCost: totCost,
      marginPct: Number(margin.toFixed(1)),
      leadTimeDays: scratchLeadTime,
      status
    };

    if (saveToMasterCatalog && onAddProduceItem) {
      const catalogItem: ProduceItem = {
        id: `prod-${Date.now()}`,
        code,
        name: scratchName,
        type: scratchType,
        category: scratchCategory,
        subCategory: scratchSubCategory,
        moreSubCategory: scratchSubCategory || scratchCategory,
        description: scratchDescription,
        unit: scratchUnit,
        costPrice: scratchCostPrice,
        retailPrice: scratchQuotedPrice,
        defaultDiscountPct: 5,
        bundlesAndRanges: [],
        leadTimeDays: scratchLeadTime,
        status: 'Active',
        priceHistory: [],
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      onAddProduceItem(catalogItem);
    }

    onAddDeliverable(newDeliverable);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#003049] text-white px-4 py-3 flex items-center justify-between border-b border-[#002235]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#fdf0d5] flex items-center justify-center text-[#003049]">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-normal text-[#fdf0d5]">Quick Insert Project Deliverable</h3>
                <span className="bg-[#669bbc] text-white text-[10px] px-1.5 py-0.2 rounded font-normal uppercase">
                  Product &amp; Service
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Add manufactured products and contracted delivered services to the project scope.
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

        {/* Mode Selector Tabs */}
        <div className="bg-[#fdf0d5]/60 border-b border-[#ecd5a8] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveMode('database')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-normal transition-colors ${
                activeMode === 'database'
                  ? 'bg-[#003049] text-white shadow-2xs'
                  : 'text-[#003049] hover:bg-[#ecd5a8]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Select from Master Catalog Database</span>
            </button>
            <button
              onClick={() => setActiveMode('scratch')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-normal transition-colors ${
                activeMode === 'scratch'
                  ? 'bg-[#003049] text-white shadow-2xs'
                  : 'text-[#003049] hover:bg-[#ecd5a8]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c1121f]" />
              <span>Create New Deliverable from Scratch</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeMode === 'database' ? (
            /* MODE 1: SELECT FROM DATABASE */
            <div className="space-y-3">
              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search product models, robotic cells, service scopes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2 py-1 rounded text-[11px] font-normal transition-colors ${
                      filterType === 'all' ? 'bg-[#003049] text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setFilterType('product')}
                    className={`px-2 py-1 rounded text-[11px] font-normal transition-colors ${
                      filterType === 'product' ? 'bg-[#003049] text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Products Only
                  </button>
                  <button
                    onClick={() => setFilterType('service')}
                    className={`px-2 py-1 rounded text-[11px] font-normal transition-colors ${
                      filterType === 'service' ? 'bg-[#003049] text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Services Only
                  </button>
                </div>
              </div>

              {/* Items List Grid */}
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredDatabaseItems.map(item => {
                  const isSelected = selectedProduceId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectProduceItem(item)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
                        isSelected
                          ? 'bg-[#003049]/5 border-[#003049] ring-2 ring-[#003049]'
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-slate-500 uppercase">{item.code}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-normal uppercase ${
                              item.type === 'product'
                                ? 'bg-[#003049] text-white'
                                : 'bg-[#669bbc] text-white'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-[10px] text-slate-500">{item.category}</span>
                        </div>
                        <h5 className="text-xs font-normal text-slate-900 mt-0.5">{item.name}</h5>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                        )}
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-normal text-[#003049]">
                          Quoted: ${item.retailPrice.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Cost: ${item.costPrice.toLocaleString()} ({(((item.retailPrice - item.costPrice) / item.retailPrice) * 100).toFixed(0)}% margin)
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center mt-0.5">
                          <Clock className="w-3 h-3 mr-0.5" />
                          {item.leadTimeDays}d lead time
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Item Customization Form */}
              {selectedProduceItem && (
                <div className="bg-[#fdf0d5]/40 border border-[#ecd5a8] rounded-xl p-3 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#ecd5a8] pb-1.5">
                    <div className="text-xs font-normal text-[#003049]">
                      Configure Deliverable: <span className="font-normal">{selectedProduceItem.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Standard Unit: {selectedProduceItem.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-700 font-normal mb-1">
                        Quantity ({selectedProduceItem.unit})
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-700 font-normal mb-1">
                        Unit Quoted Price ($)
                      </label>
                      <input
                        type="number"
                        value={customQuotedPrice}
                        onChange={e => setCustomQuotedPrice(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-700 font-normal mb-1">
                        Internal Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        value={customCostPrice}
                        onChange={e => setCustomCostPrice(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-700 font-normal mb-1">
                        Project Status
                      </label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                      >
                        <option value="Planned">Planned</option>
                        <option value="In Assembly">In Assembly</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary & Insert Button */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#ecd5a8] gap-2">
                    <div className="flex items-center space-x-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px]">Total Revenue:</span>{' '}
                        <span className="font-normal text-[#003049]">
                          ${(customQuotedPrice * quantity).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Total Cost:</span>{' '}
                        <span className="font-normal text-slate-700">
                          ${(customCostPrice * quantity).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Est. Margin:</span>{' '}
                        <span className="font-normal text-[#c1121f]">{liveMarginPct.toFixed(1)}%</span>
                      </div>
                    </div>

                    <button
                      onClick={handleInsertFromDatabase}
                      className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
                      <span>Insert Deliverable into Project</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* MODE 2: CREATE FROM SCRATCH */
            <div className="space-y-3">
              <div className="bg-[#fdf0d5]/30 border border-[#ecd5a8] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#ecd5a8] pb-2">
                  <h4 className="text-xs font-normal text-[#003049] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c1121f]" />
                    <span>Create Custom Product or Service Item from Scratch</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] text-slate-700 font-normal">Classification:</label>
                    <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-300 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setScratchType('product');
                          setScratchUnit('unit');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-normal uppercase transition-colors ${
                          scratchType === 'product' ? 'bg-[#003049] text-white' : 'text-slate-600'
                        }`}
                      >
                        Product
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScratchType('service');
                          setScratchUnit('hrs');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-normal uppercase transition-colors ${
                          scratchType === 'service' ? 'bg-[#669bbc] text-white' : 'text-slate-600'
                        }`}
                      >
                        Service
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">
                      {scratchType === 'product' ? 'Product Name *' : 'Service Name *'}
                    </label>
                    <input
                      type="text"
                      placeholder={scratchType === 'product' ? 'e.g. Turnkey Robotic Weld Positioner 3-Axis' : 'e.g. On-Site ISO 17025 Vibration Testing & Dynamic Balancing'}
                      value={scratchName}
                      onChange={e => setNewScratchTitle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">Product/Service Code</label>
                    <input
                      type="text"
                      placeholder={scratchType === 'product' ? 'PRD-ROB-01' : 'SRV-VIB-01'}
                      value={scratchCode}
                      onChange={e => setScratchCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">Category</label>
                    <input
                      type="text"
                      value={scratchCategory}
                      onChange={e => setScratchCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">Sub-Category</label>
                    <input
                      type="text"
                      value={scratchSubCategory}
                      onChange={e => setScratchSubCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">
                      Technical Scope &amp; Deliverables Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Specify deliverables scope, engineering tolerances, SLA conditions, or equipment specifications..."
                      value={scratchDescription}
                      onChange={e => setScratchDescription(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={scratchUnit}
                      onChange={e => setScratchUnit(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">Estimated Lead Time (Days)</label>
                    <input
                      type="number"
                      value={scratchLeadTime}
                      onChange={e => setScratchLeadTime(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">Internal Cost Price ($)</label>
                    <input
                      type="number"
                      value={scratchCostPrice}
                      onChange={e => setScratchCostPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-normal mb-1">
                      Quoted Selling Price to Client ($)
                    </label>
                    <input
                      type="number"
                      value={scratchQuotedPrice}
                      onChange={e => setScratchQuotedPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                </div>

                {/* Live Margin Indicator */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 text-[11px]">Gross Margin on this Deliverable:</span>
                  <span className="font-normal text-[#003049] flex items-center space-x-1">
                    <span className="text-sm font-normal text-[#c1121f]">{scratchMarginPct.toFixed(1)}%</span>
                    <span className="text-[10px] text-slate-500">
                      (${(scratchQuotedPrice - scratchCostPrice).toLocaleString()} profit per {scratchUnit})
                    </span>
                  </span>
                </div>

                {/* Master Catalog Checkbox */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveMasterCatalog"
                    checked={saveToMasterCatalog}
                    onChange={e => setSaveToMasterCatalog(e.target.checked)}
                    className="rounded text-[#003049] focus:ring-[#003049]"
                  />
                  <label htmlFor="saveMasterCatalog" className="text-[11px] text-slate-700 cursor-pointer">
                    Also register this item into the enterprise master Product &amp; Services Catalog database
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleInsertFromScratch}
                    disabled={!scratchName}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
                    <span>Create &amp; Insert into Project Deliverables</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function setNewScratchTitle(title: string) {
    setScratchName(title);
    if (!scratchCode) {
      const prefix = scratchType === 'product' ? 'PRD' : 'SRV';
      const clean = title.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      setScratchCode(`${prefix}-${clean}-${Math.floor(100 + Math.random() * 900)}`);
    }
  }
};

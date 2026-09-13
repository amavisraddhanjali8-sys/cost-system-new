import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Layers,
  Zap,
  BarChart3,
  Plus,
  Package,
  Wrench,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { Project, ProjectDeliverableItem, ProduceItem } from '../../types';
import { QuickInsertDeliverableModal } from './QuickInsertDeliverableModal';

interface ProjectDashboardTabProps {
  project: Project;
  produceItems: ProduceItem[];
  onUpdateProject: (updatedProject: Project) => void;
  onAddProduceItem?: (item: ProduceItem) => void;
}

const PALETTE = {
  maroon: '#780000',
  crimson: '#c1121f',
  cream: '#fdf0d5',
  navy: '#003049',
  steel: '#669bbc'
};

export const ProjectDashboardTab: React.FC<ProjectDashboardTabProps> = ({
  project,
  produceItems,
  onUpdateProject,
  onAddProduceItem
}) => {
  const [isQuickInsertModalOpen, setIsQuickInsertModalOpen] = useState(false);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editQuotedPrice, setEditQuotedPrice] = useState<number>(0);

  const analytics = project.analytics;
  const revenue = project.quotedPrice || 0;
  const materialCost = analytics?.materialCost || 0;
  const subcontractorCost = analytics?.subcontractorCost || 0;
  const outsourcedCost = analytics?.outsourcedCost || 0;
  const directCost = analytics?.totalDirectCost || (materialCost + subcontractorCost + outsourcedCost);
  const overheadAndContingency = (analytics?.overheadAmount || 0) + (analytics?.contingencyAmount || 0);
  const totalCost = analytics?.totalProjectCost || (directCost + overheadAndContingency);
  const grossProfit = analytics?.grossProfit || (revenue - directCost);
  const grossMarginPct = analytics?.grossMarginPct || (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
  const netProfit = analytics?.netProfit || (revenue - totalCost);
  const netMarginPct = analytics?.netMarginPct || (revenue > 0 ? (netProfit / revenue) * 100 : 0);
  const healthScore = analytics?.healthScore ?? 85;

  const costDistributionData = [
    { name: 'Materials', value: materialCost, color: PALETTE.navy },
    { name: 'Subcontractor Labour', value: subcontractorCost, color: PALETTE.steel },
    { name: 'Outsourced Services', value: outsourcedCost, color: PALETTE.crimson },
    { name: 'Overhead & Contingency', value: overheadAndContingency, color: PALETTE.maroon }
  ].filter(d => d.value > 0);

  const phaseBarData = (project.phases || []).map((phase) => {
    return {
      name: phase.name.split(':')[0],
      Budget: phase.budget,
      Actual: phase.actualCost,
      Variance: phase.budget - phase.actualCost
    };
  });

  const deliverables = project.deliverables || [];

  // Deliverables financial summary
  const deliverablesSummary = React.useMemo(() => {
    const totalRev = deliverables.reduce((sum, d) => sum + (d.totalRevenue || 0), 0);
    const totalCst = deliverables.reduce((sum, d) => sum + (d.totalCost || 0), 0);
    const profit = totalRev - totalCst;
    const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;
    const productCount = deliverables.filter(d => d.type === 'product').length;
    const serviceCount = deliverables.filter(d => d.type === 'service').length;
    return {
      totalRev,
      totalCst,
      profit,
      margin,
      productCount,
      serviceCount,
      totalCount: deliverables.length
    };
  }, [deliverables]);

  // Handle adding deliverable
  const handleAddDeliverable = (item: ProjectDeliverableItem) => {
    const updatedDeliverables = [...deliverables, item];
    const updatedQuotedPrice = updatedDeliverables.reduce((sum, d) => sum + d.totalRevenue, 0);

    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables,
      quotedPrice: updatedQuotedPrice > 0 ? updatedQuotedPrice : project.quotedPrice
    });
  };

  // Handle removing deliverable
  const handleRemoveDeliverable = (id: string) => {
    const updatedDeliverables = deliverables.filter(d => d.id !== id);
    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables
    });
  };

  // Handle start edit
  const handleStartEdit = (d: ProjectDeliverableItem) => {
    setEditingDeliverableId(d.id);
    setEditQty(d.quantity);
    setEditQuotedPrice(d.quotedPrice);
  };

  // Handle save edit
  const handleSaveEdit = (id: string) => {
    const updatedDeliverables = deliverables.map(d => {
      if (d.id === id) {
        const totRev = editQuotedPrice * editQty;
        const totCost = d.costPrice * editQty;
        const margin = totRev > 0 ? ((totRev - totCost) / totRev) * 100 : 0;
        return {
          ...d,
          quantity: editQty,
          quotedPrice: editQuotedPrice,
          totalRevenue: totRev,
          totalCost: totCost,
          marginPct: Number(margin.toFixed(1))
        };
      }
      return d;
    });

    setEditingDeliverableId(null);
    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Quoted Revenue Tile */}
        <div className="bg-[#003049] text-white p-3 rounded-xl shadow-sm relative overflow-hidden border border-[#002235]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal text-[#fdf0d5] uppercase tracking-wide">Quoted Revenue</span>
            <DollarSign className="w-3.5 h-3.5 text-[#fdf0d5]" />
          </div>
          <div className="text-xl font-normal text-white mt-1">${revenue.toLocaleString()}</div>
          <div className="flex items-center space-x-1 text-[10px] text-[#fdf0d5] mt-1.5 opacity-90">
            <CheckCircle className="w-3 h-3 text-[#669bbc]" />
            <span>Contract Agreed Price</span>
          </div>
        </div>

        {/* Total Project Cost Tile */}
        <div className="bg-[#780000] text-white p-3 rounded-xl shadow-sm relative overflow-hidden border border-[#5c0000]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal text-[#fdf0d5] uppercase tracking-wide">Total Project Cost</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#fdf0d5]" />
          </div>
          <div className="text-xl font-normal text-white mt-1">
            ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-[#fdf0d5] mt-1.5 flex items-center justify-between opacity-90">
            <span>Direct: ${directCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>Overhead: ${overheadAndContingency.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Est. Gross Margin Tile */}
        <div className="bg-[#669bbc] text-white p-3 rounded-xl shadow-sm relative overflow-hidden border border-[#4e82a3]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal text-[#003049] uppercase tracking-wide">Est. Gross Margin</span>
            <Percent className="w-3.5 h-3.5 text-[#003049]" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <div className="text-xl font-normal text-[#003049]">{grossMarginPct.toFixed(1)}%</div>
            <span className="text-[10px] text-white">Target: {project.targetMarginPct}%</span>
          </div>
          <div className="flex items-center space-x-1 text-[10px] mt-1.5 text-[#003049]">
            {grossMarginPct >= project.targetMarginPct ? (
              <span className="flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                +{(grossMarginPct - project.targetMarginPct).toFixed(1)}% above target
              </span>
            ) : (
              <span className="flex items-center text-[#780000]">
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                {(grossMarginPct - project.targetMarginPct).toFixed(1)}% below target
              </span>
            )}
          </div>
        </div>

        {/* Profitability Health Score Tile */}
        <div className="bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8] p-3 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-normal text-[#780000] uppercase tracking-wide">Profit Health Index</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#780000]" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <div className="text-xl font-normal text-[#003049]">{healthScore}</div>
            <span className="text-[10px] text-slate-600">/ 100 max</span>
          </div>
          <div className="w-full bg-[#ebd6b0] rounded-full h-1 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-[#003049]" style={{ width: `${healthScore}%` }} />
          </div>
        </div>
      </div>

      {/* 2. VISUAL ANALYTICS GRID (PIE & BAR CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Cost Distribution Breakdown */}
        <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-normal text-[#003049] uppercase tracking-wide flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#003049]" />
                <span>Cost Component Distribution</span>
              </h3>
              <span className="text-[10px] text-slate-500">Real-time</span>
            </div>

            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {costDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Cost']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-200 text-xs">
            <div className="flex items-center space-x-1.5 bg-[#fdf0d5]/50 p-1.5 rounded-lg border border-[#ecd5a8]">
              <div className="w-2 h-2 rounded-full bg-[#003049]" />
              <div>
                <p className="text-slate-600 text-[9px]">Materials</p>
                <p className="font-normal text-slate-900">${materialCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#fdf0d5]/50 p-1.5 rounded-lg border border-[#ecd5a8]">
              <div className="w-2 h-2 rounded-full bg-[#669bbc]" />
              <div>
                <p className="text-slate-600 text-[9px]">Subcontractors</p>
                <p className="font-normal text-slate-900">${subcontractorCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#fdf0d5]/50 p-1.5 rounded-lg border border-[#ecd5a8]">
              <div className="w-2 h-2 rounded-full bg-[#c1121f]" />
              <div>
                <p className="text-slate-600 text-[9px]">Outsourced</p>
                <p className="font-normal text-slate-900">${outsourcedCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#fdf0d5]/50 p-1.5 rounded-lg border border-[#ecd5a8]">
              <div className="w-2 h-2 rounded-full bg-[#780000]" />
              <div>
                <p className="text-slate-600 text-[9px]">Overheads</p>
                <p className="font-normal text-slate-900">${overheadAndContingency.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Budget vs Actual Variance Chart */}
        <div className="lg:col-span-7 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-normal text-[#003049] uppercase tracking-wide flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#003049]" />
                <span>Multi-Phase Budget vs Actual Spend</span>
              </h3>
              <span className="text-[10px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded border border-[#ecd5a8]">
                Audited
              </span>
            </div>

            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseBarData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#0f172a'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Bar dataKey="Budget" fill="#003049" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Actual" fill="#669bbc" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-2 bg-[#fdf0d5]/40 rounded-lg border border-[#ecd5a8] mt-2 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-[#c1121f]" />
              <span className="text-slate-700">Phases remain within planned budget thresholds</span>
            </div>
            <span className="text-[#003049] text-[11px] font-normal">+6.8% Safety Buffer</span>
          </div>
        </div>
      </div>

      {/* 3. PYTHON SENSITIVITY SIMULATION CARDS */}
      {analytics?.sensitivity && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-xs font-normal text-[#003049] uppercase tracking-wide flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#c1121f]" />
              <span>Python Sensitivity &amp; Inflation Stress-Testing</span>
            </h3>
            <span className="text-[10px] text-[#780000] bg-[#fdf0d5] px-2 py-0.5 rounded border border-[#ecd5a8]">
              Shock Test
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2.5 text-xs">
            <div className="bg-[#fdf0d5]/40 p-2.5 rounded-lg border border-[#ecd5a8]">
              <div className="flex items-center justify-between">
                <span className="font-normal text-[#003049]">Scenario A: +5% Raw Material Inflation</span>
                <span className="text-[#c1121f] font-normal">
                  +${analytics.sensitivity.materialInflation5Pct.costImpact.toLocaleString()} Cost
                </span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Surges across aerospace titanium, nickel alloys, and structural metals.
              </p>
              <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#ecd5a8]">
                <span className="text-slate-600 text-[11px]">Impact on Net Margin:</span>
                <span className="font-normal text-[#780000]">
                  {netMarginPct.toFixed(1)}% &rarr; {analytics.sensitivity.materialInflation5Pct.revisedNetMarginPct}%
                </span>
              </div>
            </div>

            <div className="bg-[#fdf0d5]/40 p-2.5 rounded-lg border border-[#ecd5a8]">
              <div className="flex items-center justify-between">
                <span className="font-normal text-[#003049]">Scenario B: +8% Subcontractor Labour Hike</span>
                <span className="text-[#c1121f] font-normal">
                  +${analytics.sensitivity.labourRateHike8Pct.costImpact.toLocaleString()} Cost
                </span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Certified 5-axis CNC machinists and ASME IX welders wage adjustment.
              </p>
              <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#ecd5a8]">
                <span className="text-slate-600 text-[11px]">Impact on Net Margin:</span>
                <span className="font-normal text-[#780000]">
                  {netMarginPct.toFixed(1)}% &rarr; {analytics.sensitivity.labourRateHike8Pct.revisedNetMarginPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PROJECT PRODUCT AND SERVICE ITEMS LIST VIEW */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-normal text-[#003049] uppercase tracking-wide flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-[#003049]" />
                <span>Project Deliverables (Products &amp; Services)</span>
              </h3>
              <span className="bg-[#fdf0d5] text-[#780000] border border-[#ecd5a8] px-1.5 py-0.2 rounded text-[10px] font-normal">
                {deliverablesSummary.totalCount} items ({deliverablesSummary.productCount} products, {deliverablesSummary.serviceCount} services)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manufactured machinery cells, engineered deliverables, and contracted client services for this contract.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsQuickInsertModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>+ Quick Insert Product / Service</span>
            </button>
          </div>
        </div>

        {/* Deliverables Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#fdf0d5]/60 text-[#003049] uppercase text-[10px] tracking-normal border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-normal">Deliverable &amp; Code</th>
                <th className="py-2.5 px-2 font-normal">Type</th>
                <th className="py-2.5 px-3 font-normal">Category / Scope</th>
                <th className="py-2.5 px-2 font-normal">Quantity</th>
                <th className="py-2.5 px-2.5 font-normal">Unit Cost</th>
                <th className="py-2.5 px-2.5 font-normal">Quoted Price</th>
                <th className="py-2.5 px-2 font-normal">Margin</th>
                <th className="py-2.5 px-3 font-normal text-right">Subtotal Quoted</th>
                <th className="py-2.5 px-2.5 font-normal text-center">Status</th>
                <th className="py-2.5 px-2 font-normal text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliverables.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    <p className="text-xs">No products or services currently added to this project.</p>
                    <button
                      onClick={() => setIsQuickInsertModalOpen(true)}
                      className="mt-2 text-xs text-[#003049] underline hover:text-[#c1121f]"
                    >
                      + Quick insert a product or service from database or scratch
                    </button>
                  </td>
                </tr>
              ) : (
                deliverables.map(item => {
                  const isEditing = editingDeliverableId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-normal text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.code}</div>
                      </td>

                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-normal uppercase ${
                            item.type === 'product'
                              ? 'bg-[#003049] text-white'
                              : 'bg-[#669bbc] text-white'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      <td className="py-2 px-3">
                        <div className="text-slate-800 line-clamp-1">{item.category}</div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 line-clamp-1">{item.description}</div>
                        )}
                      </td>

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

                      <td className="py-2 px-2.5 text-slate-600">
                        ${item.costPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>

                      <td className="py-2 px-2.5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQuotedPrice}
                            onChange={e => setEditQuotedPrice(Number(e.target.value))}
                            className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                          />
                        ) : (
                          <span className="text-slate-900 font-normal">
                            ${item.quotedPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-normal ${
                            item.marginPct >= 30
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.marginPct >= 20
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.marginPct}%
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right font-normal text-slate-900">
                        ${item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Cost: ${item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </td>

                      <td className="py-2 px-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          {item.status || 'Planned'}
                        </span>
                      </td>

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
                              title="Edit Quantity / Price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveDeliverable(item.id)}
                            className="p-1 text-slate-400 hover:text-[#c1121f] rounded hover:bg-slate-100"
                            title="Remove Deliverable"
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

        {/* Deliverables Table Footer Summary */}
        {deliverables.length > 0 && (
          <div className="p-3 bg-[#fdf0d5]/40 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-600">
              Total Contract Deliverables Quoted Value:{' '}
              <span className="font-normal text-[#003049] text-sm">${deliverablesSummary.totalRev.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-4 text-[11px] text-slate-600">
              <span>
                Total Production Cost: <strong className="text-slate-800">${deliverablesSummary.totalCst.toLocaleString()}</strong>
              </span>
              <span>
                Project Deliverables Margin: <strong className="text-[#c1121f]">{deliverablesSummary.margin.toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insert Deliverable Modal */}
      <QuickInsertDeliverableModal
        isOpen={isQuickInsertModalOpen}
        onClose={() => setIsQuickInsertModalOpen(false)}
        produceItems={produceItems}
        onAddDeliverable={handleAddDeliverable}
        onAddProduceItem={onAddProduceItem}
      />
    </div>
  );
};

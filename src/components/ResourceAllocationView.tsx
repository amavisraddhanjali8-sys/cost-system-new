import React, { useState } from 'react';
import {
  Users,
  Cpu,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Project, SubcontractorRateItem, OutsourcedService, Supplier } from '../types';

interface ResourceAllocationViewProps {
  projects: Project[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  suppliers: Supplier[];
  onNavigateToSubcontractors: () => void;
  onNavigateToOutsourced: () => void;
}

export const ResourceAllocationView: React.FC<ResourceAllocationViewProps> = ({
  projects,
  subcontractors,
  outsourcedServices,
  suppliers,
  onNavigateToSubcontractors,
  onNavigateToOutsourced
}) => {
  const [filterType, setFilterType] = useState<'all' | 'subcontractor' | 'outsourced'>('all');
  const [search, setSearch] = useState('');

  // Roll up total allocations across all projects
  const allocations: Array<{
    id: string;
    resourceName: string;
    providerName: string;
    type: 'subcontractor' | 'outsourced';
    allocatedProjects: Array<{ projectCode: string; projectName: string; qty: number; unit: string; totalSpend: number }>;
    baseRate: number;
    unit: string;
    totalSpend: number;
    skillOrSla: string;
  }> = [];

  // Group items by provider / service
  projects.forEach((proj) => {
    (proj.selectedItems || []).forEach((item) => {
      if (item.type === 'subcontractor' || item.type === 'outsourced') {
        const existing = allocations.find(a => a.resourceName === item.name);
        if (existing) {
          existing.allocatedProjects.push({
            projectCode: proj.code,
            projectName: proj.name,
            qty: item.quantity,
            unit: item.unit,
            totalSpend: item.totalCost
          });
          existing.totalSpend += item.totalCost;
        } else {
          allocations.push({
            id: item.id,
            resourceName: item.name,
            providerName: item.supplierOrProvider,
            type: item.type,
            baseRate: item.unitCost,
            unit: item.unit,
            totalSpend: item.totalCost,
            skillOrSla: item.type === 'subcontractor' ? 'Certified Master Craftsman / Engineer' : 'Premium 99.9% SLA',
            allocatedProjects: [{
              projectCode: proj.code,
              projectName: proj.name,
              qty: item.quantity,
              unit: item.unit,
              totalSpend: item.totalCost
            }]
          });
        }
      }
    });
  });

  const filtered = allocations.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (search && !a.resourceName.toLowerCase().includes(search.toLowerCase()) && !a.providerName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalAllocatedSpend = allocations.reduce((sum, a) => sum + a.totalSpend, 0);

  return (
    <div className="space-y-3">
      {/* Header Banner */}
      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span className="text-xs font-normal text-[#003049] uppercase tracking-normal">Enterprise Resource Scheduling</span>
            <span>•</span>
            <span className="text-[11px] text-slate-500">Labour, Special Machining & Utilities</span>
          </div>
          <h2 className="text-sm font-normal text-slate-900 mt-0.5">Subcontractor & Outsourced Allocation Hub</h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Active tracking across {projects.length} running projects with total allocated commitments of <span className="text-[#003049] font-normal">${totalAllocatedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onNavigateToSubcontractors}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-[#fdf0d5]" />
            <span>Manage Subcontractor Rates</span>
          </button>
          <button
            onClick={onNavigateToOutsourced}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#fdf0d5] hover:bg-[#f6e5be] text-[#003049] border border-[#ecd5a8] text-xs font-normal rounded transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-[#669bbc]" />
            <span>Manage Outsourced Tariffs</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded border border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search resource, skill or contractor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-300 rounded pl-8 pr-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003049] w-60"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-50 p-0.5 rounded border border-slate-200 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-0.5 rounded transition-colors font-normal ${
                filterType === 'all' ? 'bg-[#003049] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('subcontractor')}
              className={`px-2.5 py-0.5 rounded transition-colors font-normal ${
                filterType === 'subcontractor' ? 'bg-[#003049] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subcontractors & Labour
            </button>
            <button
              onClick={() => setFilterType('outsourced')}
              className={`px-2.5 py-0.5 rounded transition-colors font-normal ${
                filterType === 'outsourced' ? 'bg-[#003049] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Outsourced Services
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="text-slate-900 font-normal">{filtered.length}</span> allocated service items
        </div>
      </div>

      {/* Allocation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-normal ${
                    item.type === 'subcontractor'
                      ? 'bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8]'
                      : 'bg-slate-100 text-[#669bbc] border border-slate-200'
                  }`}>
                    {item.type}
                  </span>
                  <h3 className="text-sm font-normal text-slate-900 mt-1">{item.resourceName}</h3>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-[#003049]" />
                    <span>{item.providerName}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-normal text-slate-900">${item.totalSpend.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">Project Commitment</span>
                </div>
              </div>

              {/* Skill / Base Rate Badge */}
              <div className="mt-2 p-1.5 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between text-slate-600">
                <span className="text-slate-500">Standard Base Rate:</span>
                <span className="font-normal text-[#003049]">${item.baseRate.toFixed(2)} / {item.unit}</span>
              </div>

              {/* Projects Breakdown */}
              <div className="mt-2.5">
                <p className="text-[10px] font-normal text-slate-500 uppercase tracking-normal">Active Deployments:</p>
                <div className="mt-1 space-y-1">
                  {item.allocatedProjects.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1 py-0.2 rounded bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8] text-[10px] font-normal">
                          {p.projectCode}
                        </span>
                        <span className="text-slate-800 truncate max-w-[180px] font-normal">{p.projectName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-600 font-normal">{p.qty} {p.unit}</span>
                        <span className="text-slate-300 mx-1">•</span>
                        <span className="font-normal text-slate-900">${p.totalSpend.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center space-x-1 text-[#003049]">
                <CheckCircle2 className="w-3 h-3 text-[#669bbc]" />
                <span>Rate Confirmed & Audited</span>
              </span>
              <span>ISO 9001 Compliant</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Building2,
  FileText,
  Tag,
  TrendingUp,
  TrendingDown,
  Layers,
  Percent,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter
} from 'lucide-react';
import { MaterialVendorQuote, VendorPriceChangeRecord, VolumePriceTier, TierChangeDetail } from '../types';

export interface RevisionChangesAuditModalProps {
  date: string; // Specific date (e.g. '2026-03-01') or 'all'
  materialCode: string;
  materialName: string;
  materialUnit?: string;
  vendorQuotes: MaterialVendorQuote[];
  initialVendorId?: string | null;
  onClose: () => void;
  onOpenCommitForVendor?: (vendor: MaterialVendorQuote) => void;
}

export const RevisionChangesAuditModal: React.FC<RevisionChangesAuditModalProps> = ({
  date,
  materialCode,
  materialName,
  materialUnit = 'unit',
  vendorQuotes,
  initialVendorId = null,
  onClose,
  onOpenCommitForVendor
}) => {
  const isSingleDateMode = Boolean(date && date !== 'all');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string | null>(initialVendorId);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(date || 'all');

  // Keep state in sync if initialVendorId or date prop changes
  React.useEffect(() => {
    setSelectedVendorFilter(initialVendorId);
  }, [initialVendorId]);

  React.useEffect(() => {
    setSelectedDateFilter(date || 'all');
  }, [date]);

  // When a specific date is passed, strictly enforce viewing that date only
  const effectiveDateFilter = isSingleDateMode ? date : selectedDateFilter;

  // Extract all unique dates from all vendors' price histories
  const allHistoricalDates = React.useMemo(() => {
    const set = new Set<string>();
    vendorQuotes.forEach((v) => {
      (v.priceHistory || []).forEach((h) => {
        if (h.date) set.add(h.date);
      });
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [vendorQuotes]);

  // Find all vendor records matching the active date filter
  const allAuditEntries = React.useMemo(() => {
    const list: { vendor: MaterialVendorQuote; record: VendorPriceChangeRecord }[] = [];
    vendorQuotes.forEach((vendor) => {
      (vendor.priceHistory || []).forEach((h) => {
        if (effectiveDateFilter === 'all' || h.date === effectiveDateFilter) {
          list.push({ vendor, record: h });
        }
      });
    });
    // Sort descending by date
    return list.sort((a, b) => b.record.date.localeCompare(a.record.date));
  }, [vendorQuotes, effectiveDateFilter]);

  // Active entries to display based on vendor filter
  const displayedEntries = selectedVendorFilter
    ? allAuditEntries.filter((e) => e.vendor.vendorId === selectedVendorFilter)
    : allAuditEntries;

  // Vendors that have entries in the current view
  const availableVendors = React.useMemo(() => {
    const map = new Map<string, MaterialVendorQuote>();
    allAuditEntries.forEach((e) => {
      if (!map.has(e.vendor.vendorId)) {
        map.set(e.vendor.vendorId, e.vendor);
      }
    });
    return Array.from(map.values());
  }, [allAuditEntries]);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* REFINED LIGHT MODAL HEADER */}
        <header className="px-5 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/90 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
              <FileText className="w-4 h-4 text-[#003049]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Revision Changes Audit Log
                </h3>
                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200/80">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{isSingleDateMode ? date : selectedDateFilter === 'all' ? 'All Revision Dates' : selectedDateFilter}</span>
                </div>
                {isSingleDateMode && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Single Date Audit
                  </span>
                )}
                <span className="text-[11px] text-slate-500 font-normal">
                  {displayedEntries.length} revision event{displayedEntries.length === 1 ? '' : 's'} recorded
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 truncate">
                <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                  {materialCode}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700 font-medium truncate">
                  {materialName}
                </span>
                <span className="text-slate-400 text-[11px]">
                  ({materialUnit})
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer ml-3 shrink-0"
            title="Close Changes Audit"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* REVISION DATES & VENDOR TABS FILTER TOOLBAR */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          {isSingleDateMode ? (
            /* Restricted Single Date Mode: Strictly shows the selected date only */
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium text-[11px] flex items-center space-x-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#003049]" />
                <span>Timeline Date:</span>
              </span>
              <span className="px-2.5 py-0.5 rounded bg-[#003049] text-white font-mono text-xs font-semibold shadow-2xs">
                {date}
              </span>
              <span className="text-[11px] text-slate-600 font-medium bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                Viewing changes related to this date only
              </span>
            </div>
          ) : (
            /* All Dates Mode: Allows browsing between all revision dates */
            <div className="flex items-center space-x-2 overflow-x-auto text-xs pb-1 sm:pb-0">
              <span className="text-slate-500 font-medium text-[11px] mr-0.5 flex items-center space-x-1 shrink-0">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Date:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('all')}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer font-medium shrink-0 ${
                  selectedDateFilter === 'all'
                    ? 'bg-[#003049] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                All Dates
              </button>
              {allHistoricalDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDateFilter(d)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer font-mono shrink-0 ${
                    selectedDateFilter === d
                      ? 'bg-[#003049] text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Vendor filter pills */}
          <div className="flex items-center space-x-1.5 text-xs overflow-x-auto">
            <span className="text-slate-500 font-medium text-[11px] mr-1 flex items-center space-x-1 shrink-0">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Vendor:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedVendorFilter(null)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer font-medium shrink-0 ${
                selectedVendorFilter === null
                  ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              All ({availableVendors.length})
            </button>

            {availableVendors.map((vendor) => (
              <button
                key={vendor.vendorId}
                type="button"
                onClick={() => setSelectedVendorFilter(vendor.vendorId)}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer flex items-center space-x-1 shrink-0 ${
                  selectedVendorFilter === vendor.vendorId
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span>{vendor.vendorName.split(' ')[0]}</span>
                {vendor.isPreferred && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-800 border border-amber-500/20 px-1 py-0.2 rounded font-medium">
                    Primary
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* AUDIT BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50">
          {displayedEntries.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">
                {isSingleDateMode
                  ? `No revision modifications recorded for ${date}`
                  : 'No revision modifications recorded for this filter'}
              </div>
              <div className="text-xs text-slate-400">
                {isSingleDateMode
                  ? selectedVendorFilter
                    ? 'Try selecting "All" vendors to inspect all modifications on this date.'
                    : 'There are no adjustments logged on this specific timeline date.'
                  : 'Try selecting "All Dates" or "All" vendors to view full revision history.'}
              </div>
            </div>
          ) : (
            displayedEntries.map(({ vendor, record }) => {
              const prevPrice = record.previousPrice ?? record.price;
              const hasBaseChange = prevPrice !== record.price;
              const changePct = record.changePct ?? (prevPrice > 0 ? Number((((record.price - prevPrice) / prevPrice) * 100).toFixed(2)) : 0);
              const isIncrease = changePct > 0;
              const isDecrease = changePct < 0;

              return (
                <div
                  key={`${vendor.vendorId}-${record.id || record.date}`}
                  className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* VENDOR CARD HEADER */}
                  <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-[#003049]/10 rounded">
                        <Building2 className="w-3.5 h-3.5 text-[#003049]" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{vendor.vendorName}</span>
                          {vendor.isPreferred && (
                            <span className="text-[9px] uppercase font-bold bg-[#003049] text-white px-1.5 py-0.5 rounded">
                              Primary Catalog Supplier
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {vendor.country || 'USA'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span>Ref: <strong className="text-slate-700">{record.quoteRef || 'QT-REVISION'}</strong></span>
                          <span>•</span>
                          <span>MOQ: <strong className="text-slate-700">{record.moq || vendor.moq || 1} {materialUnit}s</strong></span>
                          <span>•</span>
                          <span>Lead Time: <strong className="text-slate-700">{record.leadTimeDays || vendor.leadTimeDays}d</strong></span>
                          <span>•</span>
                          <span>Author: <strong className="text-slate-700">{record.updatedBy || 'Estimator'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Effective Rate</div>
                        <div className="text-xs font-bold text-[#003049]">
                          ${record.price.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">/{materialUnit}</span>
                        </div>
                      </div>

                      {onOpenCommitForVendor && (
                        <button
                          type="button"
                          onClick={() => onOpenCommitForVendor(vendor)}
                          className="px-2 py-1 bg-slate-800 hover:bg-[#003049] text-white text-[10px] font-medium rounded transition-colors cursor-pointer"
                        >
                          Modify Again
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PROMINENT CHANGE REASON BOX */}
                  <div className="p-3 bg-amber-50/60 border-b border-amber-200/70">
                    <div className="flex items-start space-x-2">
                      <div className="p-1 bg-amber-200/60 rounded text-amber-900 shrink-0 mt-0.5">
                        <FileText className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                          Price Change Driver / Reason
                        </div>
                        <p className="text-xs text-amber-950 font-medium italic mt-0.5">
                          "{record.reason || 'Official vendor quotation adjustment and volume structure update.'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SUMMARY OF RECORDED CHANGES */}
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-1.5 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>All Recorded Modifications For This Event</span>
                      </div>

                      {/* Display bullet list of applied changes */}
                      {record.appliedChangesSummary && record.appliedChangesSummary.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          {record.appliedChangesSummary.map((summaryText, sIdx) => (
                            <div
                              key={sIdx}
                              className="px-2.5 py-1.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 flex items-center space-x-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#003049] shrink-0" />
                              <span className="font-medium text-[11px]">{summaryText}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                          <div className="px-2.5 py-1.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 flex items-center justify-between">
                            <span className="text-[11px] text-slate-600">Base Quoted Price:</span>
                            <span className="font-semibold text-slate-900">
                              ${prevPrice.toFixed(2)} → ${record.price.toFixed(2)}{' '}
                              <span className={isIncrease ? 'text-rose-600' : isDecrease ? 'text-emerald-600' : 'text-slate-500'}>
                                ({changePct > 0 ? `+${changePct}%` : `${changePct}%`})
                              </span>
                            </span>
                          </div>
                          {record.changedTiers && record.changedTiers.map((t, tidx) => (
                            <div
                              key={tidx}
                              className="px-2.5 py-1.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 flex items-center justify-between"
                            >
                              <span className="text-[11px] text-slate-600 truncate mr-2">
                                Tier: {t.label || `${t.minQty}+`}
                              </span>
                              <span className="font-semibold text-slate-900 shrink-0">
                                ${t.unitPrice.toFixed(2)} (-{t.discountPct}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DETAILED PARAMETER COMPARISON TABLE */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                        Detailed Field & Tier Comparison
                      </div>
                      <div className="border border-slate-200 rounded overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="py-1.5 px-2.5">Field / Tier Parameter</th>
                              <th className="py-1.5 px-2.5">Previous Value</th>
                              <th className="py-1.5 px-2.5">Revised Value</th>
                              <th className="py-1.5 px-2.5 text-right">Variance / Delta</th>
                              <th className="py-1.5 px-2.5 text-right">Change Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {/* Base Price Row */}
                            <tr className={hasBaseChange ? 'bg-amber-50/20' : ''}>
                              <td className="py-1.5 px-2.5 font-medium text-slate-900">
                                Base Quoted Rate
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-600 font-mono">
                                ${prevPrice.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-2.5 font-bold text-[#003049] font-mono">
                                ${record.price.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-medium font-mono">
                                {hasBaseChange ? (
                                  <span className={isIncrease ? 'text-rose-600' : 'text-emerald-600'}>
                                    {isIncrease ? `+$${(record.price - prevPrice).toFixed(2)} (+${changePct}%)` : `-$${(prevPrice - record.price).toFixed(2)} (${changePct}%)`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Unchanged</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                {hasBaseChange ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    Base Price
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Retained</span>
                                )}
                              </td>
                            </tr>

                            {/* Range / Tier Changes if available */}
                            {record.tierChanges && record.tierChanges.length > 0 ? (
                              record.tierChanges.map((tc, tcIdx) => (
                                <tr key={tcIdx} className="bg-blue-50/20">
                                  <td className="py-1.5 px-2.5 text-slate-800">
                                    <div className="font-medium">{tc.tierLabel}</div>
                                    <div className="text-[9px] text-slate-500">Bulk Price Tier</div>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-600">
                                    <div>
                                      {tc.previousMinQty !== undefined ? `${tc.previousMinQty}–${tc.previousMaxQty || '+'} qty` : '—'}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {tc.previousDiscountPct !== undefined ? `${tc.previousDiscountPct}% off` : ''}{' '}
                                      {tc.previousPrice !== undefined ? `($${tc.previousPrice.toFixed(2)})` : ''}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-[#003049]">
                                    <div>
                                      {tc.newMinQty !== undefined ? `${tc.newMinQty}–${tc.newMaxQty || '+'} qty` : '—'}
                                    </div>
                                    <div className="text-[10px] font-semibold text-emerald-700">
                                      {tc.newDiscountPct !== undefined ? `${tc.newDiscountPct}% off` : ''}{' '}
                                      {tc.newPrice !== undefined ? `($${tc.newPrice.toFixed(2)})` : ''}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right">
                                    {tc.previousDiscountPct !== undefined && tc.newDiscountPct !== undefined && tc.newDiscountPct !== tc.previousDiscountPct && (
                                      <div className="text-emerald-700 font-semibold font-mono text-[10px]">
                                        {tc.newDiscountPct > tc.previousDiscountPct ? `+${(tc.newDiscountPct - tc.previousDiscountPct).toFixed(1)}% discount` : `${(tc.newDiscountPct - tc.previousDiscountPct).toFixed(1)}% discount`}
                                      </div>
                                    )}
                                    {tc.previousPrice !== undefined && tc.newPrice !== undefined && tc.newPrice !== tc.previousPrice && (
                                      <div className="text-slate-600 font-mono text-[10px]">
                                        ${(tc.newPrice - tc.previousPrice).toFixed(2)} delta
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                      {tc.changeType === 'range_size'
                                        ? 'Range Size'
                                        : tc.changeType === 'discount'
                                        ? 'Discount Rate'
                                        : tc.changeType === 'all'
                                        ? 'Range & Rate'
                                        : 'Bulk Rate'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : record.changedTiers && record.changedTiers.length > 0 ? (
                              record.changedTiers.map((ct, ctIdx) => (
                                <tr key={ctIdx} className="bg-blue-50/10">
                                  <td className="py-1.5 px-2.5 text-slate-800">
                                    <div className="font-medium">{ct.label || `Qty ${ct.minQty}+`}</div>
                                    <div className="text-[9px] text-slate-500">Tier {ctIdx + 1}</div>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-400">
                                    Base Quote
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-[#003049]">
                                    <div>${ct.unitPrice.toFixed(2)} / {materialUnit}</div>
                                    <div className="text-[10px] text-emerald-700">-{ct.discountPct}% Discount</div>
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700">
                                    -{ct.discountPct}%
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                      Bulk Tier
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <footer className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 text-[11px] flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Audit Revision Date:{' '}
              <strong className="text-slate-700 font-mono">
                {isSingleDateMode ? `${date} (Viewing this date only)` : selectedDateFilter === 'all' ? 'All Revision Dates' : selectedDateFilter}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white rounded font-medium transition-colors cursor-pointer text-xs"
          >
            Close Audit View
          </button>
        </footer>
      </div>
    </div>
  );
};

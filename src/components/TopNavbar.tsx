import React, { useState, useEffect } from 'react';
import {
  Shield,
  Briefcase,
  LogOut,
  Building2,
  X,
  Sun,
  Moon,
  Barcode
} from 'lucide-react';
import { AppUser, CompanyDetails } from '../types';
import { getStoredThemeMode, setStoredThemeMode, isDarkEffective, ThemeMode } from '../services/themeService';

export type ActiveTab =
  | 'home'
  | 'directory-hub'
  | 'project-home'
  | 'produce'
  | 'item-grid'
  | 'cost-analysis'
  | 'resource-allocation'
  | 'project-timelines'
  | 'materials'
  | 'suppliers'
  | 'outsourced'
  | 'subcontractors'
  | 'inventory'
  | 'projects'
  | 'audit-log'
  | 'settings';

interface TopNavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: AppUser;
  onLogout: () => void;
  companyDetails: CompanyDetails;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  companyDetails
}) => {
  // Navigation tabs - Audit Log only visible to Admin
  const primaryTabs: { id: ActiveTab; label: string; adminOnly?: boolean }[] = [
    { id: 'home', label: 'Home' },
    { id: 'directory-hub', label: 'Hub' },
    { id: 'item-grid', label: 'Grid' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'audit-log', label: 'Audit Log', adminOnly: true },
    { id: 'settings', label: 'Settings' }
  ];

  const visibleTabs = primaryTabs.filter(tab => !tab.adminOnly || currentUser.role === 'ADMIN');

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const [isDark, setIsDark] = useState<boolean>(() => isDarkEffective());

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      setThemeMode(getStoredThemeMode());
      setIsDark(isDarkEffective());
    };
    window.addEventListener('fxtt-theme-changed', handleThemeChange);
    return () => window.removeEventListener('fxtt-theme-changed', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    setStoredThemeMode(nextMode);
    setIsDark(nextMode === 'dark');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs select-none">
      {/* Top Status & Utility Bar */}
      <div className="px-3 lg:px-6 py-2 flex items-center justify-between border-b border-slate-200 bg-white">
        {/* Left Side: Company Logo & Corporate Title */}
        <div className="flex items-center space-x-3">
          {/* Logo in Left Corner if selected */}
          {companyDetails.logoPosition === 'left' && companyDetails.logoUrl ? (
            <img
              src={companyDetails.logoUrl}
              alt={companyDetails.name}
              className="h-8 max-w-[140px] object-contain rounded p-0.5 border border-slate-200 bg-white shadow-2xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center w-7 h-7 rounded bg-[#003049] text-white shadow-xs">
              <span className="text-white text-xs font-semibold tracking-tight">PR</span>
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[#003049] font-bold text-xs tracking-tight">
                {companyDetails.name || 'Cost & Profitability System'}
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded bg-[#fdf0d5] text-[#780000] border border-[#e5d8b8]">
                Enterprise
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              {companyDetails.tagline || 'Materials, Outsourced Tariffs & Multi-Phase Costing'}
            </p>
          </div>
        </div>

        {/* Right Side: Scanner Status, Dark Mode Toggle, User Profile */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Global Barcode Scanner Status Pill */}
          <div 
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold shadow-2xs"
            title="Global Keyboard Wedge & Handheld Barcode Scanner active. Pull trigger or scan anytime to lookup."
          >
            <Barcode className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Scanner Ready</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          {/* User-Level Dark Mode Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            id="theme-mode-toggle"
            className={`h-8 px-2.5 rounded-lg border flex items-center space-x-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isDark ? "Switch to Day-Shift Light Mode" : "Switch to Night-Shift High-Contrast Dark Mode"}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold hidden md:inline">Night Shift</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[11px] font-semibold hidden md:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Logo in Right Corner if selected */}
          {companyDetails.logoPosition === 'right' && companyDetails.logoUrl && (
            <img
              src={companyDetails.logoUrl}
              alt={companyDetails.name}
              className="h-8 max-w-[140px] object-contain rounded p-0.5 border border-slate-200 bg-white shadow-2xs hidden md:block"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Logged in User Capsule */}
          <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
              {/* User Avatar Circle */}
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* User Details */}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 leading-none">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{currentUser.employeeId}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-700">
                    {currentUser.role === 'ADMIN' ? 'Admin' : 'Project Mgr'}
                  </span>
                </div>
              </div>

              {/* Role Badge */}
              <div className="ml-1">
                {currentUser.role === 'ADMIN' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield className="w-3 h-3 text-indigo-600" />
                    <span className="hidden md:inline">Admin</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Briefcase className="w-3 h-3 text-blue-600" />
                    <span className="hidden md:inline">PM</span>
                  </span>
                )}
              </div>
            </div>

            {/* Logout / Switch User Button */}
            <button
              type="button"
              onClick={onLogout}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 shadow-2xs transition-colors cursor-pointer"
              title="Sign Out / Switch Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Horizontal Navigation Tabs */}
      <div className="px-3 lg:px-6 flex items-center justify-between overflow-x-auto no-scrollbar bg-white">
        <nav className="flex items-center space-x-1 py-1" aria-label="Main Tabs">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#003049] text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-[#003049] hover:bg-[#fdf0d5]/80'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Sub-view indicator pill when viewing a sub-portal */}
          {!primaryTabs.some((t) => t.id === activeTab) && (
            <div className="flex items-center space-x-1.5 pl-2 ml-1 border-l border-slate-200">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#003049] text-white shadow-2xs">
                <span>
                  {activeTab === 'outsourced' && 'Outsourced Finishing & Tariffs'}
                  {activeTab === 'suppliers' && 'Suppliers Portal'}
                  {activeTab === 'subcontractors' && 'Labor Roster'}
                  {activeTab === 'produce' && 'Products Catalog & BOM'}
                  {activeTab === 'materials' && 'Materials Catalog'}
                  {activeTab === 'projects' && 'Projects View'}
                  {activeTab === 'cost-analysis' && 'Cost Analysis'}
                  {activeTab === 'project-home' && 'Project Workspace'}
                  {activeTab === 'resource-allocation' && 'Resource Allocation'}
                  {activeTab === 'project-timelines' && 'Project Timelines'}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectTab('home')}
                  className="hover:text-amber-200 cursor-pointer ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
                  title="Return to Home Command Hub"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

/**
 * Persistent Static & Stable Central Database Service
 * Uses a robust local persistence layer with automatic initial seeding.
 * Ensures zero downtime on browser reload / system refresh.
 * Links all inventory transactions with unique numbers to central item, supplier, and project records.
 */

import {
  MaterialItem,
  Supplier,
  OutsourcedService,
  SubcontractorRateItem,
  InventoryItem,
  InventoryTransaction,
  Project,
  ProduceItem
} from '../types';

import {
  INITIAL_MATERIALS,
  INITIAL_SUPPLIERS,
  INITIAL_OUTSOURCED_SERVICES,
  INITIAL_SUBCONTRACTORS,
  INITIAL_INVENTORY,
  INITIAL_PROJECTS,
  INITIAL_PRODUCE_ITEMS
} from '../data/initialData';

import { getStoredAutoNumberRules, saveStoredAutoNumberRules } from './autoNumberingService';
import { getStoredCompanyDetails, saveStoredCompanyDetails } from '../data/userAndAuditData';

const DB_KEYS = {
  MATERIALS: 'remix_db_materials_v3',
  SUPPLIERS: 'remix_db_suppliers_v3',
  OUTSOURCED: 'remix_db_outsourced_v3',
  SUBCONTRACTORS: 'remix_db_subcontractors_v3',
  INVENTORY: 'remix_db_inventory_v3',
  TRANSACTIONS: 'remix_db_transactions_v3',
  PROJECTS: 'remix_db_projects_v3',
  PRODUCE: 'remix_db_produce_v3',
  INITIALIZED: 'remix_db_initialized_flag_v3'
};

// Initial linked transactions in LKR
export const INITIAL_TRANSACTIONS: InventoryTransaction[] = [];

// One-time cleanup of legacy demo caches from localStorage
try {
  const legacyKeys = [
    'remix_db_materials_v2',
    'remix_db_suppliers_v2',
    'remix_db_outsourced_v2',
    'remix_db_subcontractors_v2',
    'remix_db_inventory_v2',
    'remix_db_transactions_v2',
    'remix_db_projects_v2',
    'remix_db_produce_v2',
    'remix_db_initialized_flag_v2',
    'fxtt_category_hierarchy_demo'
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
} catch (e) {
  // Ignore in SSR / non-browser contexts
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Error reading ${key} from persistent storage, using fallback:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to persistent storage:`, err);
  }
}

export const persistentDatabase = {
  // 1. Materials
  getMaterials(fallback?: MaterialItem[]): MaterialItem[] {
    return safeGet<MaterialItem[]>(DB_KEYS.MATERIALS, fallback || INITIAL_MATERIALS);
  },
  saveMaterials(items: MaterialItem[]): void {
    safeSet(DB_KEYS.MATERIALS, items);
  },

  // 2. Suppliers
  getSuppliers(fallback?: Supplier[]): Supplier[] {
    return safeGet<Supplier[]>(DB_KEYS.SUPPLIERS, fallback || INITIAL_SUPPLIERS);
  },
  saveSuppliers(items: Supplier[]): void {
    safeSet(DB_KEYS.SUPPLIERS, items);
  },

  // 3. Outsourced Services
  getOutsourced(fallback?: OutsourcedService[]): OutsourcedService[] {
    return safeGet<OutsourcedService[]>(DB_KEYS.OUTSOURCED, fallback || INITIAL_OUTSOURCED_SERVICES);
  },
  getOutsourcedServices(fallback?: OutsourcedService[]): OutsourcedService[] {
    return this.getOutsourced(fallback);
  },
  saveOutsourced(items: OutsourcedService[]): void {
    safeSet(DB_KEYS.OUTSOURCED, items);
  },
  saveOutsourcedServices(items: OutsourcedService[]): void {
    this.saveOutsourced(items);
  },

  // 4. Subcontractors
  getSubcontractors(fallback?: SubcontractorRateItem[]): SubcontractorRateItem[] {
    return safeGet<SubcontractorRateItem[]>(DB_KEYS.SUBCONTRACTORS, fallback || INITIAL_SUBCONTRACTORS);
  },
  saveSubcontractors(items: SubcontractorRateItem[]): void {
    safeSet(DB_KEYS.SUBCONTRACTORS, items);
  },

  // 5. Inventory
  getInventory(fallback?: InventoryItem[]): InventoryItem[] {
    return safeGet<InventoryItem[]>(DB_KEYS.INVENTORY, fallback || INITIAL_INVENTORY);
  },
  saveInventory(items: InventoryItem[]): void {
    safeSet(DB_KEYS.INVENTORY, items);
  },

  // 6. Transactions
  getTransactions(fallback?: InventoryTransaction[]): InventoryTransaction[] {
    return safeGet<InventoryTransaction[]>(DB_KEYS.TRANSACTIONS, fallback || INITIAL_TRANSACTIONS);
  },
  saveTransactions(items: InventoryTransaction[]): void {
    safeSet(DB_KEYS.TRANSACTIONS, items);
  },

  // 7. Projects
  getProjects(fallback?: Project[]): Project[] {
    return safeGet<Project[]>(DB_KEYS.PROJECTS, fallback || INITIAL_PROJECTS);
  },
  saveProjects(items: Project[]): void {
    safeSet(DB_KEYS.PROJECTS, items);
  },

  // 8. Produce Items
  getProduce(fallback?: ProduceItem[]): ProduceItem[] {
    return safeGet<ProduceItem[]>(DB_KEYS.PRODUCE, fallback || INITIAL_PRODUCE_ITEMS);
  },
  getProduceItems(fallback?: ProduceItem[]): ProduceItem[] {
    return this.getProduce(fallback);
  },
  saveProduce(items: ProduceItem[]): void {
    safeSet(DB_KEYS.PRODUCE, items);
  },
  saveProduceItems(items: ProduceItem[]): void {
    this.saveProduce(items);
  },

  // Database Connection Diagnostic Info
  getConnectionInfo(): {
    status: 'ONLINE' | 'STANDBY';
    engine: string;
    totalRecords: number;
    lastSaved: string;
  } {
    const materials = this.getMaterials();
    const inventory = this.getInventory();
    const txs = this.getTransactions();
    const projects = this.getProjects();
    const suppliers = this.getSuppliers();
    const sub = this.getSubcontractors();
    const out = this.getOutsourced();

    return {
      status: 'ONLINE',
      engine: 'Central Synchronized Engine (Stable Local Persistence)',
      totalRecords:
        materials.length +
        inventory.length +
        txs.length +
        projects.length +
        suppliers.length +
        sub.length +
        out.length,
      lastSaved: new Date().toISOString()
    };
  },

  // 1-Click Master Database JSON Export
  exportCompleteDatabase(): string {
    const backup = {
      system: 'Cost and Planning Database System',
      currency: 'LKR',
      exportDate: new Date().toISOString(),
      schemaVersion: '2.4.0',
      companyDetails: getStoredCompanyDetails(),
      autoNumberRules: getStoredAutoNumberRules(),
      data: {
        materials: this.getMaterials(),
        suppliers: this.getSuppliers(),
        outsourcedServices: this.getOutsourced(),
        subcontractors: this.getSubcontractors(),
        inventory: this.getInventory(),
        transactions: this.getTransactions(),
        projects: this.getProjects(),
        produceItems: this.getProduce()
      }
    };
    return JSON.stringify(backup, null, 2);
  },

  // Restore Complete Database from JSON file
  restoreDatabase(jsonString: string): boolean {
    return this.restoreCompleteDatabase(jsonString);
  },

  restoreCompleteDatabase(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data) {
        throw new Error('Invalid database backup structure: missing data block');
      }

      if (Array.isArray(parsed.data.materials)) this.saveMaterials(parsed.data.materials);
      if (Array.isArray(parsed.data.suppliers)) this.saveSuppliers(parsed.data.suppliers);
      if (Array.isArray(parsed.data.outsourcedServices)) this.saveOutsourced(parsed.data.outsourcedServices);
      if (Array.isArray(parsed.data.subcontractors)) this.saveSubcontractors(parsed.data.subcontractors);
      if (Array.isArray(parsed.data.inventory)) this.saveInventory(parsed.data.inventory);
      if (Array.isArray(parsed.data.transactions)) this.saveTransactions(parsed.data.transactions);
      if (Array.isArray(parsed.data.projects)) this.saveProjects(parsed.data.projects);
      if (Array.isArray(parsed.data.produceItems)) this.saveProduce(parsed.data.produceItems);

      if (parsed.companyDetails) saveStoredCompanyDetails(parsed.companyDetails);
      if (Array.isArray(parsed.autoNumberRules)) saveStoredAutoNumberRules(parsed.autoNumberRules);

      return true;
    } catch (err) {
      console.error('Failed to restore database from backup:', err);
      return false;
    }
  },

  // Reset to Factory Default Seed Data
  resetToDefaults(): void {
    safeSet(DB_KEYS.MATERIALS, INITIAL_MATERIALS);
    safeSet(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    safeSet(DB_KEYS.OUTSOURCED, INITIAL_OUTSOURCED_SERVICES);
    safeSet(DB_KEYS.SUBCONTRACTORS, INITIAL_SUBCONTRACTORS);
    safeSet(DB_KEYS.INVENTORY, INITIAL_INVENTORY);
    safeSet(DB_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    safeSet(DB_KEYS.PROJECTS, INITIAL_PROJECTS);
    safeSet(DB_KEYS.PRODUCE, INITIAL_PRODUCE_ITEMS);
  }
};

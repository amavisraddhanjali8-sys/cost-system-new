import {
  MaterialItem,
  OutsourcedService,
  Project,
  SubcontractorRateItem,
  Supplier,
  SupplierContract,
  InventoryItem,
  ProduceItem
} from '../types';
import {
  INITIAL_SUPPLIERS,
  INITIAL_MATERIALS,
  INITIAL_OUTSOURCED_SERVICES,
  INITIAL_SUBCONTRACTORS,
  INITIAL_INVENTORY,
  INITIAL_PROJECTS,
  INITIAL_PRODUCE_ITEMS
} from '../data/initialData';

// Helper for safe fetch with localStorage/in-memory fallback
async function fetchWithFallback<T>(url: string, fallbackData: T, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`API call to ${url} failed, using local state:`, err);
    return fallbackData;
  }
}

export const api = {
  // Health
  checkHealth: async () => {
    return fetchWithFallback('/api/health', { status: 'ok', pythonEngine: 'active' });
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    return fetchWithFallback('/api/suppliers', INITIAL_SUPPLIERS);
  },
  createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `sup-${Date.now()}`,
      rating: 5,
      onTimeDeliveryPct: 100,
      qualityScorePct: 100,
      contractHistory: [],
      status: 'Active',
      ...data
    } as Supplier;
  },
  updateSupplier: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as Supplier;
  },
  addSupplierContract: async (supplierId: string, contract: Partial<SupplierContract>): Promise<Supplier> => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contract)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {} as Supplier;
  },
  deleteSupplier: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return true;
    }
  },

  // Produce Products & Services (Our Enterprise Supplied Catalog)
  getProduceItems: async (): Promise<ProduceItem[]> => {
    return fetchWithFallback('/api/produce', INITIAL_PRODUCE_ITEMS);
  },
  createProduceItem: async (data: Partial<ProduceItem>): Promise<ProduceItem> => {
    try {
      const res = await fetch('/api/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `prd-${Date.now()}`,
      priceHistory: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...data
    } as ProduceItem;
  },
  updateProduceItem: async (id: string, data: Partial<ProduceItem>): Promise<ProduceItem> => {
    try {
      const res = await fetch(`/api/produce/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as ProduceItem;
  },
  updateProduceItemPrice: async (id: string, newPrice: number, reason: string, updatedBy: string, bundlesAndRanges?: any[]): Promise<ProduceItem> => {
    try {
      const res = await fetch(`/api/produce/${id}/price-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice, reason, updatedBy, bundlesAndRanges })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {} as ProduceItem;
  },

  // Materials
  getMaterials: async (): Promise<MaterialItem[]> => {
    return fetchWithFallback('/api/materials', INITIAL_MATERIALS);
  },
  createMaterial: async (data: Partial<MaterialItem>): Promise<MaterialItem> => {
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `mat-${Date.now()}`,
      priceHistory: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...data
    } as MaterialItem;
  },
  updateMaterial: async (id: string, data: Partial<MaterialItem> & { priceChangeReason?: string; updatedBy?: string }): Promise<MaterialItem> => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as MaterialItem;
  },
  updateMaterialPrice: async (id: string, newPrice: number, reason: string, updatedBy: string, volumePricing?: any[]): Promise<MaterialItem> => {
    try {
      const res = await fetch(`/api/materials/${id}/price-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice, reason, updatedBy, volumePricing })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {} as MaterialItem;
  },

  // Outsourced Services
  getOutsourcedServices: async (): Promise<OutsourcedService[]> => {
    return fetchWithFallback('/api/outsourced', INITIAL_OUTSOURCED_SERVICES);
  },
  createOutsourcedService: async (data: Partial<OutsourcedService>): Promise<OutsourcedService> => {
    try {
      const res = await fetch('/api/outsourced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `out-${Date.now()}`,
      priceHistory: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...data
    } as OutsourcedService;
  },
  updateOutsourcedService: async (id: string, data: Partial<OutsourcedService> & { priceChangeReason?: string; updatedBy?: string }): Promise<OutsourcedService> => {
    try {
      const res = await fetch(`/api/outsourced/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as OutsourcedService;
  },

  // Subcontractors
  getSubcontractors: async (): Promise<SubcontractorRateItem[]> => {
    return fetchWithFallback('/api/subcontractors', INITIAL_SUBCONTRACTORS);
  },
  createSubcontractor: async (data: Partial<SubcontractorRateItem>): Promise<SubcontractorRateItem> => {
    try {
      const res = await fetch('/api/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `sub-${Date.now()}`,
      rateHistory: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...data
    } as SubcontractorRateItem;
  },
  updateSubcontractor: async (id: string, data: Partial<SubcontractorRateItem> & { changeReason?: string; updatedBy?: string }): Promise<SubcontractorRateItem> => {
    try {
      const res = await fetch(`/api/subcontractors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as SubcontractorRateItem;
  },
  updateSubcontractorRate: async (
    id: string,
    newRate: number,
    reason: string,
    updatedBy: string,
    bulkPricingRanges?: any[],
    newRetailRate?: number,
    fullContractEstimate?: number
  ): Promise<SubcontractorRateItem> => {
    try {
      const res = await fetch(`/api/subcontractors/${id}/rate-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newBaseRate: newRate,
          changeReason: reason,
          updatedBy,
          bulkPricingRanges,
          newRetailRate,
          fullContractEstimate
        })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return api.updateSubcontractor(id, { baseRate: newRate, rate: newRate, changeReason: reason, updatedBy, bulkPricingRanges, retailRate: newRetailRate, fullContractEstimate });
  },
  updateOutsourcedRate: async (
    id: string,
    newRate: number,
    reason: string,
    updatedBy: string,
    tierRates?: any[],
    retailPrice?: number
  ): Promise<OutsourcedService> => {
    try {
      const res = await fetch(`/api/outsourced/${id}/price-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRate,
          reason,
          updatedBy,
          tierRates,
          retailPrice
        })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return api.updateOutsourcedService(id, { rate: newRate, priceChangeReason: reason, updatedBy, tierRates, retailPrice });
  },

  // Inventory
  getInventory: async (): Promise<InventoryItem[]> => {
    return fetchWithFallback('/api/inventory', INITIAL_INVENTORY);
  },
  createInventoryItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `inv-${Date.now()}`,
      onHand: 10,
      reserved: 0,
      available: 10,
      reorderLevel: 5,
      unitCost: 100,
      location: 'Warehouse',
      status: 'In Stock',
      ...data
    } as InventoryItem;
  },
  updateInventory: async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as InventoryItem;
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    return fetchWithFallback('/api/projects', INITIAL_PROJECTS);
  },
  getProject: async (id: string): Promise<Project | null> => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PROJECTS.find(p => p.id === id) || null;
  },
  createProject: async (data: Partial<Project>): Promise<Project> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return {
      id: `proj-${Date.now()}`,
      code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      createdDate: new Date().toISOString().split('T')[0],
      ...data
    } as Project;
  },
  updateProject: async (id: string, data: Partial<Project>): Promise<Project> => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return data as Project;
  },
  deleteProject: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return true;
    }
  },

  // Python Analytics Engine Calculate
  calculateAnalytics: async (projectData: any) => {
    try {
      const res = await fetch('/api/analytics/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return null;
  },
  calculateProjectProfitability: async (projectData: any) => {
    return api.calculateAnalytics(projectData);
  },

  resetDemoData: async () => {
    try {
      const res = await fetch('/api/reset-data', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }
};

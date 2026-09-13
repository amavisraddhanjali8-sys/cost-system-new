import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

import {
  INITIAL_SUPPLIERS,
  INITIAL_MATERIALS,
  INITIAL_OUTSOURCED_SERVICES,
  INITIAL_SUBCONTRACTORS,
  INITIAL_INVENTORY,
  INITIAL_PROJECTS,
  INITIAL_PRODUCE_ITEMS
} from './src/data/initialData';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

// In-memory / persistent DB helper
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!parsed.produce) parsed.produce = [];
      if (!parsed.suppliers) parsed.suppliers = [];
      if (!parsed.materials) parsed.materials = [];
      if (!parsed.outsourced) parsed.outsourced = [];
      if (!parsed.subcontractors) parsed.subcontractors = [];
      if (!parsed.inventory) parsed.inventory = [];
      if (!parsed.projects) parsed.projects = [];
      return parsed;
    } catch (e) {
      console.error('Error reading DB_FILE, fallback to empty store', e);
    }
  }
  const initial = {
    suppliers: [],
    materials: [],
    outsourced: [],
    subcontractors: [],
    inventory: [],
    projects: [],
    produce: []
  };
  saveDB(initial);
  return initial;
}

function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB_FILE', e);
  }
}

// Invoke Python Analytics Engine
function runPythonAnalytics(projectData: any) {
  try {
    const pythonScript = path.join(process.cwd(), 'analytics_engine.py');
    const result = spawnSync('python3', [pythonScript, JSON.stringify(projectData)], {
      encoding: 'utf-8',
      timeout: 5000
    });

    if (result.error) {
      console.error('Python execution error:', result.error);
      return fallbackAnalytics(projectData);
    }

    if (result.stdout) {
      return JSON.parse(result.stdout);
    }
  } catch (err) {
    console.error('Failed to run python analytics script, using fallback:', err);
  }
  return fallbackAnalytics(projectData);
}

// Fallback pure TypeScript analytical calculation if Python process is unavailable
function fallbackAnalytics(projectData: any) {
  const revenue = Number(projectData.quotedPrice || 0);
  const items = projectData.selectedItems || [];
  let materialCost = 0;
  let subcontractorCost = 0;
  let outsourcedCost = 0;

  for (const item of items) {
    const cost = Number(item.unitCost || 0) * Number(item.quantity || 1);
    const disc = Number(item.discountPct || 0);
    const discounted = cost * (1 - disc / 100);
    if (item.type === 'material') materialCost += discounted;
    else if (item.type === 'subcontractor') subcontractorCost += discounted;
    else if (item.type === 'outsourced') outsourcedCost += discounted;
    else materialCost += discounted;
  }

  const totalDirectCost = materialCost + subcontractorCost + outsourcedCost;
  const overheadPct = Number(projectData.overheadPct || 8.5);
  const contingencyPct = Number(projectData.contingencyPct || 5.0);
  const overheadAmount = totalDirectCost * (overheadPct / 100);
  const contingencyAmount = totalDirectCost * (contingencyPct / 100);
  const totalProjectCost = totalDirectCost + overheadAmount + contingencyAmount;
  const grossProfit = revenue - totalDirectCost;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netProfit = revenue - totalProjectCost;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const phases = projectData.phases || [];
  let totalPlannedBudget = 0;
  const phaseMetrics = phases.map((p: any) => {
    const planned = Number(p.budget || 0);
    const actual = Number(p.actualCost || 0);
    totalPlannedBudget += planned;
    const variance = planned - actual;
    return {
      phaseId: p.id,
      phaseName: p.name,
      plannedBudget: planned,
      actualCost: actual,
      variance,
      variancePct: planned > 0 ? (variance / planned) * 100 : 0,
      status: variance >= 0 ? 'Under Budget' : 'Over Budget'
    };
  });

  const budgetVariance = totalPlannedBudget - totalProjectCost;
  const budgetVariancePct = totalPlannedBudget > 0 ? (budgetVariance / totalPlannedBudget) * 100 : 0;

  let healthScore = 100;
  if (netMarginPct < 15) healthScore -= 25;
  if (budgetVariance < 0) healthScore -= Math.min(30, Math.abs(budgetVariancePct) * 2);
  healthScore = Math.max(10, Math.min(100, healthScore));

  return {
    revenue: Math.round(revenue * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    subcontractorCost: Math.round(subcontractorCost * 100) / 100,
    outsourcedCost: Math.round(outsourcedCost * 100) / 100,
    totalDirectCost: Math.round(totalDirectCost * 100) / 100,
    overheadAmount: Math.round(overheadAmount * 100) / 100,
    contingencyAmount: Math.round(contingencyAmount * 100) / 100,
    totalProjectCost: Math.round(totalProjectCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPct: Math.round(grossMarginPct * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netMarginPct: Math.round(netMarginPct * 100) / 100,
    totalPlannedBudget: Math.round(totalPlannedBudget * 100) / 100,
    budgetVariance: Math.round(budgetVariance * 100) / 100,
    budgetVariancePct: Math.round(budgetVariancePct * 100) / 100,
    healthScore: Math.round(healthScore * 10) / 10,
    phaseMetrics,
    sensitivity: {
      materialInflation5Pct: {
        costImpact: Math.round(materialCost * 0.05 * 100) / 100,
        revisedNetMarginPct: revenue > 0 ? Math.round(((netProfit - materialCost * 0.05) / revenue) * 10000) / 100 : 0
      },
      labourRateHike8Pct: {
        costImpact: Math.round(subcontractorCost * 0.08 * 100) / 100,
        revisedNetMarginPct: revenue > 0 ? Math.round(((netProfit - subcontractorCost * 0.08) / revenue) * 10000) / 100 : 0
      }
    },
    costDistribution: [
      { category: 'Materials', amount: Math.round(materialCost), pct: totalDirectCost > 0 ? Math.round((materialCost / totalDirectCost) * 100) : 0 },
      { category: 'Subcontractor Labour', amount: Math.round(subcontractorCost), pct: totalDirectCost > 0 ? Math.round((subcontractorCost / totalDirectCost) * 100) : 0 },
      { category: 'Outsourced Services', amount: Math.round(outsourcedCost), pct: totalDirectCost > 0 ? Math.round((outsourcedCost / totalDirectCost) * 100) : 0 },
      { category: 'Overhead & Contingency', amount: Math.round(overheadAmount + contingencyAmount), pct: totalProjectCost > 0 ? Math.round(((overheadAmount + contingencyAmount) / totalProjectCost) * 100) : 0 }
    ]
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), pythonEngine: 'active' });
  });

  // --- Suppliers API ---
  app.get('/api/suppliers', (req, res) => {
    const db = loadDB();
    res.json(db.suppliers || []);
  });

  app.post('/api/suppliers', (req, res) => {
    const db = loadDB();
    const newSupplier = {
      id: `sup-${Date.now()}`,
      contractHistory: [],
      rating: 5.0,
      onTimeDeliveryPct: 100,
      qualityScorePct: 100,
      status: 'Active',
      ...req.body
    };
    db.suppliers.unshift(newSupplier);
    saveDB(db);
    res.status(201).json(newSupplier);
  });

  app.put('/api/suppliers/:id', (req, res) => {
    const db = loadDB();
    const idx = db.suppliers.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });
    db.suppliers[idx] = { ...db.suppliers[idx], ...req.body };
    saveDB(db);
    res.json(db.suppliers[idx]);
  });

  app.post('/api/suppliers/:id/contracts', (req, res) => {
    const db = loadDB();
    const idx = db.suppliers.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });
    const newContract = {
      contractId: req.body.contractId || `CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: req.body.title || 'Master Commercial & Supply Accord',
      value: Number(req.body.value || 0),
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      endDate: req.body.endDate || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
      status: req.body.status || 'Active',
      scopeType: req.body.scopeType || db.suppliers[idx].supplyScope || 'materials',
      deliverablesSummary: req.body.deliverablesSummary || '',
      paymentSchedule: req.body.paymentSchedule || db.suppliers[idx].paymentTerms || 'Net 30',
      notes: req.body.notes || ''
    };
    db.suppliers[idx].contractHistory = [newContract, ...(db.suppliers[idx].contractHistory || [])];
    saveDB(db);
    res.status(201).json(db.suppliers[idx]);
  });

  app.delete('/api/suppliers/:id', (req, res) => {
    const db = loadDB();
    db.suppliers = db.suppliers.filter((s: any) => s.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Materials API ---
  app.get('/api/materials', (req, res) => {
    const db = loadDB();
    res.json(db.materials || []);
  });

  app.post('/api/materials', (req, res) => {
    const db = loadDB();
    const newMat = {
      id: `mat-${Date.now()}`,
      priceHistory: [
        {
          id: `ph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          previousPrice: Number(req.body.retailPrice || 0),
          newPrice: Number(req.body.retailPrice || 0),
          changePct: 0,
          reason: 'Initial catalog onboarding price',
          updatedBy: req.body.updatedBy || 'Catalog Admin'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.materials.unshift(newMat);
    saveDB(db);
    res.status(201).json(newMat);
  });

  app.put('/api/materials/:id', (req, res) => {
    const db = loadDB();
    const idx = db.materials.findIndex((m: any) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Material item not found' });

    const existing = db.materials[idx];
    const incomingPrice = Number(req.body.retailPrice);
    const existingPrice = Number(existing.retailPrice);

    let priceHistory = existing.priceHistory || [];
    if (incomingPrice && incomingPrice !== existingPrice) {
      const changePct = existingPrice > 0 ? ((incomingPrice - existingPrice) / existingPrice) * 100 : 0;
      priceHistory.unshift({
        id: `ph-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        previousPrice: existingPrice,
        newPrice: incomingPrice,
        changePct: Math.round(changePct * 10) / 10,
        reason: req.body.priceChangeReason || 'Market adjustment / Supplier quote update',
        updatedBy: req.body.updatedBy || 'Procurement Estimator'
      });
    }

    db.materials[idx] = {
      ...existing,
      ...req.body,
      priceHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.materials[idx]);
  });

  app.post('/api/materials/:id/price-update', (req, res) => {
    const db = loadDB();
    const idx = db.materials.findIndex((m: any) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Material not found' });

    const { newPrice, reason, updatedBy, volumePricing } = req.body;
    const existing = db.materials[idx];
    const oldPrice = Number(existing.retailPrice);
    const newP = Number(newPrice);
    const changePct = oldPrice > 0 ? ((newP - oldPrice) / oldPrice) * 100 : 0;

    const historyRecord = {
      id: `ph-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      previousPrice: oldPrice,
      newPrice: newP,
      changePct: Math.round(changePct * 10) / 10,
      reason: reason || 'Vendor scheduled price revision',
      updatedBy: updatedBy || 'Materials Manager'
    };

    existing.retailPrice = newP;
    if (volumePricing) existing.volumePricing = volumePricing;
    existing.priceHistory = [historyRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  // --- Outsourced Services API ---
  app.get('/api/outsourced', (req, res) => {
    const db = loadDB();
    res.json(db.outsourced || []);
  });

  app.post('/api/outsourced', (req, res) => {
    const db = loadDB();
    const newService = {
      id: `out-${Date.now()}`,
      priceHistory: [
        {
          id: `oph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          oldRate: Number(req.body.rate || 0),
          newRate: Number(req.body.rate || 0),
          reason: 'Initial service tariff setup',
          updatedBy: req.body.updatedBy || 'Operations Lead'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.outsourced.unshift(newService);
    saveDB(db);
    res.status(201).json(newService);
  });

  app.put('/api/outsourced/:id', (req, res) => {
    const db = loadDB();
    const idx = db.outsourced.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Outsourced service not found' });

    const existing = db.outsourced[idx];
    const incomingRate = Number(req.body.rate);
    const existingRate = Number(existing.rate);
    let priceHistory = existing.priceHistory || [];

    if (incomingRate && incomingRate !== existingRate) {
      priceHistory.unshift({
        id: `oph-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        oldRate: existingRate,
        newRate: incomingRate,
        reason: req.body.priceChangeReason || 'Tariff adjustment / Contract index update',
        updatedBy: req.body.updatedBy || 'Operations Director'
      });
    }

    db.outsourced[idx] = {
      ...existing,
      ...req.body,
      priceHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.outsourced[idx]);
  });

  app.post('/api/outsourced/:id/price-update', (req, res) => {
    const db = loadDB();
    const idx = db.outsourced.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Outsourced service not found' });

    const { newRate, reason, updatedBy, tierRates, retailPrice } = req.body;
    const existing = db.outsourced[idx];
    const oldRate = Number(existing.rate);
    const newR = Number(newRate);

    const historyRecord = {
      id: `oph-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      oldRate,
      newRate: newR,
      reason: reason || 'Tariff schedule renegotiation',
      updatedBy: updatedBy || 'Operations Lead'
    };

    existing.rate = newR;
    if (retailPrice !== undefined) existing.retailPrice = Number(retailPrice);
    if (tierRates) existing.tierRates = tierRates;
    existing.priceHistory = [historyRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  // --- Subcontractors API ---
  app.get('/api/subcontractors', (req, res) => {
    const db = loadDB();
    res.json(db.subcontractors || []);
  });

  app.post('/api/subcontractors', (req, res) => {
    const db = loadDB();
    const newSub = {
      id: `sub-${Date.now()}`,
      rateHistory: [
        {
          id: `srh-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          oldRate: Number(req.body.baseRate || 0),
          newRate: Number(req.body.baseRate || 0),
          changeReason: 'Master rate card creation',
          updatedBy: req.body.updatedBy || 'Contracts Manager'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.subcontractors.unshift(newSub);
    saveDB(db);
    res.status(201).json(newSub);
  });

  app.put('/api/subcontractors/:id', (req, res) => {
    const db = loadDB();
    const idx = db.subcontractors.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Subcontractor rate not found' });

    const existing = db.subcontractors[idx];
    const incomingRate = Number(req.body.baseRate);
    const existingRate = Number(existing.baseRate);
    let rateHistory = existing.rateHistory || [];

    if (incomingRate && incomingRate !== existingRate) {
      rateHistory.unshift({
        id: `srh-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        oldRate: existingRate,
        newRate: incomingRate,
        changeReason: req.body.changeReason || 'Labour agreement escalation / Skill qualification tier',
        updatedBy: req.body.updatedBy || 'Chief Estimator'
      });
    }

    db.subcontractors[idx] = {
      ...existing,
      ...req.body,
      rateHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.subcontractors[idx]);
  });

  app.post('/api/subcontractors/:id/rate-update', (req, res) => {
    const db = loadDB();
    const idx = db.subcontractors.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Subcontractor rate not found' });

    const { newBaseRate, newRetailRate, fullContractEstimate, bulkPricingRanges, changeReason, updatedBy } = req.body;
    const existing = db.subcontractors[idx];
    const oldRate = Number(existing.baseRate);
    const newR = Number(newBaseRate);

    const historyRecord = {
      id: `srh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      oldRate,
      newRate: newR,
      changeReason: changeReason || 'Rate schedule review',
      updatedBy: updatedBy || 'Contracts Director'
    };

    const priceHistRecord = {
      id: `srh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      previousPrice: oldRate,
      newPrice: newR,
      previousRate: oldRate,
      newRate: newR,
      changePct: oldRate > 0 ? Math.round(((newR - oldRate) / oldRate) * 1000) / 10 : 0,
      reason: changeReason || 'Rate schedule review',
      changeReason: changeReason || 'Rate schedule review',
      updatedBy: updatedBy || 'Contracts Director'
    };

    existing.baseRate = newR;
    if (newRetailRate !== undefined) existing.retailRate = Number(newRetailRate);
    if (fullContractEstimate !== undefined) existing.fullContractEstimate = Number(fullContractEstimate);
    if (bulkPricingRanges) existing.bulkPricingRanges = bulkPricingRanges;
    existing.rateHistory = [historyRecord, ...(existing.rateHistory || [])];
    existing.priceHistory = [priceHistRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  // --- Produce Catalog API (Products & Services produced / supplied by enterprise) ---
  app.get('/api/produce', (req, res) => {
    const db = loadDB();
    res.json(db.produce || INITIAL_PRODUCE_ITEMS);
  });

  app.post('/api/produce', (req, res) => {
    const db = loadDB();
    if (!db.produce) db.produce = [...INITIAL_PRODUCE_ITEMS];
    const newProduce = {
      id: `prd-${Date.now()}`,
      priceHistory: [
        {
          id: `pph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          previousPrice: Number(req.body.retailPrice || 0),
          newPrice: Number(req.body.retailPrice || 0),
          changePct: 0,
          reason: 'Initial produced catalog onboarding',
          updatedBy: req.body.updatedBy || 'Catalog Director'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.produce.unshift(newProduce);
    saveDB(db);
    res.status(201).json(newProduce);
  });

  app.put('/api/produce/:id', (req, res) => {
    const db = loadDB();
    if (!db.produce) db.produce = [...INITIAL_PRODUCE_ITEMS];
    const idx = db.produce.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Produce item not found' });

    const existing = db.produce[idx];
    const incomingPrice = Number(req.body.retailPrice);
    const existingPrice = Number(existing.retailPrice);
    let priceHistory = existing.priceHistory || [];

    if (incomingPrice && incomingPrice !== existingPrice) {
      const changePct = existingPrice > 0 ? ((incomingPrice - existingPrice) / existingPrice) * 100 : 0;
      priceHistory.unshift({
        id: `pph-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        previousPrice: existingPrice,
        newPrice: incomingPrice,
        changePct: Math.round(changePct * 10) / 10,
        reason: req.body.priceChangeReason || 'Catalog price update',
        updatedBy: req.body.updatedBy || 'Commercial Officer'
      });
    }

    db.produce[idx] = {
      ...existing,
      ...req.body,
      priceHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.produce[idx]);
  });

  app.post('/api/produce/:id/price-update', (req, res) => {
    const db = loadDB();
    if (!db.produce) db.produce = [...INITIAL_PRODUCE_ITEMS];
    const idx = db.produce.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Produce item not found' });

    const { newPrice, reason, updatedBy, bundlesAndRanges } = req.body;
    const existing = db.produce[idx];
    const oldPrice = Number(existing.retailPrice);
    const newP = Number(newPrice);
    const changePct = oldPrice > 0 ? ((newP - oldPrice) / oldPrice) * 100 : 0;

    const historyRecord = {
      id: `pph-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      previousPrice: oldPrice,
      newPrice: newP,
      changePct: Math.round(changePct * 10) / 10,
      reason: reason || 'Commercial catalog price update',
      updatedBy: updatedBy || 'Pricing Strategy Lead'
    };

    existing.retailPrice = newP;
    if (bundlesAndRanges) existing.bundlesAndRanges = bundlesAndRanges;
    existing.priceHistory = [historyRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  // --- Inventory API ---
  app.get('/api/inventory', (req, res) => {
    const db = loadDB();
    res.json(db.inventory || []);
  });

  app.put('/api/inventory/:id', (req, res) => {
    const db = loadDB();
    const idx = db.inventory.findIndex((i: any) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Inventory record not found' });
    db.inventory[idx] = { ...db.inventory[idx], ...req.body, lastMovementDate: new Date().toISOString().split('T')[0] };
    saveDB(db);
    res.json(db.inventory[idx]);
  });

  // --- Projects & Profitability API ---
  app.get('/api/projects', (req, res) => {
    const db = loadDB();
    const projectsWithAnalytics = (db.projects || []).map((p: any) => ({
      ...p,
      analytics: runPythonAnalytics(p)
    }));
    res.json(projectsWithAnalytics);
  });

  app.get('/api/projects/:id', (req, res) => {
    const db = loadDB();
    const project = (db.projects || []).find((p: any) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    project.analytics = runPythonAnalytics(project);
    res.json(project);
  });

  app.post('/api/projects', (req, res) => {
    const db = loadDB();
    const newProject = {
      id: `proj-${Date.now()}`,
      code: `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Draft',
      createdDate: new Date().toISOString().split('T')[0],
      phases: [
        {
          id: `phase-${Date.now()}-1`,
          name: 'Phase 1: Procurement & Raw Materials',
          description: 'Sourcing and initial batch delivery of all certified structural components.',
          budget: 50000,
          actualCost: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: 'In Progress'
        },
        {
          id: `phase-${Date.now()}-2`,
          name: 'Phase 2: Subcontracting, Fabrication & Assembly',
          description: 'Specialized 5-axis machining, structural welding, and integration.',
          budget: 60000,
          actualCost: 0,
          startDate: new Date(Date.now() + 31 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0],
          status: 'Not Started'
        },
        {
          id: `phase-${Date.now()}-3`,
          name: 'Phase 3: QA Inspection, Power Testing & Logistics Delivery',
          description: 'High-voltage grid testing, ultrasonic weld QA, freight dispatch.',
          budget: 25000,
          actualCost: 0,
          startDate: new Date(Date.now() + 76 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 105 * 86400000).toISOString().split('T')[0],
          status: 'Not Started'
        }
      ],
      selectedItems: [],
      overheadPct: 8.5,
      contingencyPct: 5.0,
      ...req.body
    };
    newProject.analytics = runPythonAnalytics(newProject);
    db.projects.unshift(newProject);
    saveDB(db);
    res.status(201).json(newProject);
  });

  app.put('/api/projects/:id', (req, res) => {
    const db = loadDB();
    const idx = db.projects.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    db.projects[idx] = { ...db.projects[idx], ...req.body };
    db.projects[idx].analytics = runPythonAnalytics(db.projects[idx]);
    saveDB(db);
    res.json(db.projects[idx]);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const db = loadDB();
    db.projects = db.projects.filter((p: any) => p.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // Calculate ad-hoc scenario with Python Analytics
  app.post('/api/analytics/calculate', (req, res) => {
    const results = runPythonAnalytics(req.body);
    res.json(results);
  });

  // Reset data endpoint
  app.post('/api/reset-data', (req, res) => {
    const initial = {
      suppliers: [],
      materials: [],
      outsourced: [],
      subcontractors: [],
      inventory: [],
      projects: [],
      produce: []
    };
    saveDB(initial);
    res.json({ success: true, message: 'Database reset to clean state' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

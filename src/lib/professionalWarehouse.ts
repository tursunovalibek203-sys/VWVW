// Professional Warehouse Management System

// Warehouse Types
export enum WarehouseType {
  MAIN = 'main',
  DISTRIBUTION = 'distribution',
  RETAIL = 'retail',
  PRODUCTION = 'production',
  TRANSIT = 'transit',
  RETURNS = 'returns',
  QUARANTINE = 'quarantine',
}

// Bin Status
export enum BinStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  LOCKED = 'locked',
  MAINTENANCE = 'maintenance',
  BLOCKED = 'blocked',
}

// Movement Types
export enum MovementType {
  RECEIVING = 'receiving',
  PUTAWAY = 'putaway',
  PICKING = 'picking',
  PACKING = 'packing',
  SHIPPING = 'shipping',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  CYCLE_COUNT = 'cycle_count',
  RETURN = 'return',
  DAMAGE = 'damage',
  EXPIRED = 'expired',
}

// Priority Levels
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

// Warehouse Zone
export interface WarehouseZone {
  id: string;
  name: string;
  type: 'storage' | 'picking' | 'packing' | 'shipping' | 'receiving';
  temperature: {
    min: number;
    max: number;
    current?: number;
  };
  humidity: {
    min: number;
    max: number;
    current?: number;
  };
  security: 'low' | 'medium' | 'high';
  access: {
    required: boolean;
    authorized: string[];
  };
}

// Warehouse Equipment
export interface WarehouseEquipment {
  id: string;
  type: 'forklift' | 'pallet_jack' | 'conveyor' | 'crane' | 'shelving';
  name: string;
  status: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
  location?: string;
  capacity?: number;
  lastMaintenance?: Date;
}

// Warehouse Staff
export interface WarehouseStaff {
  id: string;
  name: string;
  role: 'manager' | 'supervisor' | 'operator' | 'picker' | 'packer';
  shift: 'day' | 'night' | 'flexible';
  status: 'active' | 'inactive' | 'on_leave';
  certifications: string[];
}

// Warehouse Information
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: WarehouseType;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
  dimensions: {
    length: number; // meters
    width: number;  // meters
    height: number; // meters
    area: number;   // square meters
    volume: number; // cubic meters
  };
  capacity: {
    totalPositions: number;
    utilizedPositions: number;
    utilizationRate: number;
    maxWeight: number; // kg
    currentWeight: number; // kg
  };
  zones: WarehouseZone[];
  equipment: WarehouseEquipment[];
  staff: WarehouseStaff[];
  operatingHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  settings: {
    autoReplenishment: boolean;
    cycleCountFrequency: number; // days
    putawayStrategy: 'nearest' | 'random' | 'zone_based';
    pickingStrategy: 'fifo' | 'lifo' | 'fefo' | 'batch';
    safetyStockEnabled: boolean;
    crossDockingEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Bin Location
export interface BinLocation {
  id: string;
  warehouseId: string;
  zoneId: string;
  aisle: string;
  bay: string;
  level: string;
  position: string;
  barcode: string;
  status: BinStatus;
  dimensions: {
    length: number;
    width: number;
    height: number;
    volume: number;
    maxWeight: number;
  };
  location: {
    x: number;
    y: number;
    z: number;
  };
  restrictions: {
    weightLimit: number;
    temperatureRange?: { min: number; max: number };
    humidityRange?: { min: number; max: number };
    hazardous: boolean;
    fragile: boolean;
    stackable: boolean;
  };
  currentStock: Array<{
    productId: string;
    productName: string;
    sku: string;
    batchNumber: string;
    quantity: number;
    unitWeight: number;
    expiryDate?: Date;
    receivedDate: Date;
    lastMoved: Date;
    reservedQuantity: number;
  }>;
  history: Array<{
    type: MovementType;
    productId: string;
    productName: string;
    quantity: number;
    fromBin?: string;
    toBin?: string;
    referenceId?: string;
    performedBy: string;
    performedAt: Date;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Stock Item
export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  binLocationId: string;
  warehouseId: string;
  zoneId: string;
  unitCost: number;
  totalValue: number;
  receivedDate: Date;
  expiryDate?: Date;
  lastCounted?: Date;
  lastMoved: Date;
  movementCount: number;
  qualityStatus: 'good' | 'damaged' | 'expired' | 'quarantine';
  attributes: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Movement Order
export interface MovementOrder {
  id: string;
  orderNumber: string;
  type: MovementType;
  priority: Priority;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  warehouseId: string;
  requestedBy: string;
  assignedTo?: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    fromBinId?: string;
    toBinId?: string;
    batchNumber?: string;
    specialInstructions?: string;
  }>;
  timeline: {
    created: Date;
    assigned?: Date;
    started?: Date;
    completed?: Date;
    cancelled?: Date;
  };
  instructions: string[];
  equipment: string[];
  estimatedTime: number; // minutes
  actualTime?: number; // minutes
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cycle Count
export interface CycleCount {
  id: string;
  countNumber: string;
  warehouseId: string;
  zoneId?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'discrepancy';
  priority: Priority;
  assignedTo: string;
  items: Array<{
    binId: string;
    productId: string;
    productName: string;
    sku: string;
    systemQuantity: number;
    countedQuantity?: number;
    variance?: number;
    varianceValue?: number;
    notes?: string;
  }>;
  summary: {
    totalItems: number;
    countedItems: number;
    totalVariance: number;
    totalVarianceValue: number;
    accuracyRate: number;
  };
  timeline: {
    planned: Date;
    started?: Date;
    completed?: Date;
  };
  performedBy: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Warehouse Configuration
export interface WarehouseConfig {
  defaultWarehouseType: WarehouseType;
  autoBinAssignment: boolean;
  barcodeGeneration: boolean;
  realTimeUpdates: boolean;
  batchTracking: boolean;
  expiryTracking: boolean;
  temperatureMonitoring: boolean;
  weightTracking: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  integrationSettings: {
    erpSystem: boolean;
    accountingSystem: boolean;
    shippingSystem: boolean;
    inventorySystem: boolean;
  };
  alerts: {
    lowStock: boolean;
    expiryWarning: boolean;
    binCapacity: boolean;
    equipmentMaintenance: boolean;
    securityBreaches: boolean;
    temperatureExcursions: boolean;
  };
  reporting: {
    dailyReports: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    customReports: boolean;
  };
}

// Professional Warehouse Manager
export class ProfessionalWarehouseManager {
  private static instance: ProfessionalWarehouseManager;
  private _config: WarehouseConfig;
  private warehouses: Map<string, Warehouse> = new Map();
  private binLocations: Map<string, BinLocation> = new Map();
  private stockItems: Map<string, StockItem> = new Map();
  private movementOrders: Map<string, MovementOrder> = new Map();
  private cycleCounts: Map<string, CycleCount> = new Map();

  constructor(config: WarehouseConfig) {
    this._config = config;
    this.initializeData();
  }

  static getInstance(config?: WarehouseConfig): ProfessionalWarehouseManager {
    if (!ProfessionalWarehouseManager.instance) {
      if (!config) {
        throw new Error('Warehouse config required for first initialization');
      }
      ProfessionalWarehouseManager.instance = new ProfessionalWarehouseManager(config);
    }
    return ProfessionalWarehouseManager.instance;
  }

  // Initialize sample data
  private initializeData(): void {
    // Sample warehouse
    const mainWarehouse: Warehouse = {
      id: 'warehouse_1',
      name: 'Main Warehouse',
      code: 'WH-001',
      type: WarehouseType.MAIN,
      location: {
        address: '123 Industrial Street',
        city: 'Tashkent',
        state: 'Tashkent',
        country: 'Uzbekistan',
        postalCode: '100000',
        coordinates: { lat: 41.2995, lng: 69.2401 },
      },
      dimensions: {
        length: 100,
        width: 80,
        height: 12,
        area: 8000,
        volume: 96000,
      },
      capacity: {
        totalPositions: 1000,
        utilizedPositions: 650,
        utilizationRate: 65,
        maxWeight: 1000000,
        currentWeight: 650000,
      },
      zones: [
        {
          id: 'zone_1',
          name: 'Receiving Zone',
          type: 'receiving',
          temperature: { min: 15, max: 25 },
          humidity: { min: 30, max: 60 },
          security: 'medium',
          access: { required: true, authorized: ['operator', 'supervisor'] },
        },
        {
          id: 'zone_2',
          name: 'Storage Zone A',
          type: 'storage',
          temperature: { min: 18, max: 22 },
          humidity: { min: 40, max: 50 },
          security: 'high',
          access: { required: true, authorized: ['operator', 'supervisor', 'manager'] },
        },
        {
          id: 'zone_3',
          name: 'Picking Zone',
          type: 'picking',
          temperature: { min: 20, max: 24 },
          humidity: { min: 35, max: 55 },
          security: 'medium',
          access: { required: true, authorized: ['picker', 'operator'] },
        },
      ],
      equipment: [
        {
          id: 'eq_1',
          type: 'forklift',
          name: 'Forklift 001',
          status: 'available',
          capacity: 2000,
          lastMaintenance: new Date('2024-01-15'),
        },
        {
          id: 'eq_2',
          type: 'pallet_jack',
          name: 'Pallet Jack 001',
          status: 'available',
          capacity: 500,
        },
      ],
      staff: [
        {
          id: 'staff_1',
          name: 'John Smith',
          role: 'manager',
          shift: 'day',
          status: 'active',
          certifications: ['Warehouse Management', 'Safety Training'],
        },
        {
          id: 'staff_2',
          name: 'Jane Doe',
          role: 'operator',
          shift: 'day',
          status: 'active',
          certifications: ['Forklift Operation', 'Safety Training'],
        },
      ],
      operatingHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '15:00' },
        sunday: { open: 'closed', close: 'closed' },
      },
      settings: {
        autoReplenishment: true,
        cycleCountFrequency: 30,
        putawayStrategy: 'zone_based',
        pickingStrategy: 'fifo',
        safetyStockEnabled: true,
        crossDockingEnabled: false,
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2024-01-15'),
    };

    this.warehouses.set(mainWarehouse.id, mainWarehouse);

    // Sample bin locations
    const sampleBins: BinLocation[] = [
      {
        id: 'bin_001',
        warehouseId: 'warehouse_1',
        zoneId: 'zone_2',
        aisle: 'A',
        bay: '01',
        level: '01',
        position: '01',
        barcode: 'A-01-01-01',
        status: BinStatus.OCCUPIED,
        dimensions: {
          length: 1.2,
          width: 1.0,
          height: 1.5,
          volume: 1.8,
          maxWeight: 500,
        },
        location: { x: 10, y: 5, z: 1 },
        restrictions: {
          weightLimit: 500,
          temperatureRange: { min: 15, max: 25 },
          hazardous: false,
          fragile: false,
          stackable: true,
        },
        currentStock: [
          {
            productId: 'product_1',
            productName: '15G PREFORMA',
            sku: 'PREFORMA-15G',
            batchNumber: 'BATCH001',
            quantity: 100,
            unitWeight: 0.05,
            receivedDate: new Date('2024-01-10'),
            lastMoved: new Date('2024-01-15'),
            reservedQuantity: 10,
          },
        ],
        history: [
          {
            type: MovementType.PUTAWAY,
            productId: 'product_1',
            productName: '15G PREFORMA',
            quantity: 100,
            toBin: 'bin_001',
            referenceId: 'po_123',
            performedBy: 'staff_2',
            performedAt: new Date('2024-01-15'),
          },
        ],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'bin_002',
        warehouseId: 'warehouse_1',
        zoneId: 'zone_2',
        aisle: 'A',
        bay: '01',
        level: '01',
        position: '02',
        barcode: 'A-01-01-02',
        status: BinStatus.AVAILABLE,
        dimensions: {
          length: 1.2,
          width: 1.0,
          height: 1.5,
          volume: 1.8,
          maxWeight: 500,
        },
        location: { x: 12, y: 5, z: 1 },
        restrictions: {
          weightLimit: 500,
          temperatureRange: { min: 15, max: 25 },
          hazardous: false,
          fragile: false,
          stackable: true,
        },
        currentStock: [],
        history: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
    ];

    sampleBins.forEach(bin => {
      this.binLocations.set(bin.id, bin);
    });

    // Sample stock items
    const sampleStock: StockItem[] = [
      {
        id: 'stock_1',
        productId: 'product_1',
        productName: '15G PREFORMA',
        sku: 'PREFORMA-15G',
        batchNumber: 'BATCH001',
        quantity: 100,
        reservedQuantity: 10,
        availableQuantity: 90,
        binLocationId: 'bin_001',
        warehouseId: 'warehouse_1',
        zoneId: 'zone_2',
        unitCost: 2500,
        totalValue: 250000,
        receivedDate: new Date('2024-01-10'),
        lastCounted: new Date('2024-01-15'),
        lastMoved: new Date('2024-01-15'),
        movementCount: 2,
        qualityStatus: 'good',
        attributes: {
          color: 'transparent',
          material: 'PET',
          weight: 50,
        },
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15'),
      },
    ];

    sampleStock.forEach(stock => {
      this.stockItems.set(stock.id, stock);
    });
  }

  // Warehouse Management
  createWarehouse(warehouse: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Warehouse {
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: `warehouse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.warehouses.set(newWarehouse.id, newWarehouse);
    console.log(`Warehouse created: ${newWarehouse.name}`);
    return newWarehouse;
  }

  updateWarehouse(id: string, updates: Partial<Warehouse>): Warehouse {
    const warehouse = this.warehouses.get(id);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const updatedWarehouse = {
      ...warehouse,
      ...updates,
      updatedAt: new Date(),
    };

    this.warehouses.set(id, updatedWarehouse);
    console.log(`Warehouse updated: ${updatedWarehouse.name}`);
    return updatedWarehouse;
  }

  getWarehouses(type?: WarehouseType): Warehouse[] {
    const warehouses = Array.from(this.warehouses.values());
    return type ? warehouses.filter(w => w.type === type) : warehouses;
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.get(id);
  }

  // Bin Location Management
  createBinLocation(bin: Omit<BinLocation, 'id' | 'createdAt' | 'updatedAt'>): BinLocation {
    const newBin: BinLocation = {
      ...bin,
      id: `bin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.binLocations.set(newBin.id, newBin);
    console.log(`Bin location created: ${newBin.barcode}`);
    return newBin;
  }

  updateBinLocation(id: string, updates: Partial<BinLocation>): BinLocation {
    const bin = this.binLocations.get(id);
    if (!bin) {
      throw new Error('Bin location not found');
    }

    const updatedBin = {
      ...bin,
      ...updates,
      updatedAt: new Date(),
    };

    this.binLocations.set(id, updatedBin);
    console.log(`Bin location updated: ${updatedBin.barcode}`);
    return updatedBin;
  }

  getBinLocations(warehouseId?: string, zoneId?: string, status?: BinStatus): BinLocation[] {
    let bins = Array.from(this.binLocations.values());
    
    if (warehouseId) bins = bins.filter(b => b.warehouseId === warehouseId);
    if (zoneId) bins = bins.filter(b => b.zoneId === zoneId);
    if (status) bins = bins.filter(b => b.status === status);
    
    return bins;
  }

  findAvailableBin(productId: string, _quantity: number, warehouseId: string): BinLocation | null {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const availableBins = this.getBinLocations(warehouseId, undefined, BinStatus.AVAILABLE);
    
    // Find bin that can accommodate the product
    for (const bin of availableBins) {
      // Check weight restriction
      const item = this.stockItems.get(productId);
      if (item) {
        // Use availableQuantity for weight calculation (simplified)
        const totalWeight = item.availableQuantity * 10; // assuming 10kg per unit
        if (bin.restrictions.weightLimit < totalWeight) continue;
      }
      
      // Check if bin is suitable for product (temperature, hazardous, etc.)
      // This would be more sophisticated in a real implementation
      
      return bin;
    }

    return null;
  }

  // Stock Management
  addStock(stock: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>): StockItem {
    const newStock: StockItem = {
      ...stock,
      id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      availableQuantity: stock.quantity - stock.reservedQuantity,
      movementCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.stockItems.set(newStock.id, newStock);

    // Update bin location
    const bin = this.binLocations.get(newStock.binLocationId);
    if (bin) {
      const existingStock = bin.currentStock.find(s => s.productId === newStock.productId);
      if (existingStock) {
        existingStock.quantity += newStock.quantity;
      } else {
        bin.currentStock.push({
          productId: newStock.productId,
          productName: newStock.productName,
          sku: newStock.sku,
          batchNumber: newStock.batchNumber,
          quantity: newStock.quantity,
          unitWeight: 0, // default value
          receivedDate: newStock.receivedDate,
          lastMoved: newStock.lastMoved,
          reservedQuantity: newStock.reservedQuantity,
        });
      }
      
      bin.status = BinStatus.OCCUPIED;
      this.binLocations.set(bin.id, bin);
    }

    console.log(`Stock added: ${newStock.productName} - ${newStock.quantity} units`);
    return newStock;
  }

  updateStock(id: string, updates: Partial<StockItem>): StockItem {
    const stock = this.stockItems.get(id);
    if (!stock) {
      throw new Error('Stock item not found');
    }

    const updatedStock = {
      ...stock,
      availableQuantity: updates.quantity ? updates.quantity - stock.reservedQuantity : stock.availableQuantity,
      ...updates,
      updatedAt: new Date(),
      movementCount: stock.movementCount + 1,
    };

    this.stockItems.set(id, updatedStock);
    console.log(`Stock updated: ${updatedStock.productName}`);
    return updatedStock;
  }

  getStock(warehouseId?: string, productId?: string): StockItem[] {
    let stocks = Array.from(this.stockItems.values());
    
    if (warehouseId) stocks = stocks.filter(s => s.warehouseId === warehouseId);
    if (productId) stocks = stocks.filter(s => s.productId === productId);
    
    return stocks;
  }

  reserveStock(stockId: string, quantity: number): boolean {
    const stock = this.stockItems.get(stockId);
    if (!stock) {
      throw new Error('Stock item not found');
    }

    if (stock.availableQuantity < quantity) {
      return false;
    }

    this.updateStock(stockId, {
      reservedQuantity: stock.reservedQuantity + quantity,
      availableQuantity: stock.availableQuantity - quantity,
    });

    return true;
  }

  releaseStock(stockId: string, quantity: number): boolean {
    const stock = this.stockItems.get(stockId);
    if (!stock) {
      throw new Error('Stock item not found');
    }

    if (stock.reservedQuantity < quantity) {
      return false;
    }

    this.updateStock(stockId, {
      reservedQuantity: stock.reservedQuantity - quantity,
      availableQuantity: stock.availableQuantity + quantity,
    });

    return true;
  }

  // Movement Order Management
  createMovementOrder(order: Omit<MovementOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): MovementOrder {
    const orderNumber = `MO-${Date.now()}`;
    const newOrder: MovementOrder = {
      ...order,
      id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.movementOrders.set(newOrder.id, newOrder);
    console.log(`Movement order created: ${orderNumber}`);
    return newOrder;
  }

  updateMovementOrder(id: string, updates: Partial<MovementOrder>): MovementOrder {
    const order = this.movementOrders.get(id);
    if (!order) {
      throw new Error('Movement order not found');
    }

    const updatedOrder = {
      ...order,
      ...updates,
      updatedAt: new Date(),
    };

    this.movementOrders.set(id, updatedOrder);
    console.log(`Movement order updated: ${updatedOrder.orderNumber}`);
    return updatedOrder;
  }

  getMovementOrders(status?: MovementOrder['status'], type?: MovementType): MovementOrder[] {
    let orders = Array.from(this.movementOrders.values());
    
    if (status) orders = orders.filter(o => o.status === status);
    if (type) orders = orders.filter(o => o.type === type);
    
    return orders;
  }

  // Cycle Count Management
  createCycleCount(count: Omit<CycleCount, 'id' | 'countNumber' | 'createdAt' | 'updatedAt'>): CycleCount {
    const countNumber = `CC-${Date.now()}`;
    const newCount: CycleCount = {
      ...count,
      id: `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      countNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cycleCounts.set(newCount.id, newCount);
    console.log(`Cycle count created: ${countNumber}`);
    return newCount;
  }

  updateCycleCount(id: string, updates: Partial<CycleCount>): CycleCount {
    const count = this.cycleCounts.get(id);
    if (!count) {
      throw new Error('Cycle count not found');
    }

    const updatedCount = {
      ...count,
      ...updates,
      updatedAt: new Date(),
    };

    this.cycleCounts.set(id, updatedCount);
    console.log(`Cycle count updated: ${updatedCount.countNumber}`);
    return updatedCount;
  }

  getCycleCounts(status?: CycleCount['status']): CycleCount[] {
    const counts = Array.from(this.cycleCounts.values());
    return status ? counts.filter(c => c.status === status) : counts;
  }

  // Analytics and Reporting
  getWarehouseAnalytics(warehouseId: string): {
    warehouse: Warehouse;
    utilization: {
      spaceUtilization: number;
      weightUtilization: number;
      binUtilization: number;
    };
    inventory: {
      totalItems: number;
      totalValue: number;
      itemsByStatus: Record<string, number>;
      lowStockItems: StockItem[];
      expiringItems: StockItem[];
    };
    movements: {
      totalMovements: number;
      movementsByType: Record<MovementType, number>;
      averageProcessingTime: number;
      pendingOrders: number;
    };
    performance: {
      accuracyRate: number;
    };
  } {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const bins = this.getBinLocations(warehouseId);
    const stocks = this.getStock(warehouseId);
    const movements = this.getMovementOrders();
    const cycleCounts = this.getCycleCounts();

    // Calculate utilization
    const occupiedBins = bins.filter(b => b.status === BinStatus.OCCUPIED).length;
    const spaceUtilization = (occupiedBins / bins.length) * 100;
    const weightUtilization = (warehouse.capacity.currentWeight / warehouse.capacity.maxWeight) * 100;
    const binUtilization = warehouse.capacity.utilizationRate;

    // Inventory analysis
    const totalItems = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const totalValue = stocks.reduce((sum, stock) => sum + stock.totalValue, 0);
    
    const itemsByStatus = stocks.reduce((acc, stock) => {
      acc[stock.qualityStatus] = (acc[stock.qualityStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lowStockItems = stocks.filter(stock => stock.quantity <= 10);
    const expiringItems = stocks.filter(stock => 
      stock.expiryDate && stock.expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    // Movement analysis
    const warehouseMovements = movements.filter(m => m.warehouseId === warehouseId);
    const totalMovements = warehouseMovements.length;
    
    const movementsByType = warehouseMovements.reduce((acc, movement) => {
      acc[movement.type] = (acc[movement.type] || 0) + 1;
      return acc;
    }, {} as Record<MovementType, number>);

    const completedMovements = warehouseMovements.filter(m => m.status === 'completed');
    const averageProcessingTime = completedMovements.length > 0
      ? completedMovements.reduce((sum, m) => sum + (m.actualTime || 0), 0) / completedMovements.length
      : 0;

    const pendingOrders = warehouseMovements.filter(m => m.status === 'pending').length;

    // Performance metrics
    const completedCounts = cycleCounts.filter(c => c.status === 'completed');
    const accuracyRate = completedCounts.length > 0
      ? completedCounts.reduce((sum, c) => sum + c.summary.accuracyRate, 0) / completedCounts.length
      : 0;

    return {
      warehouse,
      utilization: {
        spaceUtilization,
        weightUtilization,
        binUtilization,
      },
      inventory: {
        totalItems,
        totalValue,
        itemsByStatus,
        lowStockItems,
        expiringItems,
      },
      movements: {
        totalMovements,
        movementsByType,
        averageProcessingTime,
        pendingOrders,
      },
      performance: {
        accuracyRate,
      },
    };
  }

  // Test warehouse system
  async testWarehouse(): Promise<{
    warehouses: boolean;
    bins: boolean;
    stock: boolean;
    movements: boolean;
    cycleCounts: boolean;
  }> {
    console.log('Testing Warehouse system...');
    
    const results = {
      warehouses: false,
      bins: false,
      stock: false,
      movements: false,
      cycleCounts: false,
    };

    try {
      // Test warehouses
      const warehouses = this.getWarehouses();
      results.warehouses = warehouses.length > 0;

      // Test bins
      const bins = this.getBinLocations();
      results.bins = bins.length > 0;

      // Test stock
      const stock = this.getStock();
      results.stock = stock.length > 0;

      // Test movements
      const movement = this.createMovementOrder({
        type: MovementType.PUTAWAY,
        priority: Priority.NORMAL,
        status: 'pending',
        warehouseId: 'warehouse_1',
        requestedBy: 'Test User',
        items: [
          {
            productId: 'product_1',
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 10,
            toBinId: 'bin_002',
          },
        ],
        timeline: {
          created: new Date(),
        },
        instructions: ['Handle with care'],
        equipment: ['eq_1'],
        estimatedTime: 30,
      });
      results.movements = movement.id !== undefined;

      // Test cycle counts
      const cycleCount = this.createCycleCount({
        warehouseId: 'warehouse_1',
        status: 'planned',
        priority: Priority.NORMAL,
        assignedTo: 'Test User',
        items: [
          {
            binId: 'bin_001',
            productId: 'product_1',
            productName: 'Test Product',
            sku: 'TEST-001',
            systemQuantity: 100,
          },
        ],
        summary: {
          totalItems: 1,
          countedItems: 0,
          totalVariance: 0,
          totalVarianceValue: 0,
          accuracyRate: 0,
        },
        timeline: {
          planned: new Date(),
        },
        performedBy: 'Test User',
      });
      results.cycleCounts = cycleCount.id !== undefined;

    } catch (error) {
      console.error('Warehouse test failed:', error);
    }

    return results;
  }
}

// Create singleton instance
export const warehouse = ProfessionalWarehouseManager.getInstance;

// Convenience functions
export const createWarehouse = (warehouse: any) => {
  const wm = ProfessionalWarehouseManager.getInstance();
  return wm.createWarehouse(warehouse);
};

export const addStock = (stock: any) => {
  const wm = ProfessionalWarehouseManager.getInstance();
  return wm.addStock(stock);
};

export const createMovementOrder = (order: any) => {
  const wm = ProfessionalWarehouseManager.getInstance();
  return wm.createMovementOrder(order);
};

export default ProfessionalWarehouseManager;

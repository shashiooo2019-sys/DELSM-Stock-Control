import { StockMaster, StockTakingLog, PurchaseOrder } from '@/lib/db';

export const INITIAL_STOCK_MASTER: StockMaster[] = [
  {
    article_number: "DS-1001",
    description: "Premium Fountain Pen (Royal Blue)",
    barcode: "8901034001012",
    smallest_unit_name: "Piece",
    units_per_box: 10,
    boxes_per_pack: 5,
    estimated_monthly_usage: 1500,
    min_quantity: 200,
    reorder_level: 400,
    max_quantity: 2000,
    total_stock_quantity: 450,
    order_frequency_days: 30,
    order_volume: 1000,
    ordering_channel: "Central Ordering Team",
    lead_time_days: 14,
    location: "Aisle A1 - Shelf 3",
    quantity_details: "45 Boxes (10 units/box)",
    add_info: "High demand luxury fountain pen with archival blue ink."
  },
  {
    article_number: "DS-1002",
    description: "Cotton Cards Elegant Ivory (A6)",
    barcode: "8901034001029",
    smallest_unit_name: "Card",
    units_per_box: 100,
    boxes_per_pack: 10,
    estimated_monthly_usage: 3000,
    min_quantity: 500,
    reorder_level: 1200,
    max_quantity: 5000,
    total_stock_quantity: 800,
    order_frequency_days: 45,
    order_volume: 3000,
    ordering_channel: "Central Ordering Team",
    lead_time_days: 20,
    location: "Aisle A2 - Shelf 1",
    quantity_details: "8 Boxes (100 cards/box)",
    add_info: "Premium 300gsm cotton paper stock for wedding & formal stationery."
  },
  {
    article_number: "DS-1003",
    description: "Matte Black Kraft Gift Bags",
    barcode: "8901034001036",
    smallest_unit_name: "Bag",
    units_per_box: 50,
    boxes_per_pack: 8,
    estimated_monthly_usage: 1200,
    min_quantity: 150,
    reorder_level: 300,
    max_quantity: 1500,
    total_stock_quantity: 280,
    order_frequency_days: 15,
    order_volume: 800,
    ordering_channel: "Local",
    lead_time_days: 3,
    location: "Aisle B1 - Bin 04",
    quantity_details: "5 Boxes + 30 loose bags",
    add_info: "Eco-friendly heavy kraft paper bags with braided cotton handles."
  },
  {
    article_number: "DS-1004",
    description: "Metallic Wax Seal Stamps",
    barcode: "8901034001043",
    smallest_unit_name: "Seal",
    units_per_box: 200,
    boxes_per_pack: 15,
    estimated_monthly_usage: 9000,
    min_quantity: 1000,
    reorder_level: 2500,
    max_quantity: 12000,
    total_stock_quantity: 3500,
    order_frequency_days: 20,
    order_volume: 6000,
    ordering_channel: "Local",
    lead_time_days: 4,
    location: "Aisle B2 - Drawer 12",
    quantity_details: "17 Boxes + 100 seals",
    add_info: "Brass stamp heads with wooden handles & flexible metallic sealing wax."
  },
  {
    article_number: "DS-1005",
    description: "Handmade Calligraphy Parchment (A4)",
    barcode: "8901034001050",
    smallest_unit_name: "Sheet",
    units_per_box: 250,
    boxes_per_pack: 4,
    estimated_monthly_usage: 6000,
    min_quantity: 800,
    reorder_level: 1500,
    max_quantity: 8000,
    total_stock_quantity: 1200,
    order_frequency_days: 25,
    order_volume: 4000,
    ordering_channel: "Central Ordering Team",
    lead_time_days: 18,
    location: "Aisle C1 - Rack 2",
    quantity_details: "4 Boxes (250 sheets/box)",
    add_info: "Textured deckle-edge parchment paper suitable for dip pen & ink."
  }
];

export const INITIAL_STOCK_TAKING_LOG: StockTakingLog[] = [
  {
    log_id: "LOG-1",
    article_number: "DS-1001",
    timestamp: "2026-07-15T08:00:00Z",
    input_type: "Smallest Unit",
    input_count: 500,
    actual_quantity_units: 500,
    expected_quantity_units: 520,
    discrepancy_units: -20,
    discrepancy_status: "Deficit"
  },
  {
    log_id: "LOG-2",
    article_number: "DS-1002",
    timestamp: "2026-07-10T09:00:00Z",
    input_type: "Pack",
    input_count: 1,
    actual_quantity_units: 1000,
    expected_quantity_units: 1000,
    discrepancy_units: 0,
    discrepancy_status: "Matched"
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    po_number: "PO-2026-001",
    article_number: "DS-1002",
    order_date: "2026-07-10",
    approval_date: "2026-07-10",
    expected_delivery_date: "2026-07-30",
    order_quantity_units: 3000,
    status: "Approved"
  },
  {
    po_number: "PO-2026-002",
    article_number: "DS-1005",
    order_date: "2026-07-18",
    expected_delivery_date: "2026-08-05",
    order_quantity_units: 4000,
    status: "Raised"
  }
];

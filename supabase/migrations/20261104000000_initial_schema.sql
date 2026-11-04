-- RestroFlow — Supabase PostgreSQL Schema Migration
-- Unified Schema for Next.js + Supabase Architecture

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE tax_regime AS ENUM (
  'INDIA_GST',
  'US_SALES_TAX',
  'EU_VAT',
  'ES_IVA',
  'CUSTOM'
);

CREATE TYPE tax_mode AS ENUM (
  'INCLUSIVE',
  'EXCLUSIVE'
);

CREATE TYPE table_status AS ENUM (
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'CLEANING',
  'OUT_OF_SERVICE'
);

CREATE TYPE order_status AS ENUM (
  'OPEN',
  'PAID',
  'CANCELLED'
);

CREATE TYPE order_type AS ENUM (
  'DINE_IN',
  'TAKEAWAY',
  'DELIVERY',
  'AGGREGATOR'
);

CREATE TYPE order_acceptance AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE kot_status AS ENUM (
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'SERVED',
  'CANCELLED',
  'REJECTED'
);

CREATE TYPE payment_method AS ENUM (
  'CASH',
  'CARD',
  'UPI',
  'GIFT_CARD',
  'ONLINE',
  'OTHER'
);

CREATE TYPE ingredient_unit AS ENUM (
  'KG',
  'G',
  'L',
  'ML',
  'PIECE',
  'DOZEN',
  'PACK',
  'BOX'
);

CREATE TYPE purchase_order_status AS ENUM (
  'DRAFT',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED'
);

CREATE TYPE spice_level AS ENUM (
  'NONE',
  'MILD',
  'MEDIUM',
  'HOT',
  'EXTRA_HOT'
);

-- ============================================================================
-- CORE TENANCY: RESTAURANTS & BRANCHES
-- ============================================================================
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  legal_name TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  upi_vpa TEXT,
  upi_payee_name TEXT,
  loyalty_point_value NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  loyalty_earn_per_currency INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  gst_number TEXT,
  country TEXT NOT NULL DEFAULT 'IN',
  tax_regime tax_regime NOT NULL DEFAULT 'INDIA_GST',
  tax_mode tax_mode NOT NULL DEFAULT 'INCLUSIVE',
  tax_label TEXT,
  tax_id TEXT,
  auto_confirm_orders BOOLEAN NOT NULL DEFAULT FALSE,
  auto_confirm_reservations BOOLEAN NOT NULL DEFAULT FALSE,
  kiosk_token TEXT UNIQUE,
  kiosk_dine_in_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  kiosk_takeaway_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  printer_paper_width_mm INTEGER NOT NULL DEFAULT 80,
  printer_codepage TEXT NOT NULL DEFAULT 'CP858',
  printer_columns INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_branches_restaurant_id ON branches(restaurant_id);

-- ============================================================================
-- AUTH, ROLES & PERMISSIONS
-- ============================================================================
CREATE TABLE permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_roles_restaurant_name UNIQUE (restaurant_id, name)
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auth_user_id UUID UNIQUE, -- references auth.users(id) in Supabase Auth
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT,
  pin_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_restaurant_email UNIQUE (restaurant_id, email)
);
CREATE INDEX idx_users_restaurant ON users(restaurant_id);
CREATE INDEX idx_users_auth_id ON users(auth_user_id);

CREATE TABLE user_branches (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);

-- ============================================================================
-- AUDIT & NOTIFICATIONS
-- ============================================================================
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  recipient_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_lookup ON notifications(branch_id, recipient_user_id, read_at);

-- ============================================================================
-- FLOORS & TABLES
-- ============================================================================
CREATE TABLE floors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_floors_branch ON floors(branch_id);

CREATE TABLE tables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  name TEXT,
  capacity INTEGER NOT NULL DEFAULT 2,
  status table_status NOT NULL DEFAULT 'AVAILABLE',
  status_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 80,
  height DOUBLE PRECISION NOT NULL DEFAULT 80,
  rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
  shape TEXT NOT NULL DEFAULT 'square',
  color TEXT,
  assigned_waiter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  qr_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tables_floor_number UNIQUE (floor_id, number)
);
CREATE INDEX idx_tables_floor ON tables(floor_id);

CREATE TABLE table_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g. "waiter", "bill", "water"
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  resolved_at TIMESTAMPTZ,
  resolved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MENU & KITCHEN STATIONS
-- ============================================================================
CREATE TABLE menu_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_website BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_menu_categories_branch ON menu_categories(branch_id);

CREATE TABLE kitchen_stations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  printer_name TEXT
);
CREATE INDEX idx_kitchen_stations_branch ON kitchen_stations(branch_id);

CREATE TABLE modifier_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selection INTEGER NOT NULL DEFAULT 0,
  max_selection INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_modifier_groups_branch ON modifier_groups(branch_id);

CREATE TABLE modifier_options (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  modifier_group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_modifier_options_group ON modifier_options(modifier_group_id);

CREATE TABLE menu_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  kitchen_station_id TEXT REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  half_price NUMERIC(10, 2),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_veg BOOLEAN NOT NULL DEFAULT FALSE,
  spice_level spice_level NOT NULL DEFAULT 'NONE',
  preparation_time_minutes INTEGER NOT NULL DEFAULT 15,
  image_url TEXT,
  tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  barcode TEXT,
  is_direct_stock_item BOOLEAN NOT NULL DEFAULT FALSE,
  direct_stock_ingredient_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_menu_items_branch ON menu_items(branch_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

CREATE TABLE menu_item_modifiers (
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, modifier_group_id)
);

-- ============================================================================
-- CUSTOMERS, RESERVATIONS & WAITLIST
-- ============================================================================
CREATE TABLE customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  loyalty_points_balance INTEGER NOT NULL DEFAULT 0,
  total_orders_count INTEGER NOT NULL DEFAULT 0,
  total_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_branch_phone ON customers(branch_id, phone);

CREATE TABLE reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  reservation_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reservations_branch ON reservations(branch_id, reservation_time);

CREATE TABLE waitlist_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'WAITING',
  notified_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_waitlist_branch ON waitlist_entries(branch_id, status);

CREATE TABLE delivery_zones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_fee NUMERIC(8, 2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(8, 2) NOT NULL DEFAULT 0,
  estimated_delivery_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- ORDERS, KOTS, BILLING & PAYMENTS
-- ============================================================================
CREATE TABLE orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  type order_type NOT NULL DEFAULT 'DINE_IN',
  status order_status NOT NULL DEFAULT 'OPEN',
  acceptance order_acceptance NOT NULL DEFAULT 'NOT_REQUIRED',
  cancel_source TEXT,
  cancel_reason TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  discount_type TEXT,
  discount_value NUMERIC(10, 2),
  coupon_code TEXT,
  promotion_name TEXT,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  loyalty_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  guest_name TEXT,
  driver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_orders_branch_number UNIQUE (branch_id, order_number)
);
CREATE INDEX idx_orders_branch_status ON orders(branch_id, status);
CREATE INDEX idx_orders_table ON orders(table_id);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_snapshot NUMERIC(10, 2) NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL,
  tax_rate_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 0,
  is_half_portion BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_item_modifiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_option_id TEXT REFERENCES modifier_options(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_adj_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE kots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kitchen_station_id TEXT REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  kot_number TEXT NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  status kot_status NOT NULL DEFAULT 'NEW',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kots_order ON kots(order_id);
CREATE INDEX idx_kots_status ON kots(status);

CREATE TABLE kot_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kot_id TEXT NOT NULL REFERENCES kots(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT
);
CREATE INDEX idx_kot_items_kot ON kot_items(kot_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL DEFAULT 'CASH',
  amount NUMERIC(12, 2) NOT NULL,
  tendered NUMERIC(12, 2),
  change_given NUMERIC(12, 2),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_order ON payments(order_id);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  processed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY & SUPPLIERS
-- ============================================================================
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  unit ingredient_unit NOT NULL DEFAULT 'KG',
  reorder_level NUMERIC(12, 3) NOT NULL DEFAULT 0,
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12, 4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ingredients_branch_name UNIQUE (branch_id, name)
);
CREATE INDEX idx_ingredients_branch ON ingredients(branch_id);

CREATE TABLE recipe_ingredients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recipe_menu_ingredient UNIQUE (menu_item_id, ingredient_id)
);

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number TEXT NOT NULL,
  status purchase_order_status NOT NULL DEFAULT 'DRAFT',
  expected_date TIMESTAMPTZ,
  notes TEXT,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_purchase_orders_branch_number UNIQUE (branch_id, po_number)
);

CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_ordered NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(12, 4) NOT NULL,
  quantity_received NUMERIC(12, 3) NOT NULL DEFAULT 0
);

CREATE TABLE goods_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  grn_number TEXT NOT NULL,
  notes TEXT,
  received_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_goods_receipts_branch_number UNIQUE (branch_id, grn_number)
);

CREATE TABLE goods_receipt_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  purchase_order_item_id TEXT REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(12, 4) NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  goods_receipt_item_id TEXT REFERENCES goods_receipt_items(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date TIMESTAMPTZ,
  quantity_received NUMERIC(12, 3) NOT NULL,
  quantity_remaining NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(12, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  type TEXT NOT NULL, -- "IN", "OUT", "WASTE", "ADJUSTMENT"
  quantity NUMERIC(12, 3) NOT NULL,
  balance_after NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(12, 4) NOT NULL,
  reference_type TEXT, -- "ORDER", "GRN", "WASTE"
  reference_id TEXT,
  notes TEXT,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stock_movements_lookup ON stock_movements(branch_id, ingredient_id, created_at);

CREATE TABLE waste_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  cost_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MARKETING, FINANCE & OPERATIONS
-- ============================================================================
CREATE TABLE gift_cards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  initial_balance NUMERIC(10, 2) NOT NULL,
  current_balance NUMERIC(10, 2) NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_gift_cards_branch_code UNIQUE (branch_id, code)
);

CREATE TABLE coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PERCENT', -- 'PERCENT' or 'FIXED'
  value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_coupons_branch_code UNIQUE (branch_id, code)
);

CREATE TABLE promotions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PERCENT',
  value NUMERIC(10, 2) NOT NULL,
  start_time TEXT, -- "17:00"
  end_time TEXT,   -- "20:00"
  days_of_week INTEGER[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_closings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_sales NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_refunds NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  counted_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discrepancy NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shifts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  role_label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  paid_from_cash BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_url TEXT,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's restaurant_id
CREATE OR REPLACE FUNCTION get_auth_restaurant_id()
RETURNS TEXT AS $$
  SELECT restaurant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Permissive policy for authenticated staff within their restaurant
CREATE POLICY "restaurant_isolation_restaurants" ON restaurants
  FOR ALL TO authenticated
  USING (id = get_auth_restaurant_id());

CREATE POLICY "restaurant_isolation_branches" ON branches
  FOR ALL TO authenticated
  USING (restaurant_id = get_auth_restaurant_id());

CREATE POLICY "restaurant_isolation_users" ON users
  FOR ALL TO authenticated
  USING (restaurant_id = get_auth_restaurant_id());

CREATE POLICY "restaurant_isolation_orders" ON orders
  FOR ALL TO authenticated
  USING (branch_id IN (SELECT id FROM branches WHERE restaurant_id = get_auth_restaurant_id()));

CREATE POLICY "restaurant_isolation_kots" ON kots
  FOR ALL TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT id FROM branches WHERE restaurant_id = get_auth_restaurant_id())));

CREATE POLICY "restaurant_isolation_tables" ON tables
  FOR ALL TO authenticated
  USING (floor_id IN (SELECT id FROM floors WHERE branch_id IN (SELECT id FROM branches WHERE restaurant_id = get_auth_restaurant_id())));

CREATE POLICY "restaurant_isolation_menu" ON menu_items
  FOR ALL TO authenticated
  USING (branch_id IN (SELECT id FROM branches WHERE restaurant_id = get_auth_restaurant_id()));

-- Public policies for guest QR ordering & kiosk token access
CREATE POLICY "public_read_menu" ON menu_items
  FOR SELECT TO anon, authenticated
  USING (is_available = true);

CREATE POLICY "public_read_categories" ON menu_categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND show_on_website = true);

CREATE POLICY "public_read_table_by_qr" ON tables
  FOR SELECT TO anon, authenticated
  USING (qr_token IS NOT NULL);

CREATE POLICY "public_create_order" ON orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public_create_order_items" ON order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- SUPABASE REALTIME ENABLEMENT
-- ============================================================================
-- Add high-frequency tables to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'kots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE kots;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tables;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'table_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE table_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;


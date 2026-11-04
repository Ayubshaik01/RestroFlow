-- Supabase Seed Data for Restaurant POS

-- 1. SEED PERMISSIONS
INSERT INTO permissions (id, key, label, category) VALUES
  ('perm-1', 'sales.view', 'View Sales', 'Sales'),
  ('perm-2', 'dashboard.sales.view', 'View Dashboard Revenue & Sales Reports', 'Sales'),
  ('perm-3', 'orders.create', 'Create Orders', 'Orders'),
  ('perm-4', 'orders.edit', 'Edit Orders', 'Orders'),
  ('perm-5', 'orders.cancel', 'Cancel Orders', 'Orders'),
  ('perm-6', 'orders.accept', 'Accept / Decline Incoming Orders', 'Orders'),
  ('perm-7', 'discounts.apply', 'Apply Discounts', 'Orders'),
  ('perm-8', 'refunds.process', 'Process Refunds', 'Orders'),
  ('perm-9', 'orders.delete', 'Delete Past Transactions', 'Orders'),
  ('perm-10', 'bills.print', 'Print Bills', 'Orders'),
  ('perm-11', 'tables.view', 'View Floors & Tables (read-only)', 'Tables'),
  ('perm-12', 'tables.manage', 'Manage Tables', 'Tables'),
  ('perm-13', 'menu.view', 'View Menu (read-only)', 'Menu'),
  ('perm-14', 'menu.manage', 'Manage Menu', 'Menu'),
  ('perm-15', 'inventory.manage', 'Manage Inventory', 'Inventory'),
  ('perm-16', 'reports.access', 'Access Reports', 'Reports'),
  ('perm-17', 'users.manage', 'Manage Users', 'Admin'),
  ('perm-18', 'reports.financial.view', 'View Financial Reports', 'Reports'),
  ('perm-19', 'data.export', 'Export Data', 'Reports'),
  ('perm-20', 'kds.manage', 'Manage Kitchen Display', 'Kitchen'),
  ('perm-21', 'reservations.manage', 'Manage Reservations', 'Reservations'),
  ('perm-22', 'settings.manage', 'Manage Settings', 'Admin'),
  ('perm-23', 'customers.manage', 'Manage Customers & Loyalty', 'CRM'),
  ('perm-24', 'audit_log.view', 'View Audit Log', 'Admin'),
  ('perm-25', 'roles.manage', 'Manage Roles', 'Admin'),
  ('perm-26', 'backup.manage', 'Manage Backups', 'Admin'),
  ('perm-27', 'attendance.manage', 'Manage Staff Attendance', 'Staff'),
  ('perm-28', 'delivery.manage', 'Manage Deliveries', 'Delivery'),
  ('perm-29', 'staff.manage', 'Manage Staff Schedules, Leave & Payroll', 'Staff'),
  ('perm-30', 'accounting.manage', 'Manage Accounting', 'Accounting'),
  ('perm-31', 'marketing.manage', 'Manage Coupons, Promotions & Campaigns', 'Marketing'),
  ('perm-32', 'operations.manage', 'Manage Equipment & Documents', 'Operations'),
  ('perm-33', 'system.update', 'Manage App Updates', 'Admin')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category;

-- 2. SEED DEMO RESTAURANT & BRANCH (Locked down public signup by default)
INSERT INTO restaurants (id, name, legal_name, currency, timezone, loyalty_point_value, loyalty_earn_per_currency, allow_public_signup)
VALUES (
  'demo-restaurant',
  'RestroFlow Bistro (Demo)',
  'RestroFlow Hospitality Ltd',
  'INR',
  'Asia/Kolkata',
  1.00,
  100,
  false
) ON CONFLICT (id) DO UPDATE SET allow_public_signup = false;

INSERT INTO branches (id, restaurant_id, name, address, phone, gst_number, country, tax_regime, tax_mode, tax_label)
VALUES (
  'demo-branch',
  'demo-restaurant',
  'Main Branch',
  '123 MG Road, Bengaluru, Karnataka',
  '+91 98765 43210',
  '29AAAAA0000A1Z5',
  'IN',
  'INDIA_GST',
  'INCLUSIVE',
  'GST'
) ON CONFLICT (id) DO NOTHING;

-- 3. SEED ROLES
INSERT INTO roles (id, restaurant_id, name, label, is_system) VALUES
  ('role-owner', 'demo-restaurant', 'OWNER', 'Owner', true),
  ('role-manager', 'demo-restaurant', 'RESTAURANT_MANAGER', 'Restaurant Manager', true),
  ('role-cashier', 'demo-restaurant', 'CASHIER', 'Cashier', true),
  ('role-waiter', 'demo-restaurant', 'WAITER', 'Waiter', true),
  ('role-chef', 'demo-restaurant', 'CHEF', 'Chef / Kitchen Staff', true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- Grant all permissions to OWNER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-owner', id FROM permissions
ON CONFLICT DO NOTHING;

-- Grant permissions to RESTAURANT_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-manager', id FROM permissions
WHERE key NOT IN ('system.update')
ON CONFLICT DO NOTHING;

-- Grant permissions to CASHIER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-cashier', id FROM permissions
WHERE key IN ('orders.create', 'orders.edit', 'orders.accept', 'bills.print', 'discounts.apply', 'sales.view', 'customers.manage', 'dashboard.sales.view', 'menu.view', 'tables.view')
ON CONFLICT DO NOTHING;

-- Grant permissions to WAITER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-waiter', id FROM permissions
WHERE key IN ('orders.create', 'orders.edit', 'menu.view', 'tables.view')
ON CONFLICT DO NOTHING;

-- Grant permissions to CHEF
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-chef', id FROM permissions
WHERE key IN ('kds.manage', 'orders.accept')
ON CONFLICT DO NOTHING;

-- 4. SEED MULTI-ROLE USERS & PIN SWITCH
-- Password for all: RestroFlow@123
INSERT INTO users (id, restaurant_id, role_id, name, email, phone, password_hash, pin_hash, is_active)
VALUES
  ('demo-owner-user', 'demo-restaurant', 'role-owner', 'Rajesh Sharma (Owner)', 'owner@demo.local', '+91 98765 43210', '$2b$10$wE9mI1lZ9fEfl6Q4qV2d0.u27y5L/q8e1vU5z8c8P.r0s1u2t3v4w', '$2a$10$kPjHk2qGkLpZ7W4Xm6p8YOKmP2gW2mH4lM6n8rT0uV2wX4yZ6a8bC', true),
  ('demo-manager-user', 'demo-restaurant', 'role-manager', 'Priya Patel (Manager)', 'manager@demo.local', '+91 98765 43211', '$2b$10$wE9mI1lZ9fEfl6Q4qV2d0.u27y5L/q8e1vU5z8c8P.r0s1u2t3v4w', '$2a$10$7Zz3o8tQo4iP1.w0tLwXCe1yT1mN3mI2hK4m6p8rT0uV2wX4yZ6a.', true),
  ('demo-cashier-user', 'demo-restaurant', 'role-cashier', 'Amit Kumar (Cashier)', 'cashier@demo.local', '+91 98765 43212', '$2b$10$wE9mI1lZ9fEfl6Q4qV2d0.u27y5L/q8e1vU5z8c8P.r0s1u2t3v4w', '$2a$10$1A2B3C4D5E6F7G8H9I0J1uK2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z', true),
  ('demo-waiter-user', 'demo-restaurant', 'role-waiter', 'Rahul Verma (Waiter)', 'waiter@demo.local', '+91 98765 43213', '$2b$10$wE9mI1lZ9fEfl6Q4qV2d0.u27y5L/q8e1vU5z8c8P.r0s1u2t3v4w', '$2a$10$9A8B7C6D5E4F3G2H1I0J9uK8L7M6N5O4P3Q2R1S0T9U8V7W6X5Y4Z', true),
  ('demo-chef-user', 'demo-restaurant', 'role-chef', 'Vikram Singh (Head Chef)', 'chef@demo.local', '+91 98765 43214', '$2b$10$wE9mI1lZ9fEfl6Q4qV2d0.u27y5L/q8e1vU5z8c8P.r0s1u2t3v4w', '$2a$10$5M4N3O2P1Q0R9S8T7U6V5uW4X3Y2Z1A0B9C8D7E6F5G4H3I2J1K0L', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role_id = EXCLUDED.role_id;

INSERT INTO user_branches (user_id, branch_id)
VALUES
  ('demo-owner-user', 'demo-branch'),
  ('demo-manager-user', 'demo-branch'),
  ('demo-cashier-user', 'demo-branch'),
  ('demo-waiter-user', 'demo-branch'),
  ('demo-chef-user', 'demo-branch')
ON CONFLICT DO NOTHING;

-- 5. SEED FLOOR & TABLES
INSERT INTO floors (id, branch_id, name, sort_order)
VALUES ('demo-floor-1', 'demo-branch', 'Ground Floor (Main Hall)', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tables (id, floor_id, number, name, capacity, status, pos_x, pos_y, width, height, shape, qr_token)
VALUES
  ('table-1', 'demo-floor-1', '1', 'Table 1', 4, 'AVAILABLE', 40, 40, 90, 90, 'square', 'qr-demo-table-1'),
  ('table-2', 'demo-floor-1', '2', 'Table 2', 4, 'AVAILABLE', 160, 40, 90, 90, 'square', 'qr-demo-table-2'),
  ('table-3', 'demo-floor-1', '3', 'Table 3', 2, 'AVAILABLE', 280, 40, 80, 80, 'round', 'qr-demo-table-3'),
  ('table-4', 'demo-floor-1', '4', 'Table 4', 6, 'AVAILABLE', 40, 160, 120, 80, 'rect', 'qr-demo-table-4'),
  ('table-5', 'demo-floor-1', '5', 'Table 5', 4, 'AVAILABLE', 180, 160, 90, 90, 'square', 'qr-demo-table-5'),
  ('table-6', 'demo-floor-1', '6', 'Table 6', 8, 'AVAILABLE', 290, 160, 140, 80, 'rect', 'qr-demo-table-6')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED KITCHEN STATIONS & MENU CATEGORIES
INSERT INTO kitchen_stations (id, branch_id, name)
VALUES
  ('station-main', 'demo-branch', 'Main Kitchen'),
  ('station-bar', 'demo-branch', 'Beverage Bar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_categories (id, branch_id, name, sort_order, is_active, show_on_website)
VALUES
  ('cat-starters', 'demo-branch', 'Starters & Appetizers', 1, true, true),
  ('cat-mains', 'demo-branch', 'Main Course', 2, true, true),
  ('cat-breads', 'demo-branch', 'Breads & Rice', 3, true, true),
  ('cat-drinks', 'demo-branch', 'Beverages & Mocktails', 4, true, true),
  ('cat-desserts', 'demo-branch', 'Desserts', 5, true, true)
ON CONFLICT (id) DO NOTHING;

-- 7. SEED SAMPLE MENU ITEMS
INSERT INTO menu_items (
  id, branch_id, category_id, kitchen_station_id, name, description, price, is_veg, spice_level, preparation_time_minutes, tax_rate_percent, is_available
) VALUES
  ('item-paneer-tikka', 'demo-branch', 'cat-starters', 'station-main', 'Paneer Tikka', 'Tandoor-charred cottage cheese marinated in spiced yogurt and peppers', 260.00, true, 'MEDIUM', 15, 5.00, true),
  ('item-chicken-wings', 'demo-branch', 'cat-starters', 'station-main', 'Crispy Peri-Peri Wings', 'Crispy chicken wings tossed in homemade peri-peri glaze', 310.00, false, 'HOT', 15, 5.00, true),
  ('item-butter-chicken', 'demo-branch', 'cat-mains', 'station-main', 'Old Delhi Butter Chicken', 'Tender tandoori chicken simmered in rich creamy tomato cashew gravy', 390.00, false, 'MILD', 20, 5.00, true),
  ('item-dal-makhani', 'demo-branch', 'cat-mains', 'station-main', 'Dal Makhani Special', 'Slow-cooked black lentils finished with fresh cream and butter', 280.00, true, 'NONE', 15, 5.00, true),
  ('item-garlic-naan', 'demo-branch', 'cat-breads', 'station-main', 'Butter Garlic Naan', 'Clay oven leavened bread brushed with garlic butter', 70.00, true, 'NONE', 8, 5.00, true),
  ('item-biryani', 'demo-branch', 'cat-breads', 'station-main', 'Hyderabadi Dum Biryani', 'Fragrant basmati rice layered with spiced marinated chicken and saffron', 350.00, false, 'MEDIUM', 25, 5.00, true),
  ('item-mango-cooler', 'demo-branch', 'cat-drinks', 'station-bar', 'Fresh Mango Mint Cooler', 'Alphonso mango puree, fresh mint, lime, and sparkling soda', 160.00, true, 'NONE', 5, 5.00, true),
  ('item-gulab-jamun', 'demo-branch', 'cat-desserts', 'station-main', 'Gulab Jamun with Ice Cream', 'Warm golden dumplings served with vanilla bean ice cream', 140.00, true, 'NONE', 5, 5.00, true)
ON CONFLICT (id) DO NOTHING;

export interface ReportCatalogItem {
  key: string;
  title: string;
  group: string;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  { key: "sales-daily", title: "Daily Sales Summary", group: "Sales" },
  { key: "sales-by-item", title: "Sales by Menu Item", group: "Sales" },
  { key: "sales-by-category", title: "Sales by Category", group: "Sales" },
  { key: "popular-items", title: "Top 25 Popular Items", group: "Sales" },
  { key: "slow-movers", title: "Slow Moving Items", group: "Sales" },
  { key: "payment-methods", title: "Payment Methods Breakdown", group: "Sales" },
  { key: "discounts", title: "Discounts & Coupon Usage", group: "Sales" },
  { key: "tax", title: "Tax (GST / VAT) Summary", group: "Tax" },
  { key: "peak-hours", title: "Peak Ordering Hours Heatmap", group: "Analytics" },
  { key: "food-cost", title: "Food Cost & Margins", group: "Analytics" },
  { key: "customers", title: "Top Customers by Spend", group: "Customers" },
  { key: "retention", title: "New vs Returning Guests", group: "Customers" },
  { key: "staff-sales", title: "Staff Sales Performance", group: "Staff" },
  { key: "table-turnover", title: "Table Turnover & Occupancy", group: "Operations" },
  { key: "reservations", title: "Reservations Summary", group: "Operations" },
  { key: "delivery", title: "Delivery Fleet Analytics", group: "Operations" },
  { key: "waste", title: "Inventory Waste Log", group: "Inventory" },
  { key: "inventory-valuation", title: "Inventory Valuation", group: "Inventory" },
];

import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_CATALOG } from "./catalog";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface GeneratedReport {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}

export async function generateReportData(
  key: string,
  branchId: string,
  fromStr: string,
  toStr: string,
): Promise<GeneratedReport | null> {
  const fromDate = new Date(`${fromStr}T00:00:00.000Z`).toISOString();
  const toDate = new Date(`${toStr}T23:59:59.999Z`).toISOString();

  const catalogEntry = REPORT_CATALOG.find((r) => r.key === key);
  if (!catalogEntry) {
    return null;
  }

  const admin = createAdminClient();
  const title = catalogEntry.title;

  switch (key) {
    case "sales-daily": {
      const { data: orders } = await admin
        .from("orders")
        .select("created_at, total_amount, subtotal, tax_amount, discount_amount, tip_amount, status")
        .eq("branch_id", branchId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: true });

      const dayMap = new Map<string, { count: number; sales: number; tax: number; discounts: number; tips: number }>();

      (orders || []).forEach((o: any) => {
        const day = (o.created_at || "").slice(0, 10);
        const current = dayMap.get(day) || { count: 0, sales: 0, tax: 0, discounts: 0, tips: 0 };
        current.count += 1;
        current.sales += Number(o.total_amount || 0) - Number(o.tip_amount || 0);
        current.tax += Number(o.tax_amount || 0);
        current.discounts += Number(o.discount_amount || 0);
        current.tips += Number(o.tip_amount || 0);
        dayMap.set(day, current);
      });

      const rows = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, stats]) => [
          day,
          stats.count,
          round2(stats.sales),
          round2(stats.tax),
          round2(stats.discounts),
          round2(stats.tips),
        ]);

      return {
        key,
        title,
        columns: ["Date", "Orders", "Sales (excl. tips) ($)", "Tax ($)", "Discounts ($)", "Tips ($)"],
        rows,
      };
    }

    case "sales-by-item":
    case "popular-items":
    case "slow-movers": {
      const { data: items } = await admin
        .from("order_items")
        .select("name_snapshot, quantity, line_total, orders!inner(branch_id, created_at)")
        .eq("orders.branch_id", branchId)
        .gte("orders.created_at", fromDate)
        .lte("orders.created_at", toDate);

      const itemMap = new Map<string, { qty: number; revenue: number }>();

      (items || []).forEach((item: any) => {
        const name = item.name_snapshot || "Item";
        const cur = itemMap.get(name) || { qty: 0, revenue: 0 };
        cur.qty += Number(item.quantity || 1);
        cur.revenue += Number(item.line_total || 0);
        itemMap.set(name, cur);
      });

      let rows = Array.from(itemMap.entries()).map(([name, stat]) => ({
        name,
        qty: stat.qty,
        revenue: round2(stat.revenue),
      }));

      if (key === "popular-items") {
        rows.sort((a, b) => b.qty - a.qty);
        rows = rows.slice(0, 25);
      } else if (key === "slow-movers") {
        rows.sort((a, b) => a.qty - b.qty);
        rows = rows.slice(0, 25);
      } else {
        rows.sort((a, b) => b.revenue - a.revenue);
      }

      return {
        key,
        title,
        columns: ["Item Name", "Quantity Sold", "Total Revenue ($)"],
        rows: rows.map((r) => [r.name, r.qty, r.revenue]),
      };
    }

    case "sales-by-category": {
      const { data: items } = await admin
        .from("order_items")
        .select("quantity, line_total, menu_items!inner(category_id, menu_categories!inner(name)), orders!inner(branch_id, created_at)")
        .eq("orders.branch_id", branchId)
        .gte("orders.created_at", fromDate)
        .lte("orders.created_at", toDate);

      const catMap = new Map<string, { qty: number; revenue: number }>();

      (items || []).forEach((item: any) => {
        const categoryName = item.menu_items?.menu_categories?.name || "General";
        const cur = catMap.get(categoryName) || { qty: 0, revenue: 0 };
        cur.qty += Number(item.quantity || 1);
        cur.revenue += Number(item.line_total || 0);
        catMap.set(categoryName, cur);
      });

      const rows = Array.from(catMap.entries())
        .map(([cat, stat]) => [cat, stat.qty, round2(stat.revenue)])
        .sort((a, b) => Number(b[2]) - Number(a[2]));

      return {
        key,
        title,
        columns: ["Category", "Quantity Sold", "Revenue ($)"],
        rows,
      };
    }

    case "payment-methods": {
      const { data: payments } = await admin
        .from("payments")
        .select("method, amount, orders!inner(branch_id, created_at)")
        .eq("orders.branch_id", branchId)
        .gte("orders.created_at", fromDate)
        .lte("orders.created_at", toDate);

      const methodMap = new Map<string, { count: number; total: number }>();

      (payments || []).forEach((p: any) => {
        const method = p.method || "OTHER";
        const cur = methodMap.get(method) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(p.amount || 0);
        methodMap.set(method, cur);
      });

      const rows = Array.from(methodMap.entries())
        .map(([method, stat]) => [method, stat.count, round2(stat.total)])
        .sort((a, b) => Number(b[2]) - Number(a[2]));

      return {
        key,
        title,
        columns: ["Payment Method", "Transactions", "Total Amount ($)"],
        rows,
      };
    }

    case "discounts": {
      const { data: orders } = await admin
        .from("orders")
        .select("order_number, created_at, discount_amount, coupon_code, discount_percent, total_amount")
        .eq("branch_id", branchId)
        .gt("discount_amount", 0)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false });

      const rows = (orders || []).map((o: any) => [
        `#${o.order_number}`,
        (o.created_at || "").slice(0, 16).replace("T", " "),
        round2(Number(o.discount_amount || 0)),
        o.coupon_code || "Manual",
        o.discount_percent ? `${o.discount_percent}%` : "Fixed",
        round2(Number(o.total_amount || 0)),
      ]);

      return {
        key,
        title,
        columns: ["Order #", "Date & Time", "Discount ($)", "Coupon Code", "Rate", "Final Paid ($)"],
        rows,
      };
    }

    case "tax": {
      const { data: items } = await admin
        .from("order_items")
        .select("tax_rate_snapshot, line_total, orders!inner(branch_id, created_at)")
        .eq("orders.branch_id", branchId)
        .gte("orders.created_at", fromDate)
        .lte("orders.created_at", toDate);

      const taxMap = new Map<number, { taxable: number; tax: number; total: number }>();

      (items || []).forEach((i: any) => {
        const rate = Number(i.tax_rate_snapshot || 5);
        const lineTotal = Number(i.line_total || 0);
        const taxAmt = rate > 0 ? lineTotal - lineTotal / (1 + rate / 100) : 0;
        const taxable = lineTotal - taxAmt;

        const cur = taxMap.get(rate) || { taxable: 0, tax: 0, total: 0 };
        cur.taxable += taxable;
        cur.tax += taxAmt;
        cur.total += lineTotal;
        taxMap.set(rate, cur);
      });

      const rows = Array.from(taxMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([rate, stat]) => [
          `${rate}%`,
          round2(stat.taxable),
          round2(stat.tax),
          round2(stat.total),
        ]);

      const totalTaxable = rows.reduce((sum, r) => sum + Number(r[1]), 0);
      const totalTax = rows.reduce((sum, r) => sum + Number(r[2]), 0);
      const grossTotal = rows.reduce((sum, r) => sum + Number(r[3]), 0);

      if (rows.length > 0) {
        rows.push(["Summary Total", round2(totalTaxable), round2(totalTax), round2(grossTotal)]);
      }

      return {
        key,
        title,
        columns: ["Tax Rate", "Taxable Base ($)", "Tax Amount ($)", "Gross Total ($)"],
        rows,
      };
    }

    case "peak-hours": {
      const { data: orders } = await admin
        .from("orders")
        .select("created_at, total_amount")
        .eq("branch_id", branchId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const hourMap = new Map<string, { count: number; sales: number }>();

      (orders || []).forEach((o: any) => {
        if (!o.created_at) return;
        const date = new Date(o.created_at);
        const dayName = DAYS[date.getUTCDay()] || "Other";
        const hour = `${String(date.getUTCHours()).padStart(2, "0")}:00`;
        const mapKey = `${dayName} ${hour}`;

        const cur = hourMap.get(mapKey) || { count: 0, sales: 0 };
        cur.count += 1;
        cur.sales += Number(o.total_amount || 0);
        hourMap.set(mapKey, cur);
      });

      const rows = Array.from(hourMap.entries())
        .map(([timeSlot, stat]) => {
          const [day, hour] = timeSlot.split(" ");
          return [day, hour, stat.count, round2(stat.sales)];
        })
        .sort((a, b) => Number(b[2]) - Number(a[2]))
        .slice(0, 30);

      return {
        key,
        title,
        columns: ["Day", "Hour Interval", "Orders Count", "Sales ($)"],
        rows,
      };
    }

    case "food-cost": {
      const { data: menuItems } = await admin
        .from("menu_items")
        .select("id, name, price, half_price, is_veg, menu_categories(name)")
        .eq("branch_id", branchId)
        .eq("is_available", true);

      const rows = (menuItems || []).map((m: any) => {
        const price = Number(m.price || 0);
        const estimatedCost = round2(price * 0.32);
        const margin = round2(price - estimatedCost);
        const marginPct = price > 0 ? round2((margin / price) * 100) : 0;
        return [m.name, price, estimatedCost, margin, `${marginPct}%`, m.menu_categories?.name || "General"];
      });

      return {
        key,
        title,
        columns: ["Menu Item", "Selling Price ($)", "Estimated Cost ($)", "Gross Margin ($)", "Margin %", "Category"],
        rows,
      };
    }

    case "customers": {
      const { data: orders } = await admin
        .from("orders")
        .select("customer_id, total_amount, customers!inner(name, phone, loyalty_points)")
        .eq("branch_id", branchId)
        .not("customer_id", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const custMap = new Map<string, { name: string; phone: string; visits: number; spend: number; points: number }>();

      (orders || []).forEach((o: any) => {
        const id = o.customer_id;
        const cur = custMap.get(id) || {
          name: o.customers?.name || "Guest",
          phone: o.customers?.phone || "—",
          visits: 0,
          spend: 0,
          points: o.customers?.loyalty_points || 0,
        };
        cur.visits += 1;
        cur.spend += Number(o.total_amount || 0);
        custMap.set(id, cur);
      });

      const rows = Array.from(custMap.values())
        .map((c) => [c.name, c.phone, c.visits, round2(c.spend), c.points])
        .sort((a, b) => Number(b[3]) - Number(a[3]))
        .slice(0, 50);

      return {
        key,
        title,
        columns: ["Customer Name", "Phone", "Total Visits", "Total Spend ($)", "Loyalty Points"],
        rows,
      };
    }

    case "retention": {
      const { data: orders } = await admin
        .from("orders")
        .select("customer_id, total_amount")
        .eq("branch_id", branchId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const counts = new Map<string, { visits: number; spend: number }>();
      let guestOrders = 0;
      let guestSpend = 0;

      (orders || []).forEach((o: any) => {
        if (!o.customer_id) {
          guestOrders += 1;
          guestSpend += Number(o.total_amount || 0);
        } else {
          const cur = counts.get(o.customer_id) || { visits: 0, spend: 0 };
          cur.visits += 1;
          cur.spend += Number(o.total_amount || 0);
          counts.set(o.customer_id, cur);
        }
      });

      let newCusts = 0;
      let newSpend = 0;
      let retCusts = 0;
      let retSpend = 0;

      counts.forEach((v) => {
        if (v.visits === 1) {
          newCusts += 1;
          newSpend += v.spend;
        } else {
          retCusts += 1;
          retSpend += v.spend;
        }
      });

      const rows = [
        ["Repeat / Returning Customers", retCusts, counts.size > 0 ? `${round2((retCusts / counts.size) * 100)}%` : "0%", round2(retSpend)],
        ["First-Time Registered Customers", newCusts, counts.size > 0 ? `${round2((newCusts / counts.size) * 100)}%` : "0%", round2(newSpend)],
        ["Walk-in / Unregistered Diners", "—", `${guestOrders} orders`, round2(guestSpend)],
      ];

      return {
        key,
        title,
        columns: ["Guest Segment", "Customer Count", "Share (%)", "Total Revenue ($)"],
        rows,
      };
    }

    case "staff-sales": {
      const { data: orders } = await admin
        .from("orders")
        .select("created_by_id, total_amount, tip_amount, staff_profiles!created_by_id(full_name, role)")
        .eq("branch_id", branchId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const staffMap = new Map<string, { name: string; role: string; count: number; sales: number; tips: number }>();

      (orders || []).forEach((o: any) => {
        const id = o.created_by_id || "Unassigned";
        const cur = staffMap.get(id) || {
          name: (o.staff_profiles as any)?.full_name || "Staff Member",
          role: (o.staff_profiles as any)?.role || "SERVER",
          count: 0,
          sales: 0,
          tips: 0,
        };
        cur.count += 1;
        cur.sales += Number(o.total_amount || 0);
        cur.tips += Number(o.tip_amount || 0);
        staffMap.set(id, cur);
      });

      const rows = Array.from(staffMap.values())
        .map((s) => [s.name, s.role, s.count, round2(s.sales), round2(s.tips)])
        .sort((a, b) => Number(b[3]) - Number(a[3]));

      return {
        key,
        title,
        columns: ["Staff Member", "Role", "Orders Processed", "Sales Handled ($)", "Tips Received ($)"],
        rows,
      };
    }

    case "table-turnover": {
      const { data: tables } = await admin
        .from("tables")
        .select("id, number, name, capacity, status, orders(id, total_amount, created_at)")
        .eq("orders.branch_id", branchId)
        .gte("orders.created_at", fromDate)
        .lte("orders.created_at", toDate);

      const rows = (tables || []).map((t: any) => {
        const tableOrders = t.orders || [];
        const count = tableOrders.length;
        const revenue = tableOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
        return [
          `Table ${t.number}`,
          t.name || `Table ${t.number}`,
          t.capacity,
          count,
          round2(revenue),
          count > 0 ? round2(revenue / count) : 0,
        ];
      });

      rows.sort((a, b) => Number(b[4]) - Number(a[4]));

      return {
        key,
        title,
        columns: ["Table #", "Label", "Capacity", "Orders Served", "Total Revenue ($)", "Avg Check / Turnover ($)"],
        rows,
      };
    }

    case "reservations": {
      const { data: resList } = await admin
        .from("reservations")
        .select("guest_name, guest_phone, reservation_time, guest_count, status, notes, tables(number)")
        .eq("branch_id", branchId)
        .gte("reservation_time", fromDate)
        .lte("reservation_time", toDate)
        .order("reservation_time", { ascending: false });

      const rows = (resList || []).map((r: any) => [
        r.guest_name,
        r.guest_phone || "—",
        (r.reservation_time || "").slice(0, 16).replace("T", " "),
        r.guest_count,
        (r.tables as any)?.number ? `Table ${(r.tables as any).number}` : "Unassigned",
        r.status,
      ]);

      return {
        key,
        title,
        columns: ["Guest Name", "Phone", "Reserved Time", "Party Size", "Table", "Status"],
        rows,
      };
    }

    case "delivery": {
      const { data: deliveries } = await admin
        .from("orders")
        .select("order_number, created_at, total_amount, delivery_fee, delivery_orders(delivery_address, status, drivers(name))")
        .eq("branch_id", branchId)
        .eq("type", "DELIVERY")
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false });

      const rows = (deliveries || []).map((d: any) => {
        const info = Array.isArray(d.delivery_orders) ? d.delivery_orders[0] : d.delivery_orders;
        return [
          `#${d.order_number}`,
          (d.created_at || "").slice(0, 16).replace("T", " "),
          info?.delivery_address || "—",
          info?.drivers?.name || "Unassigned",
          info?.status || "PENDING",
          round2(Number(d.delivery_fee || 0)),
          round2(Number(d.total_amount || 0)),
        ];
      });

      return {
        key,
        title,
        columns: ["Order #", "Date & Time", "Address", "Driver", "Delivery Status", "Delivery Fee ($)", "Total Amount ($)"],
        rows,
      };
    }

    case "waste": {
      const { data: waste } = await admin
        .from("waste_logs")
        .select("quantity, reason, cost, created_at, ingredients(name, unit)")
        .eq("branch_id", branchId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false });

      const rows = (waste || []).map((w: any) => [
        (w.created_at || "").slice(0, 10),
        (w.ingredients as any)?.name || "Ingredient",
        `${w.quantity} ${(w.ingredients as any)?.unit || ""}`,
        w.reason || "Expired / Spoilage",
        round2(Number(w.cost || 0)),
      ]);

      return {
        key,
        title,
        columns: ["Log Date", "Ingredient", "Quantity Discarded", "Waste Reason", "Estimated Cost ($)"],
        rows,
      };
    }

    case "inventory-valuation": {
      const { data: ingredients } = await admin
        .from("ingredients")
        .select("name, current_stock, min_stock, unit, cost_per_unit, cost_per_kg")
        .eq("branch_id", branchId)
        .order("name", { ascending: true });

      const rows = (ingredients || []).map((ing: any) => {
        const cost = Number(ing.cost_per_unit || ing.cost_per_kg || 0);
        const stock = Number(ing.current_stock || 0);
        const valuation = round2(stock * cost);
        return [ing.name, stock, ing.unit || "unit", cost, valuation, stock <= Number(ing.min_stock || 0) ? "LOW" : "OK"];
      });

      const totalValuation = rows.reduce((sum, r) => sum + Number(r[4]), 0);
      if (rows.length > 0) {
        rows.push(["Total Inventory Asset Value", "", "", "", round2(totalValuation), ""]);
      }

      return {
        key,
        title,
        columns: ["Ingredient Name", "Stock Quantity", "Unit", "Cost / Unit ($)", "Valuation ($)", "Status"],
        rows,
      };
    }

    default: {
      return {
        key,
        title,
        columns: ["Metric", "Value"],
        rows: [
          ["Report Period", `${fromStr} to ${toStr}`],
          ["Branch ID", branchId],
          ["Status", "No additional metrics recorded"],
        ],
      };
    }
  }
}

export function formatReportToCsv(report: GeneratedReport): string {
  const escapeCell = (cell: string | number | null): string => {
    if (cell === null || cell === undefined) return "";
    const str = String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = report.columns.map(escapeCell).join(",");
  const rowLines = report.rows.map((row) => row.map(escapeCell).join(","));

  return [headerLine, ...rowLines].join("\r\n");
}

export function formatReportToExcelXml(report: GeneratedReport, fromStr: string, toStr: string): string {
  const sanitize = (val: string | number | null) => {
    if (val === null || val === undefined) return "";
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  const rowsXml = report.rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const isNum = typeof cell === "number" || (!isNaN(Number(cell)) && cell !== "" && !String(cell).startsWith("#") && !String(cell).startsWith("+"));
          const type = isNum && typeof cell === "number" ? "Number" : "String";
          return `<Cell ss:StyleID="${type === "Number" ? "Num" : "Default"}"><Data ss:Type="${type}">${sanitize(cell)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("\n");

  const headerCells = report.columns
    .map((col) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${sanitize(col)}</Data></Cell>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Calibri" ss:Size="11"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="Default">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Num">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:Bold="1" ss:Size="14" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:Italic="1" ss:Size="10" ss:Color="#64748B"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Report">
  <Table>
   <Row>
    <Cell ss:StyleID="Title"><Data ss:Type="String">${sanitize(report.title)} - RestroFlow</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Subtitle"><Data ss:Type="String">Period: ${fromStr} to ${toStr} | Created by ayubshaik01</Data></Cell>
   </Row>
   <Row/>
   <Row>${headerCells}</Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function formatReportToHtml(report: GeneratedReport, fromStr: string, toStr: string): string {
  const sanitize = (val: string | number | null) => {
    if (val === null || val === undefined) return "—";
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report.title} - RestroFlow POS</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
    .brand span { color: #f97316; }
    .meta { font-size: 13px; color: #64748b; line-height: 1.5; }
    .title { font-size: 18px; font-weight: 700; margin: 0 0 6px 0; }
    .badge { display: inline-block; background: #f1f5f9; color: #334155; font-size: 12px; padding: 4px 8px; border-radius: 6px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 12px; font-weight: 600; letter-spacing: 0.3px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { font-weight: 700; border-top: 2px solid #0f172a; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 8px;">
    <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">Restro<span>Flow</span> POS</div>
      <h1 class="title">${sanitize(report.title)}</h1>
      <div class="meta">Reporting Range: <strong>${fromStr}</strong> to <strong>${toStr}</strong></div>
    </div>
    <div style="text-align: right;">
      <span class="badge">Official Report</span>
      <div class="meta" style="margin-top: 4px;">Generated: ${new Date().toLocaleString()}</div>
      <div class="meta">Architect: ayubshaik01</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        ${report.columns.map((c) => `<th>${sanitize(c)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${report.rows
        .map(
          (row) => `<tr>${row.map((cell) => `<td class="${typeof cell === "number" ? "num" : ""}">${sanitize(cell)}</td>`).join("")}</tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <div class="footer">
    <span>RestroFlow Restaurant POS &amp; Business Intelligence Suite</span>
    <span>Page 1 of 1 • System ID: ${report.key}</span>
  </div>
  <script>
    if (window.location.search.includes('autoprint=true')) {
      window.onload = () => { setTimeout(() => window.print(), 300); };
    }
  </script>
</body>
</html>`;
}


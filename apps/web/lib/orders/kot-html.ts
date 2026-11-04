function esc(value: string | number | null | undefined): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

export interface KotPrintData {
  orderNumber: string;
  type: string;
  createdAt: Date | string;
  table?: { label: string } | null;
  roundNumber?: number;
  items: {
    nameSnapshot: string;
    quantity: number;
    notes?: string | null;
    modifiers?: { nameSnapshot: string }[];
  }[];
}

export function buildKotHtml({
  branchName,
  stationName,
  order,
}: {
  branchName: string;
  stationName?: string;
  order: KotPrintData;
}): string {
  const dateStr = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemRows = order.items
    .map((item) => {
      const modifierLines = (item.modifiers ?? [])
        .map((m) => `<div class="sub">+ ${esc(m.nameSnapshot)}</div>`)
        .join("");
      const noteLine = item.notes ? `<div class="sub note">Note: ${esc(item.notes)}</div>` : "";
      return `
        <tr>
          <td class="qty">${item.quantity}x</td>
          <td class="name">
            <strong>${esc(item.nameSnapshot)}</strong>
            ${modifierLines}
            ${noteLine}
          </td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>KOT #${esc(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, monospace; margin: 0; padding: 4mm; color: #000; width: 80mm; }
  .center { text-align: center; }
  .header { font-size: 16px; font-weight: 800; text-align: center; margin-bottom: 2px; }
  .station { font-size: 14px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .rule { border: none; border-top: 2px dashed #000; margin: 5px 0; }
  .meta { font-size: 12px; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 4px; }
  td { padding: 4px 0; vertical-align: top; }
  .qty { width: 35px; font-weight: 800; font-size: 16px; }
  .sub { font-size: 11px; margin-left: 4px; }
  .note { font-style: italic; font-weight: 600; }
  @page { size: 80mm auto; margin: 0; }
</style>
</head>
<body>
  <script>
    window.addEventListener('message', function (e) { if (e.data === 'print') window.print(); });
  </script>
  <div>
    <div class="header">*** KITCHEN ORDER TICKET ***</div>
    ${stationName ? `<div class="station">[ ${esc(stationName)} ]</div>` : ""}
    <div class="center meta">${esc(branchName)}</div>
    <hr class="rule">
    <div class="meta">
      <strong>Order #${esc(order.orderNumber)}</strong> &middot; ${esc(order.type)}<br>
      ${order.table ? `<strong>Table: ${esc(order.table.label)}</strong> &middot; ` : ""}Time: ${esc(dateStr)}
      ${order.roundNumber ? `<br>Round: #${order.roundNumber}` : ""}
    </div>
    <hr class="rule">
    <table>
      <tbody>${itemRows}</tbody>
    </table>
    <hr class="rule">
  </div>
</body>
</html>`;
}


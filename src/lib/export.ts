import { formatDateTime, type RepairRequest } from "./requests";

const HEADERS = [
  "№",
  "Дата создания",
  "Улица",
  "Дом",
  "Подъезд",
  "Этаж",
  "Квартира",
  "Заявитель",
  "Телефон",
  "Суть заявки",
  "Статус",
  "Дата выполнения",
  "Результат",
];

function toRows(list: RepairRequest[]) {
  return list.map((r, i) => [
    i + 1,
    formatDateTime(r.createdAt),
    r.street,
    r.house,
    r.entrance,
    r.floor,
    r.apartment,
    r.applicant,
    r.phone,
    r.description,
    r.status,
    formatDateTime(r.completedAt),
    r.result || "",
  ]);
}

function fileStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

export async function exportToExcel(list: RepairRequest[]) {
  const XLSX = await import("xlsx");
  const rows = toRows(list);
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 17 },
    { wch: 16 },
    { wch: 6 },
    { wch: 8 },
    { wch: 6 },
    { wch: 9 },
    { wch: 22 },
    { wch: 18 },
    { wch: 45 },
    { wch: 14 },
    { wch: 17 },
    { wch: 45 },
  ];
  ws["!rows"] = [{ hpt: 22 }];
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: HEADERS.length - 1, r: rows.length } }) };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Заявки");
  XLSX.writeFile(wb, `Заявки_на_ремонт_${fileStamp()}.xlsx`);
}

async function fetchFontBase64(url: string) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function exportToPdf(list: RepairRequest[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const [regular, bold] = await Promise.all([
    fetchFontBase64("/fonts/Roboto-Regular.ttf"),
    fetchFontBase64("/fonts/Roboto-Bold.ttf"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addFileToVFS("Roboto-Regular.ttf", regular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", bold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(14);
  doc.text("Заявки на ремонт электрики", 14, 14);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.text(`Сформировано: ${formatDateTime(new Date().toISOString())} · Всего заявок: ${list.length}`, 14, 20);

  autoTable(doc, {
    head: [HEADERS],
    body: toRows(list),
    startY: 25,
    theme: "grid",
    styles: {
      font: "Roboto",
      fontSize: 7.5,
      cellPadding: 1.6,
      lineColor: [90, 100, 120],
      lineWidth: 0.2,
      valign: "top",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [38, 58, 120],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [244, 246, 250] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 10, halign: "center" },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 12, halign: "center" },
      7: { cellWidth: 28 },
      8: { cellWidth: 26 },
      9: { cellWidth: 48 },
      10: { cellWidth: 20 },
      11: { cellWidth: 22 },
      12: { cellWidth: "auto" },
    },
    didDrawPage: (data) => {
      const pageSize = doc.internal.pageSize;
      doc.setFontSize(8);
      doc.text(`Стр. ${data.pageNumber}`, pageSize.getWidth() - 20, pageSize.getHeight() - 6);
    },
  });

  doc.save(`Заявки_на_ремонт_${fileStamp()}.pdf`);
}

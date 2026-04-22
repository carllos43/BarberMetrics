import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PdfRow {
  date: string;
  service: string;
  client?: string;
  value: number;
  commission?: number;
}

export interface PdfReport {
  appName: string;
  title: string;
  startDate: string;
  endDate: string;
  rows: PdfRow[];
  totals: {
    revenue: number;
    expenses: number;
    profit: number;
    workingMinutes?: number;
  };
  includeClient: boolean;
  includeCommission: boolean;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function fmtDate(s: string) {
  try {
    return format(new Date(s + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return s;
  }
}

function fmtMinutes(min?: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export function generateReportPdf(r: PdfReport): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ── HEADER ───────────────────────────────────────────────
  doc.setFillColor(20, 20, 24);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 170, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(r.appName, 14, 15);
  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(r.title, 14, 23);
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `Período: ${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`,
    pageW - 14, 23, { align: "right" }
  );

  // ── SUMMARY ───────────────────────────────────────────────
  let y = 42;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo financeiro", 14, y);
  y += 6;

  const summaryRows: [string, string][] = [
    ["Receita bruta", fmtBRL(r.totals.revenue)],
    ["Despesas", `- ${fmtBRL(r.totals.expenses)}`],
    ["Lucro líquido", fmtBRL(r.totals.profit)],
  ];
  if (r.totals.workingMinutes !== undefined) {
    summaryRows.push(["Horas trabalhadas", fmtMinutes(r.totals.workingMinutes)]);
  }

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: "normal", textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold", textColor: [20, 20, 20] },
    },
    margin: { left: 14, right: 14 },
  });

  // ── DETAILED TABLE ───────────────────────────────────────
  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detalhamento de atendimentos", 14, y);

  const head: string[] = ["Data", "Serviço"];
  if (r.includeClient) head.push("Cliente");
  head.push("Valor");
  if (r.includeCommission) head.push("Comissão");

  const body = r.rows.map((row) => {
    const cells: string[] = [fmtDate(row.date), row.service];
    if (r.includeClient) cells.push(row.client ?? "—");
    cells.push(fmtBRL(row.value));
    if (r.includeCommission) cells.push(fmtBRL(row.commission ?? 0));
    return cells;
  });

  autoTable(doc, {
    startY: y + 4,
    head: [head],
    body,
    theme: "striped",
    headStyles: { fillColor: [20, 20, 24], textColor: 255, fontStyle: "bold", fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      [head.length - 1]: { halign: "right", fontStyle: "bold" },
      [head.length - 2]: r.includeCommission ? { halign: "right" } : {},
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        14, ph - 8
      );
      doc.text(`Página ${data.pageNumber}`, pageW - 14, ph - 8, { align: "right" });
    },
  });

  // ── FOOTER / SIGNATURE ───────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 14;
  const ph = doc.internal.pageSize.getHeight();
  if (finalY < ph - 40) {
    doc.setDrawColor(200);
    doc.line(14, finalY + 18, pageW / 2 - 6, finalY + 18);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Assinatura", 14, finalY + 23);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Totais", pageW - 14, finalY + 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Atendimentos: ${r.rows.length}`, pageW - 14, finalY + 12, { align: "right" });
    doc.text(`Receita: ${fmtBRL(r.totals.revenue)}`, pageW - 14, finalY + 17, { align: "right" });
    doc.text(`Lucro: ${fmtBRL(r.totals.profit)}`, pageW - 14, finalY + 22, { align: "right" });
  }

  return doc;
}

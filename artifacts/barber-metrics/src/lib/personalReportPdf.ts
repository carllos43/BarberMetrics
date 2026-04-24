import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PersonalReport } from "./personalFinances";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TYPE_LABEL: Record<string, string> = {
  atendimento: "Atendimento",
  entrada: "Entrada",
  gasto: "Vale",
  pagamento: "Pagamento",
};

export function generatePersonalReportPdf(opts: {
  appName: string;
  ownerName: string;
  report: PersonalReport;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const { startDate, endDate, rows, totals } = opts.report;
  const periodo = `${format(parseISO(startDate), "dd/MM/yyyy")} → ${format(parseISO(endDate), "dd/MM/yyyy")}`;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(opts.appName, 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Relatório Financeiro Pessoal", 40, 68);
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text(`Profissional: ${opts.ownerName}`, 40, 100);
  doc.text(`Período: ${periodo}`, 40, 116);
  doc.text(
    `Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    40, 132,
  );

  // Linha separadora
  doc.setDrawColor(220);
  doc.line(40, 144, pageW - 40, 144);

  // Tabela detalhada
  autoTable(doc, {
    startY: 158,
    head: [["DATA", "HORA", "CATEGORIA", "DESCRIÇÃO", "VALOR"]],
    body: rows.map((r) => {
      const dt = parseISO(r.occurredAt);
      const data = format(dt, "dd/MM/yyyy");
      const hora = format(dt, "HH:mm");
      const cat = r.type === "atendimento" ? "Produzido" : (r.categoryName || TYPE_LABEL[r.type] || "—");
      const sign = r.signed >= 0 ? "+" : "-";
      return [data, hora, cat, r.description || TYPE_LABEL[r.type] || "—", `${sign} ${fmt(Math.abs(r.amount))}`];
    }),
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 45 },
      2: { cellWidth: 90 },
      4: { cellWidth: 75, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const val = String(data.cell.raw ?? "");
        data.cell.styles.textColor = val.startsWith("+") ? [16, 122, 87] : [180, 50, 50];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Resumo
  // @ts-expect-error lastAutoTable injected by autoTable
  const finalY: number = doc.lastAutoTable.finalY ?? 200;
  const rY = finalY + 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo do período", 40, rY);

  autoTable(doc, {
    startY: rY + 10,
    body: [
      ["Total Produzido", fmt(totals.produzido)],
      ["Total de Vales", `- ${fmt(totals.vales)}`],
      ["Contas Pagas", `- ${fmt(totals.contasPagas)}`],
      ["Saldo Líquido", fmt(totals.saldoLiquido)],
    ],
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 220, fontStyle: "bold" },
      1: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = totals.saldoLiquido >= 0 ? [16, 122, 87] : [180, 50, 50];
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${opts.appName} • Página ${i} de ${pageCount}`,
      pageW / 2, doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  return doc;
}

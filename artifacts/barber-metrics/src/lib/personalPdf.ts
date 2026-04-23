import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PersonalOverview, WeeklyCycle, Withdrawal } from "./personalFinances";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (s: string) => {
  try { return format(new Date(s + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return s; }
};

export function generatePersonalFinancesPdf(input: {
  appName: string;
  ownerName: string;
  overview: PersonalOverview;
  cycles: WeeklyCycle[];
  withdrawals?: Withdrawal[];
}): jsPDF {
  const { appName, ownerName, overview, cycles, withdrawals = [] } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // header
  doc.setFillColor(20, 20, 24);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 170, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(appName, 14, 15);
  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Financeiro Pessoal", 14, 23);
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(ownerName, pageW - 14, 23, { align: "right" });

  // semana atual
  let y = 42;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Semana atual", 14, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    body: [
      ["Período", `${fmtDate(overview.semana.startDate)} – ${fmtDate(overview.semana.endDate)}`],
      ["Produzido", fmtBRL(overview.semana.produzido)],
      ["Vales retirados", `- ${fmtBRL(overview.semana.vales)}`],
      ["Disponível", fmtBRL(overview.semana.saldoDisponivel)],
      ["Limite diário sugerido", fmtBRL(overview.semana.limiteDiarioSugerido)],
      ["Status", overview.semana.status === "open" ? "Aberta" : "Fechada"],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 4, right: 4 } },
    columnStyles: {
      0: { textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold", textColor: [20, 20, 20] },
    },
    margin: { left: 14, right: 14 },
  });

  // envelopes
  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold").setFontSize(12).text("Envelopes pessoais", 14, y);
  autoTable(doc, {
    startY: y + 4,
    body: [
      ["Saldo no banco", fmtBRL(overview.pessoal.saldoBanco)],
      ["Reserva (caixinha)", fmtBRL(overview.pessoal.saldoGuardado)],
      ["% Caixinha por fechamento", `${overview.pessoal.percentualCaixinha}%`],
      ["Limite mensal — Lazer", fmtBRL(overview.pessoal.limiteLazer)],
      ["Limite mensal — Comida", fmtBRL(overview.pessoal.limiteComida)],
      ["Limite mensal — Outros", fmtBRL(overview.pessoal.limiteOutros)],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: { top: 1.5, bottom: 1.5, left: 4, right: 4 } },
    columnStyles: {
      0: { textColor: [80, 80, 80] },
      1: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // contas fixas
  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold").setFontSize(12).text("Contas fixas", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Conta", "Vencimento", "Valor", "Status"]],
    body: overview.contas.map((c) => [
      c.nome, `Dia ${c.diaVencimento}`, fmtBRL(c.valor), c.ativa ? "Ativa" : "Pausada",
    ]),
    theme: "striped",
    headStyles: { fillColor: [20, 20, 24], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  // vales da semana
  if (withdrawals.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold").setFontSize(12).text("Vales da semana", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Quando", "Categoria", "Descrição", "Valor"]],
      body: withdrawals.map((w) => [
        format(new Date(w.occurredAt), "dd/MM HH:mm", { locale: ptBR }),
        w.categoriaDestino.replace("_", " "),
        w.descricao ?? "—",
        (w.isExcedente ? "⚠ " : "") + fmtBRL(w.valor),
      ]),
      theme: "striped",
      headStyles: { fillColor: [20, 20, 24], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 3: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
    });
  }

  // histórico ciclos
  if (cycles.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold").setFontSize(12).text("Histórico de semanas", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Período", "Produzido", "Vales", "Saldo final", "Status"]],
      body: cycles.map((c) => [
        `${fmtDate(c.startDate)} – ${fmtDate(c.endDate)}`,
        fmtBRL(c.saldoProduzido),
        fmtBRL(c.totalVales),
        c.saldoFinal != null ? fmtBRL(c.saldoFinal) : "—",
        c.status === "open" ? "Aberta" : "Fechada",
      ]),
      theme: "striped",
      headStyles: { fillColor: [20, 20, 24], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(8).setTextColor(140, 140, 140);
        doc.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          14, ph - 8,
        );
        doc.text(`Página ${data.pageNumber}`, pageW - 14, ph - 8, { align: "right" });
      },
    });
  }

  return doc;
}

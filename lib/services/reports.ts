import jsPDF from "jspdf";

export function buildPdfReport(title: string, sections: Array<{ heading: string; lines: string[] }>) {
  const doc = new jsPDF();
  let y = 18;
  doc.setFontSize(18);
  doc.text(`Nex Rural - ${title}`, 14, y);
  y += 12;
  doc.setFontSize(9);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, y);
  y += 12;
  sections.forEach((section) => {
    doc.setFontSize(12);
    doc.text(section.heading, 14, y);
    y += 8;
    doc.setFontSize(9);
    section.lines.forEach((line) => {
      if (y > 278) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 14, y, { maxWidth: 180 });
      y += 7;
    });
    y += 4;
  });
  return doc;
}

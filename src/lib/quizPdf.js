import { jsPDF } from 'jspdf';
import { getFontEmbedCSS, toCanvas } from 'html-to-image';

// A4 in millimetres, with a margin and a strip at the bottom for the footer.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const FOOTER = 8;
const GAP = 1.5;

/**
 * Turns the report's blocks ([data-pdf-block]) into an A4 PDF and downloads it.
 * Each block is drawn as an image of the real page, so Sinhala text and the app's
 * fonts come out exactly as on screen. A block goes whole onto the next page when
 * it doesn't fit; only a block taller than a page is split.
 */
export async function downloadReportPdf(root, fileName, footerText) {
  if (document.fonts?.ready) await document.fonts.ready;
  const blocks = [...root.querySelectorAll('[data-pdf-block]')];
  const fontEmbedCSS = await getFontEmbedCSS(root);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const width = PAGE_W - 2 * MARGIN;
  const bottom = PAGE_H - MARGIN - FOOTER;
  let y = MARGIN;

  for (const block of blocks) {
    const canvas = await toCanvas(block, { pixelRatio: 2, backgroundColor: '#ffffff', fontEmbedCSS });
    if (!canvas.width || !canvas.height) continue;
    const mmPerPx = width / canvas.width;
    let top = 0;

    while (top < canvas.height) {
      const left = canvas.height - top;
      const room = bottom - y;
      // Doesn't fit here but would fit on a fresh page: start one.
      if (left * mmPerPx > room && y > MARGIN && left * mmPerPx <= bottom - MARGIN) {
        doc.addPage();
        y = MARGIN;
        continue;
      }
      const slice = Math.min(left, Math.floor((bottom - y) / mmPerPx));
      const part = document.createElement('canvas');
      part.width = canvas.width;
      part.height = slice;
      part.getContext('2d').drawImage(canvas, 0, top, canvas.width, slice, 0, 0, canvas.width, slice);
      doc.addImage(part.toDataURL('image/jpeg', 0.9), 'JPEG', MARGIN, y, width, slice * mmPerPx);
      y += slice * mmPerPx + GAP;
      top += slice;
      if (top < canvas.height) {
        doc.addPage();
        y = MARGIN;
      }
    }
  }

  // Footer text is plain Latin (jsPDF's built-in font can't draw Sinhala).
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(footerText, MARGIN, PAGE_H - MARGIN + 2);
    doc.text(`${i} / ${pages}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 2, { align: 'right' });
  }
  doc.save(fileName);
}

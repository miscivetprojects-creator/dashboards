const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function formatCurrency(num) {
  const n = Number(num || 0);
  if (isNaN(n)) return 'Rs. 0';
  return 'Rs. ' + n.toLocaleString('en-IN');
}

function getLogoPath() {
  const p1 = path.join(__dirname, '../assets/civet-logo.png');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(__dirname, '../../../frontend/public/civet-logo.png');
  if (fs.existsSync(p2)) return p2;
  const p3 = path.join(__dirname, '../../../frontend/dist/civet-logo.png');
  if (fs.existsSync(p3)) return p3;
  return null;
}

const pdfService = {
  async generateDashboardPdf({ title, subtitle, dateRange, kpis, tables, charts, generatedBy }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 36, 
          size: 'A4',
          bufferPages: true,
          info: {
            Title: title || 'CIVET Management MIS Executive Report',
            Author: 'CIVET PROJECTS PRIVATE LIMITED',
            Subject: 'Executive Management MIS Report',
            Keywords: 'MIS, Dashboard, Civet Projects, Spending, Tracking'
          }
        });
        
        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => {
          try {
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
              doc.switchToPage(i);
              
              const pageWidth = doc.page.width;
              const pageHeight = doc.page.height;
              
              doc.save();
              doc.rect(36, pageHeight - 30, pageWidth - 72, 0.75).fill('#000000');
              doc.fontSize(7.5).font('Helvetica').fillColor('#000000');
              doc.text(
                'CIVET PROJECTS PRIVATE LIMITED  •  This is an electronically generated report.',
                36,
                pageHeight - 22,
                { width: pageWidth - 160, align: 'left' }
              );
              doc.text(
                `Page ${i + 1} of ${pages.count}`,
                pageWidth - 110,
                pageHeight - 22,
                { width: 74, align: 'right' }
              );
              doc.restore();
            }
            resolve(Buffer.concat(buffers));
          } catch (e) {
            resolve(Buffer.concat(buffers));
          }
        });

        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - 72;
        const startX = 36;
        let y = 36;

        const drawHeaderBanner = () => {
          doc.save();
          doc.rect(startX, y, contentWidth, 54).fillAndStroke('#FFFFFF', '#000000');

          let headerTextX = startX + 16;
          const logoPath = getLogoPath();
          if (logoPath && fs.existsSync(logoPath)) {
            try {
              doc.image(logoPath, startX + 12, y + 10, { fit: [80, 34] });
              headerTextX = startX + 104;
            } catch (e) {}
          }

          doc.fillColor('#000000').fontSize(13).font('Helvetica-Bold');
          doc.text('CIVET PROJECTS PRIVATE LIMITED', headerTextX, y + 12);

          doc.fillColor('#000000').fontSize(8.5).font('Helvetica');
          doc.text('EXECUTIVE MANAGEMENT INFORMATION SYSTEM (MIS) REPORT', headerTextX, y + 30);

          doc.fillColor('#000000').fontSize(8).font('Helvetica');
          const genDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
          doc.text(`Generated: ${genDate}`, startX + contentWidth - 216, y + 14, { width: 200, align: 'right' });
          doc.text(`Author: ${generatedBy || 'Management Executive'}`, startX + contentWidth - 216, y + 28, { width: 200, align: 'right' });
          doc.restore();

          y += 68;
        };

        drawHeaderBanner();

        doc.fillColor('#000000').fontSize(13).font('Helvetica-Bold');
        doc.text(title || 'Civet Projects - Construction & Project MIS Summary', startX, y);
        y += 18;

        if (subtitle || dateRange) {
          doc.fillColor('#000000').fontSize(9).font('Helvetica');
          const metaText = [subtitle, dateRange].filter(Boolean).join('  |  ');
          doc.text(metaText, startX, y);
          y += 16;
        }

        y += 6;

        if (kpis && kpis.length > 0) {
          const displayKpis = kpis.slice(0, 5);
          const cardCount = displayKpis.length;
          const cardGap = 8;
          const cardWidth = (contentWidth - ((cardCount - 1) * cardGap)) / cardCount;
          const cardHeight = 52;

          displayKpis.forEach((kpi, idx) => {
            const cardX = startX + idx * (cardWidth + cardGap);
            
            doc.save();
            doc.rect(cardX, y, cardWidth, cardHeight).fillAndStroke('#FFFFFF', '#000000');

            doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
            doc.text(String(kpi.label || '').toUpperCase(), cardX + 8, y + 8, { width: cardWidth - 14, ellipsis: true });

            doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
            doc.text(String(kpi.value ?? '0'), cardX + 8, y + 20, { width: cardWidth - 14, ellipsis: true });

            if (kpi.subtext || kpi.sub) {
              doc.fillColor('#333333').fontSize(6.5).font('Helvetica');
              doc.text(String(kpi.subtext || kpi.sub), cardX + 8, y + 36, { width: cardWidth - 14, ellipsis: true });
            }
            doc.restore();
          });

          y += cardHeight + 14;
        }

        const drawMonthlyBarChart = (chartTitle, dataPoints, chartX, chartY, chartW, chartH) => {
          doc.save();
          doc.rect(chartX, chartY, chartW, chartH).fillAndStroke('#FFFFFF', '#000000');
          doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold');
          doc.text(chartTitle, chartX + 10, chartY + 6);

          const maxVal = Math.max(...dataPoints.map(d => Number(d.amount || 0)), 1);
          const plotX = chartX + 14;
          const plotY = chartY + 28;
          const plotW = chartW - 28;
          const plotH = chartH - 46;

          doc.lineWidth(0.5).strokeColor('#000000');
          for (let g = 0; g <= 3; g++) {
            const gy = plotY + (plotH / 3) * g;
            doc.moveTo(plotX, gy).lineTo(plotX + plotW, gy).stroke();
          }

          const barCount = dataPoints.length || 1;
          const slotW = plotW / barCount;
          const barW = Math.max(8, Math.min(22, slotW * 0.65));

          dataPoints.forEach((d, idx) => {
            const amt = Number(d.amount || 0);
            const barH = (amt / maxVal) * plotH;
            const bx = plotX + (idx * slotW) + (slotW - barW) / 2;
            const by = plotY + plotH - barH;

            if (barH > 0) {
              doc.rect(bx, by, barW, barH).fillAndStroke('#FFFFFF', '#000000');
              if (amt > 0 && barW >= 12) {
                const labelStr = amt >= 10000000 ? `${(amt / 10000000).toFixed(1)}Cr` :
                                 amt >= 100000 ? `${(amt / 100000).toFixed(0)}L` :
                                 amt >= 1000 ? `${(amt / 1000).toFixed(0)}k` : String(amt);
                doc.fillColor('#000000').fontSize(5.5).font('Helvetica-Bold');
                doc.text(labelStr, bx - 6, Math.max(plotY, by - 8), { width: barW + 12, align: 'center' });
              }
            }

            const monthLbl = String(d.month || '').substring(0, 3);
            doc.fillColor('#000000').fontSize(6.5).font('Helvetica');
            doc.text(monthLbl, plotX + (idx * slotW), plotY + plotH + 4, { width: slotW, align: 'center' });
          });

          doc.restore();
        };

        const drawHorizontalBarChart = (chartTitle, items, chartX, chartY, chartW, chartH) => {
          doc.save();
          doc.rect(chartX, chartY, chartW, chartH).fillAndStroke('#FFFFFF', '#000000');
          doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold');
          doc.text(chartTitle, chartX + 10, chartY + 6);

          const listItems = items.slice(0, 4);
          const maxVal = Math.max(...listItems.map(d => Number(d.amount || 0)), 1);
          const topY = chartY + 28;
          const rowH = 17;

          listItems.forEach((item, idx) => {
            const ry = topY + idx * rowH;
            const itemName = String(item.name || item.department || item.location || 'Item');
            const amt = Number(item.amount || 0);
            const pct = item.percentage ? `${item.percentage}%` : '';
            const amtStr = item.amountFormatted || formatCurrency(amt);

            doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
            doc.text(itemName, chartX + 10, ry + 1, { width: 95, ellipsis: true });

            const barTrackX = chartX + 110;
            const barTrackW = chartW - 195;
            const fillW = Math.max(2, (amt / maxVal) * barTrackW);

            doc.rect(barTrackX, ry + 3, barTrackW, 6).stroke('#000000');
            if (amt > 0) {
              doc.rect(barTrackX, ry + 3, fillW, 6).fillAndStroke('#000000', '#000000');
            }

            doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold');
            doc.text(amtStr, chartX + chartW - 80, ry + 1, { width: 48, align: 'right' });

            doc.fillColor('#000000').fontSize(6.5).font('Helvetica');
            doc.text(pct, chartX + chartW - 30, ry + 1, { width: 22, align: 'right' });
          });

          doc.restore();
        };

        if (charts && (charts.monthlySpending || charts.spendingTrend || charts.departmentWiseSpending || charts.locationWiseSpending)) {
          const trendData = charts.monthlySpending || charts.spendingTrend || [];
          if (trendData.length > 0) {
            drawMonthlyBarChart('Monthly Spending Trend (Calendar Year Analysis)', trendData, startX, y, contentWidth, 96);
            y += 104;
          }

          const deptData = charts.departmentWiseSpending || charts.departmentExpenditure || [];
          const locData = charts.locationWiseSpending || charts.locationSpending || [];

          if (deptData.length > 0 || locData.length > 0) {
            const halfW = (contentWidth - 10) / 2;
            if (deptData.length > 0 && locData.length > 0) {
              drawHorizontalBarChart('Department Spending Breakdown', deptData, startX, y, halfW, 100);
              drawHorizontalBarChart('Project Division Spending Breakdown', locData, startX + halfW + 10, y, halfW, 100);
              y += 108;
            } else if (deptData.length > 0) {
              drawHorizontalBarChart('Department Spending Breakdown', deptData, startX, y, contentWidth, 100);
              y += 108;
            } else if (locData.length > 0) {
              drawHorizontalBarChart('Project Division Spending Breakdown', locData, startX, y, contentWidth, 100);
              y += 108;
            }
          }
        }

        if (tables && tables.length > 0) {
          tables.forEach((table) => {
            if (y > doc.page.height - 130) {
              doc.addPage();
              y = 36;
            }

            doc.save();
            doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
            doc.text(table.title || 'Summary Data Register', startX, y);
            doc.restore();
            y += 16;

            if (table.subtitle) {
              doc.fillColor('#333333').fontSize(8).font('Helvetica');
              doc.text(table.subtitle, startX, y);
              y += 12;
            }

            const headers = table.headers || [];
            const rows = table.rows || [];
            const colCount = headers.length || 1;

            let colWidths = table.colWidths;
            if (!colWidths || colWidths.length !== colCount) {
              const defaultW = contentWidth / colCount;
              colWidths = headers.map(() => defaultW);
            } else {
              const sumW = colWidths.reduce((a, b) => a + b, 0);
              colWidths = colWidths.map(w => (w / sumW) * contentWidth);
            }

            const headerHeight = 22;
            let curX = startX;
            headers.forEach((h, hIdx) => {
              const w = colWidths[hIdx];
              const align = (table.aligns && table.aligns[hIdx]) || 'left';
              doc.save();
              doc.rect(curX, y, w, headerHeight).fillAndStroke('#FFFFFF', '#000000');
              doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
              doc.text(String(h).toUpperCase(), curX + 6, y + 6, { width: w - 12, align });
              doc.restore();
              curX += w;
            });
            y += headerHeight;

            const rowHeight = 19;
            rows.forEach((row) => {
              if (y > doc.page.height - 55) {
                doc.addPage();
                y = 36;

                let hX = startX;
                headers.forEach((h, hIdx) => {
                  const w = colWidths[hIdx];
                  const align = (table.aligns && table.aligns[hIdx]) || 'left';
                  doc.save();
                  doc.rect(hX, y, w, headerHeight).fillAndStroke('#FFFFFF', '#000000');
                  doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
                  doc.text(String(h).toUpperCase(), hX + 6, y + 6, { width: w - 12, align });
                  doc.restore();
                  hX += w;
                });
                y += headerHeight;
              }

              let cellX = startX;
              row.forEach((cellVal, cIdx) => {
                const w = colWidths[cIdx];
                const align = (table.aligns && table.aligns[cIdx]) || 'left';
                const cellStr = String(cellVal ?? '');

                doc.save();
                doc.rect(cellX, y, w, rowHeight).fillAndStroke('#FFFFFF', '#000000');
                doc.fontSize(7.5).font(cIdx === 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
                doc.text(cellStr, cellX + 6, y + 5, { width: w - 12, align, ellipsis: true });
                doc.restore();
                cellX += w;
              });
              y += rowHeight;
            });

            y += 12;
            doc.save();
            doc.lineWidth(0.75).strokeColor('#000000');
            doc.moveTo(startX, y).lineTo(startX + contentWidth, y).stroke();
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
            doc.text('This is an electronically generated report.', startX, y + 4, { width: contentWidth, align: 'center' });
            doc.restore();

            y += 16;
          });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateTablePdf({ title, subtitle, headers, rows, colWidths, aligns, generatedBy, orientation = 'landscape', summaryRow, totals }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 28,
          size: 'A4',
          layout: orientation,
          bufferPages: true,
          info: {
            Title: title || 'CIVET MIS Table Report',
            Author: 'CIVET PROJECTS PRIVATE LIMITED'
          }
        });

        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => {
          try {
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
              doc.switchToPage(i);
              const pageWidth = doc.page.width;
              const pageHeight = doc.page.height;
              doc.save();
              doc.rect(28, pageHeight - 24, pageWidth - 56, 0.75).fill('#000000');
              doc.fontSize(7).font('Helvetica').fillColor('#000000');
              doc.text(
                'CIVET PROJECTS PRIVATE LIMITED  •  This is an electronically generated report.',
                28,
                pageHeight - 17,
                { width: pageWidth - 140, align: 'left' }
              );
              doc.text(
                `Page ${i + 1} of ${pages.count}`,
                pageWidth - 100,
                pageHeight - 17,
                { width: 72, align: 'right' }
              );
              doc.restore();
            }
            resolve(Buffer.concat(buffers));
          } catch {
            resolve(Buffer.concat(buffers));
          }
        });

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - 56;
        const startX = 28;
        let y = 26;

        const logoPath = getLogoPath();
        const headerBoxHeight = 48;
        doc.save();
        doc.rect(startX, y, contentWidth, headerBoxHeight).fillAndStroke('#FFFFFF', '#000000');

        let headerTextX = startX + 12;
        if (logoPath && fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, startX + 10, y + 6, { fit: [80, 34] });
            headerTextX = startX + 98;
          } catch (e) {}
        }

        doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
        doc.text('CIVET PROJECTS PRIVATE LIMITED', headerTextX, y + 7);
        doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold');
        doc.text(String(title || 'MASTER DATA REGISTER').toUpperCase(), headerTextX, y + 21);

        if (subtitle) {
          doc.fillColor('#0F2A4A').fontSize(8).font('Helvetica-Bold');
          doc.text(subtitle, headerTextX, y + 34, { width: contentWidth - (headerTextX - startX) - 175, ellipsis: true });
        }

        const now = new Date();
        const dStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        doc.fillColor('#000000').fontSize(7.5).font('Helvetica');
        doc.text(`Generated: ${dStr}`, startX + contentWidth - 175, y + 8, { width: 165, align: 'right' });
        doc.text(`User: ${generatedBy || 'Administrator'}`, startX + contentWidth - 175, y + 20, { width: 165, align: 'right' });
        doc.text(`Total Records: ${rows.length}`, startX + contentWidth - 175, y + 32, { width: 165, align: 'right' });
        doc.restore();

        y += headerBoxHeight + 8;

        let calcQty = 0;
        let calcAmount = 0;
        let qtyColIdx = -1;
        let amountColIdx = -1;

        headers.forEach((h, idx) => {
          const lower = String(h).toLowerCase();
          if (qtyColIdx === -1 && (lower === 'qty' || lower.includes('quantity') || lower.includes('litres'))) {
            qtyColIdx = idx;
          }
          if (amountColIdx === -1 && (lower.includes('total amount') || lower === 'amount' || lower.includes('total cost'))) {
            amountColIdx = idx;
          }
        });

        if (qtyColIdx !== -1 || amountColIdx !== -1) {
          rows.forEach(r => {
            if (qtyColIdx !== -1) {
              const rawQty = String(r[qtyColIdx] || '').replace(/,/g, '').replace(/[^0-9.-]/g, '');
              const q = parseFloat(rawQty);
              if (!isNaN(q)) calcQty += q;
            }
            if (amountColIdx !== -1) {
              const rawAmt = String(r[amountColIdx] || '').replace(/,/g, '').replace(/[^0-9.-]/g, '');
              const a = parseFloat(rawAmt);
              if (!isNaN(a)) calcAmount += a;
            }
          });
        }

        const finalQtyFormatted = totals && totals.qtyFormatted ? totals.qtyFormatted : (calcQty > 0 ? calcQty.toLocaleString('en-IN') : '0');
        const finalAmountFormatted = totals && totals.amountFormatted ? totals.amountFormatted : ('Rs. ' + calcAmount.toLocaleString('en-IN'));

        if (qtyColIdx !== -1 || amountColIdx !== -1 || totals) {
          const summaryBarHeight = 18;
          doc.save();
          doc.rect(startX, y, contentWidth, summaryBarHeight).fillAndStroke('#FFFFFF', '#000000');
          doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
          const summaryText = `FINAL TOTAL QUANTITY: ${finalQtyFormatted}     |     FINAL TOTAL AMOUNT: ${finalAmountFormatted}     |     TOTAL RECORDS: ${rows.length}`;
          doc.text(summaryText, startX + 10, y + 5, { width: contentWidth - 20, align: 'left' });
          doc.restore();
          y += summaryBarHeight + 6;
        }

        const colCount = headers.length || 1;
        let widths = colWidths;
        if (!widths || widths.length !== colCount) {
          const defaultW = contentWidth / colCount;
          widths = headers.map(() => defaultW);
        } else {
          const sumW = widths.reduce((a, b) => a + b, 0);
          widths = widths.map(w => (w / sumW) * contentWidth);
        }

        const headerHeight = 20;
        const drawHeader = () => {
          let cx = startX;
          headers.forEach((h, idx) => {
            const w = widths[idx];
            const align = (aligns && aligns[idx]) || 'left';
            doc.save();
            doc.rect(cx, y, w, headerHeight).fillAndStroke('#FFFFFF', '#000000');
            doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
            doc.text(String(h).toUpperCase(), cx + 4, y + 6, { width: w - 8, align, ellipsis: true });
            doc.restore();
            cx += w;
          });
          y += headerHeight;
        };

        drawHeader();

        const rowHeight = 16;
        rows.forEach((row) => {
          if (y + rowHeight > pageHeight - 48) {
            doc.addPage();
            y = 26;
            drawHeader();
          }

          let cx = startX;
          row.forEach((cellVal, cIdx) => {
            const w = widths[cIdx];
            const align = (aligns && aligns[cIdx]) || 'left';
            const textVal = String(cellVal ?? '');

            doc.save();
            doc.rect(cx, y, w, rowHeight).fillAndStroke('#FFFFFF', '#000000');
            doc.fontSize(7).font(cIdx === 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
            doc.text(textVal, cx + 4, y + 4.5, { width: w - 8, align, lineBreak: false, ellipsis: true });
            doc.restore();
            cx += w;
          });

          y += rowHeight;
        });

        let effectiveSummaryRow = summaryRow;
        if (!effectiveSummaryRow && (qtyColIdx !== -1 || amountColIdx !== -1)) {
          effectiveSummaryRow = headers.map((_, idx) => {
            if (idx === 0) return 'FINAL TOTAL';
            if (idx === qtyColIdx) return finalQtyFormatted;
            if (idx === amountColIdx) return finalAmountFormatted;
            return '-';
          });
        }

        if (effectiveSummaryRow && effectiveSummaryRow.length > 0) {
          const summaryRowHeight = 22;
          if (y + summaryRowHeight > pageHeight - 48) {
            doc.addPage();
            y = 26;
            drawHeader();
          }

          let cx = startX;
          effectiveSummaryRow.forEach((val, idx) => {
            const w = widths[idx];
            const align = (aligns && aligns[idx]) || 'left';
            const textVal = String(val ?? '');

            doc.save();
            doc.lineWidth(1);
            doc.rect(cx, y, w, summaryRowHeight).fillAndStroke('#FFFFFF', '#000000');
            const fSize = textVal.length > 15 ? 6.5 : 7.5;
            doc.fontSize(fSize).font('Helvetica-Bold').fillColor('#000000');
            const textH = doc.heightOfString(textVal, { width: w - 8, lineBreak: false });
            const textY = y + Math.max(3, (summaryRowHeight - textH) / 2);
            doc.text(textVal, cx + 4, textY, { width: w - 8, align, lineBreak: false });
            doc.restore();
            cx += w;
          });

          y += summaryRowHeight;
        }

        y += 10;
        if (y + 24 > pageHeight - 28) {
          doc.addPage();
          y = 26;
        }

        doc.save();
        doc.lineWidth(0.75).strokeColor('#000000');
        doc.moveTo(startX, y).lineTo(startX + contentWidth, y).stroke();
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
        doc.text('This is an electronically generated report.', startX, y + 5, { width: contentWidth, align: 'center' });
        doc.fontSize(6.5).font('Helvetica').fillColor('#333333');
        doc.text('CIVET Management Information System (MIS)  •  No physical signature required.', startX, y + 15, { width: contentWidth, align: 'center' });
        doc.restore();

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};

module.exports = pdfService;

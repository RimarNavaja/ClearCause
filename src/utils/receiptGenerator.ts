/**
 * Receipt Generator Utility
 * Generates professional PDF receipts for donations
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ReceiptData {
  // Donation Details
  donationId: string;
  transactionId: string;
  amount: number;
  donatedAt: string;
  paymentMethod: string;
  status: string;

  // Donor Details
  donorName: string;
  donorEmail: string;
  isAnonymous?: boolean;

  // Campaign Details
  campaignTitle: string;
  charityName: string;

  // Campaign Impact (Optional)
  campaignCurrentAmount?: number;
  campaignGoalAmount?: number;
  progressPercentage?: number;
  donorsCount?: number;
  nextMilestone?: string;

  // Optional
  message?: string;
}

/**
 * Generate a PDF receipt for a donation
 */
export const generateDonationReceipt = (data: ReceiptData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ClearCause Brand Colors - Matching Design System
  const primaryColor: [number, number, number] = [29, 78, 216]; // #1d4ed8 - ClearCause Primary Blue
  const secondaryColor: [number, number, number] = [2, 132, 199]; // #0284c7 - ClearCause Secondary Blue
  const accentColor: [number, number, number] = [249, 115, 22]; // #F97316 - ClearCause Accent Orange
  const successColor: [number, number, number] = [34, 197, 94]; // #22C55E - ClearCause Success Green
  const mutedBlue: [number, number, number] = [224, 242, 254]; // #E0F2FE - ClearCause Muted
  const textColor: [number, number, number] = [17, 24, 39]; // Gray-900
  const textSecondary: [number, number, number] = [75, 85, 99]; // Gray-600
  const lightGray: [number, number, number] = [248, 250, 252]; // #F8FAFC - ClearCause Background
  const borderGray: [number, number, number] = [229, 231, 235]; // Gray-200

  let yPosition = 20;

  // ===== ENHANCED HEADER - Gradient from Primary to Secondary =====
  // Create gradient effect (primary blue at top, transitioning to secondary blue)
  const headerHeight = 55;
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    const r = primaryColor[0] + (secondaryColor[0] - primaryColor[0]) * ratio;
    const g = primaryColor[1] + (secondaryColor[1] - primaryColor[1]) * ratio;
    const b = primaryColor[2] + (secondaryColor[2] - primaryColor[2]) * ratio;
    doc.setFillColor(r, g, b);
    doc.rect(0, (headerHeight * i) / gradientSteps, pageWidth, headerHeight / gradientSteps, 'F');
  }

  // Accent stripe at top for visual pop
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // ClearCause Logo Text - Matching navbar style
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.setFont('helvetica', 'bold');
  doc.text('ClearCause', pageWidth / 2, 24, { align: 'center' });

  // Official Receipt subtitle with icon-like element
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255, 0.95);
  doc.text('OFFICIAL DONATION RECEIPT', pageWidth / 2, 36, { align: 'center' });

  // Success checkmark circle background
  doc.setFillColor(255, 255, 255, 0.2);
  doc.circle(pageWidth / 2, 47, 6, 'F');

  // Checkmark icon (simplified)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.line(pageWidth / 2 - 3, 47, pageWidth / 2 - 1, 49);
  doc.line(pageWidth / 2 - 1, 49, pageWidth / 2 + 3, 45);

  yPosition = 68;

  // ===== RECEIPT METADATA - Clean Layout =====
  doc.setTextColor(...textSecondary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const receiptDate = format(new Date(), 'MMMM dd, yyyy');
  const receiptNumber = data.donationId.substring(0, 8).toUpperCase();

  doc.text(`Receipt #${receiptNumber}`, 15, yPosition);
  doc.text(`Issued: ${receiptDate}`, pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 14;

  // ===== DONOR RECOGNITION SECTION =====
  // Background box with border
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  doc.rect(15, yPosition, pageWidth - 30, 32, 'FD');

  // Thank you message - personalized
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  const donorFirstName = data.isAnonymous ? 'Generous Donor' : data.donorName.split(' ')[0];
  doc.text(`Thank You, ${donorFirstName}!`, pageWidth / 2, yPosition + 10, { align: 'center' });

  // Impact statement
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(
    'Your generous contribution is making a real difference in creating positive change.',
    pageWidth / 2,
    yPosition + 18,
    { align: 'center' }
  );

  // Donation amount highlight
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Donation Amount', pageWidth / 2, yPosition + 25, { align: 'center' });

  yPosition += 42;

  // ===== AMOUNT HIGHLIGHT BOX - Matching DonateSuccess Design =====
  // Light orange background (accent/10) with accent border
  doc.setFillColor(249, 115, 22, 0.1); // Orange with 10% opacity
  doc.setDrawColor(249, 115, 22, 0.2); // Orange with 20% opacity for border
  doc.setLineWidth(0.8);
  doc.roundedRect(15, yPosition, pageWidth - 30, 24, 4, 4, 'FD');

  // "You Donated" label
  doc.setTextColor(...textSecondary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('You Donated', pageWidth / 2, yPosition + 7, { align: 'center' });

  // Amount in large orange text
  doc.setTextColor(...accentColor);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `₱${data.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth / 2,
    yPosition + 18,
    { align: 'center' }
  );

  yPosition += 34;

  // ===== DONATION DETAILS =====
  doc.setTextColor(...textColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Donation Details', 15, yPosition);
  yPosition += 8;

  // Enhanced table data
  const donationDetails = [
    ['Transaction ID', data.transactionId || 'N/A'],
    ['Payment Method', formatPaymentMethod(data.paymentMethod)],
    ['Date & Time', format(new Date(data.donatedAt), 'MMMM dd, yyyy \'at\' h:mm a')],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: donationDetails,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 7,
      lineColor: borderGray,
      lineWidth: 0.5,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 70,
        textColor: textSecondary,
      },
      1: {
        cellWidth: 'auto',
        textColor: textColor,
        fontStyle: 'normal',
      },
    },
    margin: { left: 15, right: 15 },
    didDrawCell: (data) => {
      // Add subtle background to every other row
      if (data.row.index % 2 === 0) {
        doc.setFillColor(...lightGray);
      }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== CAMPAIGN DETAILS =====
  doc.setTextColor(...textColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Details', 15, yPosition);
  yPosition += 8;

  const campaignDetails = [
    ['Campaign', data.campaignTitle],
    ['Organization', data.charityName],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: campaignDetails,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 7,
      lineColor: borderGray,
      lineWidth: 0.5,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 70,
        textColor: textSecondary,
      },
      1: {
        cellWidth: 'auto',
        textColor: textColor,
        fontStyle: 'normal',
      },
    },
    margin: { left: 15, right: 15 },
    didDrawCell: (data) => {
      if (data.row.index % 2 === 0) {
        doc.setFillColor(...lightGray);
      }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ===== CAMPAIGN IMPACT SECTION (if data available) =====
  if (data.campaignGoalAmount && data.campaignCurrentAmount !== undefined) {
    // Use ClearCause muted blue background for impact section
    doc.setFillColor(...mutedBlue);
    doc.setDrawColor(186, 230, 253); // Light blue border
    doc.setLineWidth(0.8);
    doc.roundedRect(15, yPosition, pageWidth - 30, 45, 4, 4, 'FD');

    // Header with heart/impact icon
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('💙 Your Impact', 20, yPosition + 8);

    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const progressPercentage = data.progressPercentage ||
      Math.round((data.campaignCurrentAmount / data.campaignGoalAmount) * 100);

    doc.text(
      `Your donation helped this campaign reach ${progressPercentage}% of its goal!`,
      20,
      yPosition + 16
    );

    // Progress bar
    const barX = 20;
    const barY = yPosition + 22;
    const barWidth = pageWidth - 50;
    const barHeight = 7;

    // Background bar (lighter)
    doc.setFillColor(203, 213, 225); // Gray-300
    doc.roundedRect(barX, barY, barWidth, barHeight, 3, 3, 'F');

    // Progress fill - Use primary blue for consistency
    const fillWidth = (barWidth * progressPercentage) / 100;
    doc.setFillColor(...primaryColor);
    doc.roundedRect(barX, barY, fillWidth, barHeight, 3, 3, 'F');

    // Progress text
    doc.setFontSize(8);
    doc.setTextColor(...textSecondary);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `₱${data.campaignCurrentAmount.toLocaleString('en-PH')} raised`,
      barX,
      barY + barHeight + 6
    );

    doc.setFont('helvetica', 'normal');
    doc.text(
      `of ₱${data.campaignGoalAmount.toLocaleString('en-PH')} goal`,
      barX + 42,
      barY + barHeight + 6
    );

    if (data.donorsCount) {
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${data.donorsCount} donor${data.donorsCount !== 1 ? 's' : ''}`,
        pageWidth - 20,
        barY + barHeight + 6,
        { align: 'right' }
      );
    }

    yPosition += 50;
  }

  // ===== DONOR DETAILS =====
  if (!data.isAnonymous) {
    doc.setTextColor(...textColor);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Donor Information', 15, yPosition);
    yPosition += 8;

    const donorDetails = [
      ['Name', data.donorName],
      ['Email', data.donorEmail],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: donorDetails,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 7,
        lineColor: borderGray,
        lineWidth: 0.5,
      },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 70,
          textColor: textSecondary,
        },
        1: {
          cellWidth: 'auto',
          textColor: textColor,
          fontStyle: 'normal',
        },
      },
      margin: { left: 15, right: 15 },
      didDrawCell: (data) => {
        if (data.row.index % 2 === 0) {
          doc.setFillColor(...lightGray);
        }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ===== PERSONAL MESSAGE (if any) =====
  if (data.message) {
    // Use muted blue background for message box
    doc.setFillColor(...mutedBlue);
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.8);

    // Calculate message box height dynamically
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const messageLines = doc.splitTextToSize(`"${data.message}"`, pageWidth - 50);
    const messageHeight = Math.max(20, messageLines.length * 5 + 18);

    doc.roundedRect(15, yPosition, pageWidth - 30, messageHeight, 4, 4, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('💬 Your Message', 20, yPosition + 8);

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(messageLines, 20, yPosition + 16);

    yPosition += messageHeight + 10;
  }

  // ===== TAX INFORMATION =====
  yPosition = Math.max(yPosition, pageHeight - 85);

  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.8);
  doc.roundedRect(15, yPosition, pageWidth - 30, 28, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('📋 Tax Deduction Notice', 20, yPosition + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  const taxNotice = doc.splitTextToSize(
    'This receipt may be used for tax deduction purposes. Please consult with your tax advisor regarding the deductibility of your donation. Keep this receipt for your records.',
    pageWidth - 50
  );
  doc.text(taxNotice, 20, yPosition + 13);

  yPosition += 35;

  // ===== PROFESSIONAL FOOTER - Matching ClearCause Brand =====
  // Footer background (very light gray)
  doc.setFillColor(...lightGray);
  doc.rect(0, pageHeight - 38, pageWidth, 38, 'F');

  // Divider line with primary color
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(0, pageHeight - 38, pageWidth, pageHeight - 38);

  // Small accent line on top of divider
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(0, pageHeight - 38.5, pageWidth, pageHeight - 38.5);

  // ClearCause logo text - matching navbar
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('ClearCause', pageWidth / 2, pageHeight - 27, { align: 'center' });

  // Tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textSecondary);
  doc.text('Transparent Charity Donation Platform', pageWidth / 2, pageHeight - 21, {
    align: 'center',
  });

  // Contact information with icon
  doc.setFontSize(7);
  doc.setTextColor(...textSecondary);
  doc.text('📧 support@clearcause.org', pageWidth / 2 - 20, pageHeight - 14, {
    align: 'center',
  });
  doc.text('🌐 www.clearcause.org', pageWidth / 2 + 20, pageHeight - 14, {
    align: 'center',
  });

  // Generation timestamp
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175); // Gray-400
  doc.text(
    `Generated: ${format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}`,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  return doc;
};

/**
 * Download a receipt as PDF
 */
export const downloadReceipt = (data: ReceiptData): void => {
  const doc = generateDonationReceipt(data);
  const fileName = `ClearCause_Receipt_${data.donationId.substring(0, 8)}_${format(
    new Date(data.donatedAt),
    'yyyyMMdd'
  )}.pdf`;
  doc.save(fileName);
};

/**
 * Get receipt as blob (for email attachments, etc.)
 */
export const getReceiptBlob = (data: ReceiptData): Blob => {
  const doc = generateDonationReceipt(data);
  return doc.output('blob');
};

/**
 * Get receipt as base64 string
 */
export const getReceiptBase64 = (data: ReceiptData): string => {
  const doc = generateDonationReceipt(data);
  return doc.output('dataurlstring');
};

/**
 * Helper: Format payment method name
 */
function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    gcash: 'GCash',
    paymaya: 'PayMaya',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
  };

  return methodMap[method.toLowerCase()] || method;
}

/**
 * Preview receipt in new window
 */
export const previewReceipt = (data: ReceiptData): void => {
  const doc = generateDonationReceipt(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

import * as XLSX from 'xlsx';
import { errorHandler } from './professionalErrorHandler';
import { trData } from './transliterator';

// Excel Export Options
export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  autoWidth?: boolean;
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  currency?: string;
}

// Excel Cell Type
export interface ExcelCell {
  value: any;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'formula';
  format?: string;
  style?: {
    font?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
      size?: number;
    };
    fill?: {
      bgColor?: string;
      fgColor?: string;
      pattern?: string;
    };
    border?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
    alignment?: {
      horizontal?: 'left' | 'center' | 'right';
      vertical?: 'top' | 'middle' | 'bottom';
      wrapText?: boolean;
    };
  };
}

// Excel Row Type
export interface ExcelRow {
  [key: string]: ExcelCell | any;
}

// Professional Excel Utils Class
export class ProfessionalExcelUtils {
  private static instance: ProfessionalExcelUtils;

  static getInstance(): ProfessionalExcelUtils {
    if (!ProfessionalExcelUtils.instance) {
      ProfessionalExcelUtils.instance = new ProfessionalExcelUtils();
    }
    return ProfessionalExcelUtils.instance;
  }

  // Main export function
  exportToExcel(
    data: ExcelRow[],
    options: ExcelExportOptions = {}
  ): boolean {
    try {
      const {
        fileName = 'report',
        sheetName = 'Ma\'lumotlar',
        autoWidth = true,
        includeHeaders = true,
        dateFormat = 'dd/mm/yyyy',
        numberFormat = '#,##0.00',
        currency = 'UZS'
      } = options;

      if (!data || data.length === 0) {
        console.warn('Eksport uchun ma\'lumotlar yo\'q');
        return false;
      }

      // 1. Prepare data
      const preparedData = this.prepareData(data, { includeHeaders, dateFormat, numberFormat, currency });
      
      // 2. Create worksheet
      const ws = XLSX.utils.json_to_sheet(preparedData);
      
      // 3. Apply styling
      this.applyStyling(ws, preparedData, includeHeaders);
      
      // 4. Auto width columns
      if (autoWidth) {
        this.autoWidthColumns(ws, preparedData);
      }
      
      // 5. Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // 6. Generate file
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      });
      
      // 7. Download file
      this.downloadFile(excelBuffer, fileName);
      
      console.log(`Excel fayli muvaffaqiyatli yaratildi: ${fileName}`);
      return true;
      
    } catch (error) {
      const professionalError = errorHandler.handleError(error, {
        action: 'excelExport',
        options
      });
      
      console.error('Excel eksportda xatolik:', professionalError.userMessage);
      alert('Excel faylini yaratishda xatolik yuz berdi: ' + professionalError.userMessage);
      return false;
    }
  }

  // Prepare data for export
  private prepareData(
    data: ExcelRow[], 
    options: { includeHeaders: boolean; dateFormat: string; numberFormat: string; currency: string }
  ): ExcelRow[] {
    const { includeHeaders, dateFormat, numberFormat, currency } = options;
    
    if (!includeHeaders) {
      return data.map(row => this.processRow(row, { dateFormat, numberFormat, currency }));
    }
    
    // Add headers if needed
    const headers = Object.keys(data[0] || {});
    const headerRow: ExcelRow = {};
    
    headers.forEach(header => {
      headerRow[header] = {
        value: this.translateHeader(header),
        type: 'string',
        style: {
          font: { bold: true, color: '#FFFFFF' },
          fill: { bgColor: '#4F46E5' },
          alignment: { horizontal: 'center', vertical: 'middle' }
        }
      };
    });
    
    return [headerRow, ...data.map(row => this.processRow(row, { dateFormat, numberFormat, currency }))];
  }

  // Process individual row
  private processRow(
    row: ExcelRow, 
    options: { dateFormat: string; numberFormat: string; currency: string }
  ): ExcelRow {
    const processedRow: ExcelRow = {};
    
    Object.entries(row).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'value' in value) {
        // Already processed cell
        processedRow[key] = value;
      } else {
        // Process raw value
        processedRow[key] = this.processCell(value, options);
      }
    });
    
    return processedRow;
  }

  // Process individual cell
  private processCell(
    value: any, 
    options: { dateFormat: string; numberFormat: string; currency: string }
  ): ExcelCell {
    const { dateFormat, numberFormat, currency } = options;
    
    // Handle different value types
    if (value === null || value === undefined) {
      return { value: '', type: 'string' };
    }
    
    if (typeof value === 'boolean') {
      return { 
        value: value ? 'Ha' : 'Yo\'q', 
        type: 'string',
        style: {
          alignment: { horizontal: 'center' }
        }
      };
    }
    
    if (value instanceof Date) {
      return { 
        value: this.formatDate(value, dateFormat), 
        type: 'date',
        format: dateFormat
      };
    }
    
    if (typeof value === 'number') {
      return { 
        value: value, 
        type: 'number',
        format: numberFormat,
        style: {
          alignment: { horizontal: 'right' }
        }
      };
    }
    
    if (typeof value === 'string') {
      // Check if it's a currency value
      if (value.includes(currency) || value.includes('$') || value.includes('UZS')) {
        const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
        if (!isNaN(numValue)) {
          return { 
            value: numValue, 
            type: 'number',
            format: numberFormat,
            style: {
              alignment: { horizontal: 'right' },
              font: { bold: true }
            }
          };
        }
      }
      
      return { value: value, type: 'string' };
    }
    
    return { value: String(value), type: 'string' };
  }

  // Apply styling to worksheet
  private applyStyling(ws: XLSX.WorkSheet, data: ExcelRow[], includeHeaders: boolean): void {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        
        if (!cell) continue;
        
        // Apply alternating row colors
        if (row > 0 && (row % 2 === 0)) {
          cell.s = {
            ...cell.s,
            fill: { bgColor: '#F9FAFB' }
          };
        }
        
        // Apply border to all cells
        cell.s = {
          ...cell.s,
          border: {
            top: '#E5E7EB',
            bottom: '#E5E7EB',
            left: '#E5E7EB',
            right: '#E5E7EB'
          }
        };
      }
    }
  }

  // Auto width columns
  private autoWidthColumns(ws: XLSX.WorkSheet, data: ExcelRow[]): void {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const widths: number[] = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10; // Minimum width
      
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        
        if (cell && cell.v) {
          const value = String(cell.v);
          const width = Math.min(value.length * 1.2, 50); // Max width 50
          maxWidth = Math.max(maxWidth, width);
        }
      }
      
      widths[col] = maxWidth;
    }
    
    ws['!cols'] = widths.map(width => ({ width }));
  }

  // Format date
  private formatDate(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    switch (format) {
      case 'dd/mm/yyyy':
        return `${day}/${month}/${year}`;
      case 'mm/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }

  // Translate headers to Uzbek
  private translateHeader(header: string): string {
    const translations: Record<string, string> = {
      'id': 'ID',
      'name': 'Nomi',
      'productName': 'Mahsulot nomi',
      'customerName': 'Mijoz nomi',
      'quantity': 'Miqdori',
      'price': 'Narxi',
      'total': 'Jami',
      'subtotal': 'Jami (chek)',
      'amount': 'Summa',
      'date': 'Sana',
      'createdAt': 'Yaratilgan sana',
      'updatedAt': 'Yangilangan sana',
      'status': 'Holati',
      'type': 'Turi',
      'category': 'Kategoriya',
      'warehouse': 'Ombor',
      'phone': 'Telefon',
      'address': 'Manzil',
      'email': 'Email',
      'currency': 'Valyuta',
      'paymentType': 'To\'lov turi',
      'debt': 'Qarz',
      'paid': 'To\'langan',
      'balance': 'Balans',
      'stock': 'Zaxira',
      'unitsPerBag': 'Qopdagi dona',
      'pricePerBag': 'Qop narxi',
      'pricePerPiece': 'Dona narxi'
    };
    
    return translations[header.toLowerCase()] || header;
  }

  // Download file
  private downloadFile(excelBuffer: ArrayBuffer, fileName: string): void {
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fullFileName = `${fileName}_${new Date().toLocaleDateString('uz-UZ').replace(/\//g, '-')}.xlsx`;
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fullFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(url);
  }

  // Export sales data
  exportSales(sales: any[], options?: ExcelExportOptions): boolean {
    const salesData = sales.map(sale => ({
      'id': sale.id,
      'customerName': sale.customer?.name ? trData(sale.customer.name) : 'Ko\'cha savdo',
      'date': sale.createdAt,
      'items': sale.items?.length || 0,
      'totalAmount': sale.totalAmount,
      'paidAmount': sale.paidAmount,
      'debtAmount': sale.debtAmount,
      'currency': sale.currency,
      'paymentType': sale.paymentType,
      'status': sale.status || 'active'
    }));
    
    return this.exportToExcel(salesData, {
      fileName: 'sotuvlar',
      sheetName: 'Sotuvlar',
      ...options
    });
  }

  // Export products data
  exportProducts(products: any[], options?: ExcelExportOptions): boolean {
    const productsData = products.map(product => ({
      'id': product.id,
      'name': trData(product.name),
      'code': product.code,
      'warehouse': product.warehouse,
      'stock': product.currentStock || 0,
      'unitsPerBag': product.unitsPerBag || 2000,
      'pricePerBag': product.pricePerBag || 0,
      'pricePerPiece': (product.pricePerBag || 0) / (product.unitsPerBag || 2000),
      'category': product.category || 'Boshqa',
      'active': product.active !== false
    }));
    
    return this.exportToExcel(productsData, {
      fileName: 'mahsulotlar',
      sheetName: 'Mahsulotlar',
      ...options
    });
  }

  // Export customers data
  exportCustomers(customers: any[], options?: ExcelExportOptions): boolean {
    const customersData = customers.map(customer => ({
      'id': customer.id,
      'name': trData(customer.name),
      'phone': customer.phone,
      'address': customer.address,
      'debtUZS': customer.debtUZS || 0,
      'debtUSD': customer.debtUSD || 0,
      'totalDebt': (customer.debtUZS || 0) + ((customer.debtUSD || 0) * 12500),
      'createdAt': customer.createdAt,
      'active': customer.active !== false
    }));
    
    return this.exportToExcel(customersData, {
      fileName: 'mijozlar',
      sheetName: 'Mijozlar',
      ...options
    });
  }

  // Export financial data
  exportFinancial(data: any[], options?: ExcelExportOptions): boolean {
    const financialData = data.map(item => ({
      'date': item.date,
      'type': item.type,
      'amount': item.amount,
      'currency': item.currency,
      'description': item.description,
      'category': item.category,
      'balance': item.balance
    }));
    
    return this.exportToExcel(financialData, {
      fileName: 'moliyaviy',
      sheetName: 'Moliyaviy hisobot',
      ...options
    });
  }
}

// Create singleton instance
export const excelUtils = ProfessionalExcelUtils.getInstance();

// Convenience functions
export const exportToExcel = (data: any[], options?: ExcelExportOptions) => {
  return excelUtils.exportToExcel(data, options);
};

export const exportSales = (sales: any[], options?: ExcelExportOptions) => {
  return excelUtils.exportSales(sales, options);
};

export const exportProducts = (products: any[], options?: ExcelExportOptions) => {
  return excelUtils.exportProducts(products, options);
};

export const exportCustomers = (customers: any[], options?: ExcelExportOptions) => {
  return excelUtils.exportCustomers(customers, options);
};

export const exportFinancial = (data: any[], options?: ExcelExportOptions) => {
  return excelUtils.exportFinancial(data, options);
};

export default ProfessionalExcelUtils;

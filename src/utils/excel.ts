import * as XLSX from 'xlsx';

export interface ProductRow {
  'Product Name': string;
  'Rate': number;
  'HSN/SAC': string;
  'Unit': string;
}

export interface ShortcutRow {
  'Full Product Name': string;
  'Shortcut Name': string;
}

export const parseExcelFile = async <T>(file: File): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const validateProductData = (data: any[]): ProductRow[] => {
  return data.filter(row => {
    return (
      row['Product Name'] &&
      typeof row['Rate'] === 'number' &&
      row['HSN/SAC'] &&
      row['Unit']
    );
  });
};

export const validateShortcutData = (data: any[]): ShortcutRow[] => {
  return data.filter(row => {
    return (
      row['Full Product Name'] &&
      row['Shortcut Name']
    );
  });
};
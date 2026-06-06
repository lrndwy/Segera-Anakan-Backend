export const buildInvoiceNumber = (date: Date, sequence: number): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  return `INV-${datePart}-${String(sequence).padStart(4, '0')}`;
};

export const toNumber = (value: string | number): number => Number(value);

export const calculateSubtotal = (pricePerKg: number, quantityKg: number): number =>
  Number((pricePerKg * quantityKg).toFixed(2));

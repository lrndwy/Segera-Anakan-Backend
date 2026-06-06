export const buildInvoiceNumber = (bookingDate: string, sequence: number): string => {
  const datePart = bookingDate.replace(/-/g, '');
  return `INV-${datePart}-${String(sequence).padStart(4, '0')}`;
};

export const calculateTotalAmount = (pricePerPerson: number, totalPeople: number): number => {
  return Number((pricePerPerson * totalPeople).toFixed(2));
};

export const calculateBoatsNeeded = (totalPeople: number, boatCapacity: number): number => {
  if (boatCapacity <= 0) {
    return 0;
  }

  return Math.ceil(totalPeople / boatCapacity);
};

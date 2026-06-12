export type TourismServiceMeta = {
  actorUserId?: string | null | undefined;
  ipAddress: string;
};

export type DestinationImageResponse = {
  id: string;
  fileId: string;
  url: string;
};

export type DestinationListItemResponse = {
  id: string;
  villageId: string;
  villageName: string;
  name: string;
  description: string;
  pricePerPerson: number;
  capacityPerDay: number;
  maxPeoplePerBooking: number;
  isActive: boolean;
  thumbnailUrl: string | null;
};

export type DestinationDetailResponse = DestinationListItemResponse & {
  images: DestinationImageResponse[];
};

export type BoatOwnerResponse = {
  id: string;
  villageId: string;
  fullName: string;
  phone: string;
  boatName: string;
  boatCapacity: number;
  isActive: boolean;
  lastAssignedAt: string | null;
};

export type CreateBookingResponse = {
  bookingId: string;
  invoiceNumber: string;
  totalAmount: number;
  qris: {
    villageId: string;
    url: string;
  } | null;
  qrisPayload: string | null;
};

export type BookingListItemResponse = {
  id: string;
  invoiceNumber: string;
  villageId: string;
  destinationId: string;
  destinationName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  totalPeople: number;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export type BookingPaymentResponse = {
  id: string;
  bookingId: string;
  senderName: string;
  paymentStatus: string;
  createdAt: string;
};

export type BoatAssignmentResponse = {
  id: string;
  bookingId: string;
  boatOwnerId: string;
  boatOwnerName: string;
  boatName: string;
  assignedPeople: number;
  status: string;
  assignedAt: string;
};

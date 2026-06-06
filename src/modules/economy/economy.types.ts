export type EconomyServiceMeta = {
  actorUserId?: string | null | undefined;
  ipAddress: string;
};

export type FishermanResponse = {
  id: string;
  villageId: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
};

export type CommodityInventoryListItemResponse = {
  id: string;
  fishermanId: string;
  fishermanName: string;
  commodityId: string;
  commodityName: string;
  villageId: string;
  villageName: string;
  availableWeightKg: number;
  pricePerKg: number;
};

export type CommodityInventoryDetailResponse = CommodityInventoryListItemResponse;

export type StockMovementResponse = {
  id: string;
  inventoryId: string;
  movementType: string;
  quantityKg: number;
  previousStockKg: number;
  newStockKg: number;
  referenceType: string;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
};

export type CreateCommodityOrderResponse = {
  orderId: string;
  invoiceNumber: string;
  totalAmount: number;
  qris: {
    villageId: string;
    url: string;
  } | null;
};

export type CommodityPaymentResponse = {
  id: string;
  commodityOrderId: string;
  senderName: string;
  paymentStatus: string;
  createdAt: string;
};

export type CommodityOrderListItemResponse = {
  id: string;
  invoiceNumber: string;
  villageId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export type ManifestListItemResponse = {
  id: string;
  villageId: string;
  manifestDate: string;
  status: string;
  itemCount: number;
  createdAt: string;
};

export type ManifestDetailResponse = ManifestListItemResponse & {
  departureTime: string | null;
  completedAt: string | null;
  items: Array<{
    id: string;
    commodityOrderId: string;
    invoiceNumber: string;
    buyerName: string;
  }>;
};

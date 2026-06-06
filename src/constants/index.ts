export const UserRole = {
  ADMIN_KECAMATAN: 'ADMIN_KECAMATAN',
  ADMIN_DESA: 'ADMIN_DESA',
  KADER_DESA: 'KADER_DESA',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const BookingStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  WAITING_VERIFICATION: 'WAITING_VERIFICATION',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const CommodityOrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  WAITING_VERIFICATION: 'WAITING_VERIFICATION',
  CONFIRMED: 'CONFIRMED',
  WAITING_MANIFEST: 'WAITING_MANIFEST',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type CommodityOrderStatus = (typeof CommodityOrderStatus)[keyof typeof CommodityOrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RobStatus = {
  AMAN: 'AMAN',
  WASPADA: 'WASPADA',
  BAHAYA: 'BAHAYA',
} as const;

export type RobStatus = (typeof RobStatus)[keyof typeof RobStatus];

export const WaterStatus = {
  AMAN: 'AMAN',
  SIAGA: 'SIAGA',
  KRITIS: 'KRITIS',
} as const;

export type WaterStatus = (typeof WaterStatus)[keyof typeof WaterStatus];

export const WaterCondition = {
  TAWAR: 'TAWAR',
  PAYAU: 'PAYAU',
} as const;

export type WaterCondition = (typeof WaterCondition)[keyof typeof WaterCondition];

export const BoatAssignmentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type BoatAssignmentStatus = (typeof BoatAssignmentStatus)[keyof typeof BoatAssignmentStatus];

export const MovementType = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const ManifestStatus = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  DEPARTED: 'DEPARTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type ManifestStatus = (typeof ManifestStatus)[keyof typeof ManifestStatus];

export const AgencyType = {
  PDAM: 'PDAM',
  BPBD: 'BPBD',
  DINAS_SOSIAL: 'DINAS_SOSIAL',
  OTHER: 'OTHER',
} as const;

export type AgencyType = (typeof AgencyType)[keyof typeof AgencyType];

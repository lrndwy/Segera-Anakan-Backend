import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN_KECAMATAN', 'ADMIN_DESA', 'KADER_DESA']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE']);
export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING_PAYMENT',
  'WAITING_VERIFICATION',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
]);
export const commodityOrderStatusEnum = pgEnum('commodity_order_status', [
  'PENDING_PAYMENT',
  'WAITING_VERIFICATION',
  'CONFIRMED',
  'WAITING_MANIFEST',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
]);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'VERIFIED', 'REJECTED']);
export const robStatusEnum = pgEnum('rob_status', ['AMAN', 'WASPADA', 'BAHAYA']);
export const waterStatusEnum = pgEnum('water_status', ['AMAN', 'SIAGA', 'KRITIS']);
export const waterConditionEnum = pgEnum('water_condition', ['TAWAR', 'PAYAU']);
export const agencyTypeEnum = pgEnum('agency_type', ['PDAM', 'BPBD', 'DINAS_SOSIAL', 'OTHER']);
export const boatAssignmentStatusEnum = pgEnum('boat_assignment_status', [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
]);
export const movementTypeEnum = pgEnum('movement_type', ['IN', 'OUT', 'ADJUSTMENT']);
export const manifestStatusEnum = pgEnum('manifest_status', [
  'DRAFT',
  'READY',
  'DEPARTED',
  'COMPLETED',
  'CANCELLED',
]);

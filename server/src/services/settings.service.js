import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { round2 } from '../lib/pricing.js';

// Mirrors the defaults in create_orders() and the platform_settings table, so
// the API and checkout still behave sensibly if the row is ever missing.
export const DEFAULT_DELIVERY_CHARGE = 29;
export const DEFAULT_FREE_DELIVERY_THRESHOLD = 200;

const SETTINGS_SELECT =
  'delivery_charge, free_delivery_threshold, updated_at, updated_by';

function serialize(row) {
  return {
    deliveryCharge: row ? Number(row.delivery_charge) : DEFAULT_DELIVERY_CHARGE,
    freeDeliveryThreshold: row
      ? Number(row.free_delivery_threshold)
      : DEFAULT_FREE_DELIVERY_THRESHOLD,
    updatedAt: row?.updated_at ?? null,
  };
}

// GET /settings and GET /admin/settings.
export async function getSettings() {
  const { data, error } = await db
    .from('platform_settings')
    .select(SETTINGS_SELECT)
    .eq('id', true)
    .maybeSingle();

  if (error) throw new AppError(500, 'Could not load settings', { cause: error });
  return serialize(data);
}

// PATCH /admin/settings. Upsert so the single row is recreated if it was
// removed; the DB defaults fill in whichever field is not supplied.
export async function updateSettings(patch, updatedBy) {
  const update = { id: true, updated_at: new Date().toISOString() };
  if (patch.deliveryCharge !== undefined) {
    update.delivery_charge = round2(patch.deliveryCharge);
  }
  if (patch.freeDeliveryThreshold !== undefined) {
    update.free_delivery_threshold = round2(patch.freeDeliveryThreshold);
  }
  if (updatedBy) update.updated_by = updatedBy;

  const { data, error } = await db
    .from('platform_settings')
    .upsert(update, { onConflict: 'id' })
    .select(SETTINGS_SELECT)
    .single();

  if (error) throw new AppError(500, 'Could not save settings', { cause: error });
  return serialize(data);
}

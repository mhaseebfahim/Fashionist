import mongoose from 'mongoose';
import { RIDER_VEHICLES } from '../utils/totals.js';

const settingsSchema = new mongoose.Schema(
  {
    store: {
      name: { type: String, default: 'Fashionist' },
      logo: String,
      phone: String,
      email: String,
      whatsapp: String,
      address: String,
    },
    shippingRates: { type: Map, of: Number, default: { Multan: 150 } },
    defaultShippingFee: { type: Number, default: 250 },
    freeShippingAbove: { type: Number, default: 5000 },
    // Local same-day delivery for the store's own city, run by the admin's riders.
    sameDay: {
      enabled: { type: Boolean, default: true },
      city: { type: String, default: 'Multan', trim: true },
      fee: { type: Number, default: 250, min: 0 },
      cutoffHour: { type: Number, default: 15, min: 0, max: 23 }, // orders before this hour (PKT) arrive today
      riders: [
        {
          name: { type: String, required: true, trim: true },
          phone: { type: String, required: true, trim: true },
          vehicle: { type: String, enum: RIDER_VEHICLES, default: 'Bike' },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    lowStockLevel: { type: Number, default: 5 },
    returnWindowDays: { type: Number, default: 7 },
    emailNotifications: {
      orderPlaced: { type: Boolean, default: true },
      statusChanged: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.current = async function () {
  return (await this.findOne()) || this.create({});
};

export default mongoose.model('Settings', settingsSchema);

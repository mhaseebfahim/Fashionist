import mongoose from 'mongoose';

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

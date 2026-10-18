export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

export const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
};

export const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

/** Statuses whose entry puts stock back on the shelf. */
export const RESTOCK_STATUSES = ['Cancelled', 'Returned'];

export const isWithinReturnWindow = (deliveredAt, days = 7, now = new Date()) =>
  !!deliveredAt && now.getTime() - new Date(deliveredAt).getTime() <= days * 86400000;

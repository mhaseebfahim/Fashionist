import { Router } from 'express';
import { body, param } from 'express-validator';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImages } from '../middleware/upload.js';
import * as a from '../controllers/adminController.js';
import * as o from '../controllers/adminOrderController.js';
import * as r from '../controllers/reportController.js';
import * as cms from '../controllers/cmsController.js';
import { SECTION_TYPES } from '../models/Cms.js';

const id = (n = 'id') => param(n).isMongoId().withMessage('Invalid id');
const v = (...chains) => validate(chains);
const hex = (f) => body(f).optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage(`${f} must be a hex colour`);
const product = (partial) => {
  const o = (c) => (partial ? c.optional() : c);
  return [
    o(body('title').isString().trim().isLength({ min: 2, max: 140 })),
    body('titleUr').optional().isString().isLength({ max: 140 }),
    o(body('category').isMongoId().withMessage('Category is required')),
    o(body('price').isFloat({ min: 0 }).withMessage('Price must be ≥ 0')),
    body('compareAtPrice').optional({ values: 'null' }).isFloat({ min: 0 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('descriptionUr').optional().isString().isLength({ max: 5000 }),
    body('images').optional().isArray({ max: 12 }),
    body('images.*').optional().isURL({ require_protocol: true }).withMessage('Image must be a full URL'),
    body('attributes').optional().isObject(),
    o(body('variants').isArray({ min: 1 }).withMessage('At least one variant is required')),
    body('variants.*.sku').optional().isString().trim().matches(/^[A-Za-z0-9-]{2,40}$/).withMessage('SKU: letters, numbers and dashes only'),
    body('variants.*.stock').optional().isInt({ min: 0 }),
    body('tags').optional().isArray({ max: 20 }),
    body('slug').optional().isString().isLength({ max: 160 }),
    body('seo.metaTitle').optional().isString().isLength({ max: 70 }),
    body('seo.metaDescription').optional().isString().isLength({ max: 170 }),
    body('isActive').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
  ];
};
const category = (partial) => [(partial ? body('name').optional() : body('name')).isString().trim().isLength({ min: 2, max: 60 }), body('nameUr').optional().isString(), body('parent').optional({ values: 'null' }).isMongoId(), body('image').optional().isString(), body('sortOrder').optional().isInt(), body('isActive').optional().isBoolean()];
const coupon = (partial) => {
  const o = (c) => (partial ? c.optional() : c);
  return [o(body('code').isString().trim().matches(/^[A-Za-z0-9]{3,20}$/).withMessage('Code: 3–20 letters/numbers')), o(body('type').isIn(['percent', 'fixed', 'freeship'])), o(body('value').isFloat({ min: 0 })), body('value').optional().custom((val, { req }) => req.body.type !== 'percent' || val <= 100).withMessage('Percent must be ≤ 100'), body('maxDiscount').optional({ values: 'null' }).isFloat({ min: 0 }), body('minOrder').optional().isFloat({ min: 0 }), body('usageLimit').optional({ values: 'null' }).isInt({ min: 1 }), body('expiresAt').optional({ values: 'null' }).isISO8601(), body('isActive').optional().isBoolean()];
};
const section = (partial) => [(partial ? body('type').optional() : body('type')).isIn(SECTION_TYPES), body('title').optional().isString().isLength({ max: 200 }), body('titleUr').optional().isString(), body('subtitle').optional().isString(), body('subtitleUr').optional().isString(), body('content').optional().isObject(), body('isVisible').optional().isBoolean(), body('startAt').optional({ values: 'null' }).isISO8601(), body('endAt').optional({ values: 'null' }).isISO8601()];
const page = [body('title').isString().trim().isLength({ min: 2, max: 140 }), body('slug').optional().isString(), body('titleUr').optional().isString(), body('blocks').optional().isArray({ max: 60 }), body('blocks.*.type').optional().isIn(['heading', 'paragraph', 'image', 'twoColumn', 'faq']), body('metaTitle').optional().isString().isLength({ max: 70 }), body('metaDescription').optional().isString().isLength({ max: 170 }), body('isPublished').optional().isBoolean()];

export default Router()
  .use(protect, adminOnly)
  .get('/dashboard', a.dashboard)
  .get('/notifications', a.notifications)
  .get('/search', a.search)
  // products
  .get('/products', a.listProducts)
  .post('/products', v(...product(false)), a.createProduct)
  .post('/products/bulk', v(body('ids').isArray({ min: 1, max: 500 }), body('ids.*').isMongoId(), body('action').isIn(['activate', 'hide', 'delete', 'category']), body('category').if(body('action').equals('category')).isMongoId()), a.bulkProducts)
  .get('/products/:id', v(id()), a.getProduct)
  .put('/products/:id', v(id(), ...product(true)), a.updateProduct)
  .delete('/products/:id', v(id()), a.deleteProduct)
  .post('/bulk-import/preview', v(body('csv').isString().isLength({ min: 10, max: 900000 })), a.importPreview)
  .post('/bulk-import', v(body('csv').isString().isLength({ min: 10, max: 900000 })), a.bulkImport)
  // categories
  .get('/categories', a.adminCategories)
  .post('/categories', v(...category(false)), a.createCategory)
  .patch('/categories/reorder', v(body('items').isArray({ min: 1 }), body('items.*.id').isMongoId(), body('items.*.sortOrder').isInt(), body('items.*.parent').optional({ values: 'null' }).isMongoId()), a.reorderCategories)
  .put('/categories/:id', v(id(), ...category(true)), a.updateCategory)
  .delete('/categories/:id', v(id()), a.deleteCategory)
  // inventory
  .get('/inventory', a.inventory)
  .get('/inventory/export', a.exportInventory)
  .patch('/inventory', v(body('sku').isString().notEmpty(), body('stock').isInt({ min: 0, max: 100000 }).toInt()), a.updateStock)
  // orders & returns
  .get('/orders', o.listOrders)
  .get('/orders/export', o.exportOrders)
  .post('/orders/bulk-status', v(body('ids').isArray({ min: 1, max: 200 }), body('ids.*').isMongoId(), body('status').isIn(['Confirmed', 'Shipped', 'Delivered', 'Cancelled']), body('note').optional().isString().isLength({ max: 300 })), o.bulkStatus)
  .get('/orders/:id', v(id()), o.getOrder)
  .get('/orders/:id/invoice', v(id()), o.invoice)
  .patch('/orders/:id/status', v(id(), body('status').isIn(['Confirmed', 'Shipped', 'Delivered', 'Cancelled']), body('courier').optional().isString().isLength({ max: 40 }), body('trackingNumber').optional().isString().isLength({ max: 60 }), body('note').optional().isString().isLength({ max: 300 })), o.updateStatus)
  .get('/returns', o.listReturns)
  .patch('/returns/:id', v(id(), body('decision').isIn(['Approved', 'Rejected']), body('note').optional().isString().isLength({ max: 300 })), o.decideReturn)
  // customers, coupons, reviews
  .get('/customers', a.listCustomers)
  .get('/customers/:id', v(id()), a.getCustomer)
  .patch('/customers/:id', v(id(), body('isBlocked').isBoolean()), a.setBlocked)
  .get('/coupons', a.listCoupons)
  .post('/coupons', v(...coupon(false)), a.saveCoupon)
  .put('/coupons/:id', v(id(), ...coupon(true)), a.saveCoupon)
  .delete('/coupons/:id', v(id()), a.deleteCoupon)
  .get('/reviews', a.listReviews)
  .patch('/reviews/:id', v(id(), body('status').isIn(['Approved', 'Hidden'])), a.setReviewStatus)
  // reports, settings, activity
  .get('/reports', r.reports)
  .get('/reports/export', r.exportReport)
  .get('/settings', a.getSettings)
  .put('/settings', v(body('store').optional().isObject(), body('store.email').optional({ values: 'falsy' }).isEmail(), body('shippingRates').optional().isObject(), body('shippingRates.*').optional().isFloat({ min: 0 }), body('defaultShippingFee').optional().isFloat({ min: 0 }), body('freeShippingAbove').optional().isFloat({ min: 0 }), body('lowStockLevel').optional().isInt({ min: 0 }), body('returnWindowDays').optional().isInt({ min: 0, max: 60 }), body('emailNotifications').optional().isObject()), a.updateSettings)
  .get('/activity', a.activity)
  // media
  .get('/media', a.listMedia)
  .post('/media/upload', uploadImages, a.uploadMedia)
  .post('/media', v(body('url').isURL({ require_protocol: true }), body('alt').optional().isString().isLength({ max: 140 }), body('folder').optional().isString().isLength({ max: 40 })), a.addMediaUrl)
  .delete('/media/:id', v(id()), a.deleteMedia)
  // cms
  .get('/cms/preview', cms.previewCms)
  .get('/cms/theme', cms.theme.get)
  .put('/cms/theme', v(hex('primaryColor'), hex('accentColor'), body('fontPair').optional().isIn(['classic', 'bodoni', 'soft']), body('buttonStyle').optional().isIn(['sharp', 'pill']), body('darkModeEnabled').optional().isBoolean(), body('logo').optional().isString(), body('favicon').optional().isString()), cms.theme.put)
  .post('/cms/theme/reset', cms.resetTheme)
  .get('/cms/navigation', cms.navigation.get)
  .put('/cms/navigation', v(body('header').isArray({ max: 12 }), body('footer').isArray({ max: 6 })), cms.navigation.put)
  .get('/cms/announcement', cms.announcement.get)
  .put('/cms/announcement', v(body('enabled').isBoolean(), body('messages').isArray({ max: 10 }), hex('background'), body('link').optional().isString()), cms.announcement.put)
  .get('/cms/sections', cms.listSections)
  .post('/cms/sections', v(...section(false)), cms.createSection)
  .patch('/cms/sections/reorder', v(body('ids').isArray({ min: 1 }), body('ids.*').isMongoId()), cms.reorderSections)
  .post('/cms/sections/publish', cms.publishSections)
  .post('/cms/sections/revert', cms.revertSections)
  .put('/cms/sections/:id', v(id(), ...section(true)), cms.updateSection)
  .post('/cms/sections/:id/duplicate', v(id()), cms.duplicateSection)
  .delete('/cms/sections/:id', v(id()), cms.deleteSection)
  .get('/cms/pages', cms.listPages)
  .post('/cms/pages', v(...page), cms.savePage)
  .put('/cms/pages/:id', v(id(), ...page), cms.savePage)
  .delete('/cms/pages/:id', v(id()), cms.deletePage);

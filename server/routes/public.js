import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as auth from '../controllers/authController.js';
import * as catalog from '../controllers/catalogController.js';
import * as cart from '../controllers/cartController.js';
import * as orders from '../controllers/orderController.js';
import * as cms from '../controllers/cmsController.js';

const PHONE = /^03\d{9}$/;
const limiter = (limit) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test', message: { success: false, message: 'Too many attempts, please try again in 15 minutes' } });
const loginLimiter = limiter(10);
const strongPw = (f = 'password') => body(f).isStrongPassword({ minLength: 8, minSymbols: 0 }).withMessage('Password needs 8+ characters with upper case, lower case and a number');
const address = (p = '') => [
  body(`${p}name`).trim().isLength({ min: 2, max: 80 }).withMessage('Name is required'),
  body(`${p}phone`).matches(PHONE).withMessage('Mobile must be 03XXXXXXXXX'),
  body(`${p}city`).trim().isLength({ min: 2, max: 60 }).withMessage('City is required'),
  body(`${p}area`).optional().trim().isLength({ max: 120 }),
  body(`${p}street`).trim().isLength({ min: 3, max: 200 }).withMessage('Street address is required'),
];
const email = () => body('email').isString().trim().toLowerCase().isEmail().withMessage('Enter a valid email');
const mongoId = (n = 'id') => param(n).isMongoId().withMessage('Invalid id');

/* ---- /api/auth ---- */
export const authRoutes = Router()
  .post('/register', limiter(20), validate([body('name').trim().isLength({ min: 2, max: 80 }), email(), body('phone').matches(PHONE).withMessage('Mobile must be 03XXXXXXXXX'), strongPw()]), auth.register)
  .post('/login', loginLimiter, validate([email(), body('password').isString().notEmpty()]), auth.login)
  .post('/forgot-password', loginLimiter, validate([email()]), auth.forgotPassword)
  .post('/reset-password/:token', loginLimiter, validate([param('token').isHexadecimal().isLength({ min: 64, max: 64 }), strongPw()]), auth.resetPassword)
  .get('/config', auth.config)
  .post('/verify-email', loginLimiter, validate([email(), body('otp').isString().matches(/^\d{6}$/).withMessage('Enter the 6-digit code')]), auth.verifyEmail)
  .post('/resend-otp', loginLimiter, validate([email()]), auth.resendOtp)
  .post('/google', loginLimiter, validate([body('credential').isString().isLength({ min: 20, max: 5000 })]), auth.google)
  .get('/me', protect, auth.me)
  .patch('/me', protect, validate([body('name').optional().trim().isLength({ min: 2, max: 80 }), body('phone').optional().matches(PHONE), body('language').optional().isIn(['en', 'ur'])]), auth.updateMe)
  .get('/addresses', protect, auth.listAddresses)
  .post('/addresses', protect, validate([...address(), body('label').optional().isLength({ max: 30 }), body('isDefault').optional().isBoolean()]), auth.addAddress)
  .put('/addresses/:id', protect, validate([mongoId(), ...address().map((c) => c.optional()), body('isDefault').optional().isBoolean()]), auth.updateAddress)
  .delete('/addresses/:id', protect, validate([mongoId()]), auth.deleteAddress);

/* ---- catalogue / cms / settings ---- */
export const catalogRoutes = Router()
  .get('/categories', catalog.listCategories)
  .get('/products', catalog.listProducts)
  .get('/products/:id/reviews', catalog.productReviews)
  .post('/products/:id/reviews', protect, validate([mongoId(), body('rating').isInt({ min: 1, max: 5 }), body('comment').optional().isString().trim().isLength({ max: 1000 })]), catalog.createReview)
  .get('/products/:slug', catalog.getProduct)
  .get('/settings/public', catalog.publicSettings)
  .get('/sitemap.xml', catalog.sitemap)
  .get('/cms', cms.publicCms)
  .get('/cms/pages/:slug', cms.publicPage);

/* ---- /api/cart, /api/wishlist ---- */
export const shopRoutes = Router()
  .get('/cart', protect, cart.getCart)
  .put('/cart', protect, validate([body('items').isArray({ max: 50 }), body('items.*.product').isMongoId(), body('items.*.sku').isString(), body('items.*.qty').isInt({ min: 1, max: 10 })]), cart.saveCart)
  .get('/wishlist', protect, cart.getWishlist)
  .post('/wishlist/:productId', protect, validate([mongoId('productId')]), cart.toggleWishlist);

/* ---- /api/orders ---- */
export const orderRoutes = Router()
  .use(protect)
  .post('/', validate([body('items').isArray({ min: 1, max: 30 }).withMessage('Your cart is empty'), body('items.*.sku').isString().trim().notEmpty(), body('items.*.qty').isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1–10'), ...address('shippingAddress.'), body('couponCode').optional({ values: 'falsy' }).isString().isLength({ max: 30 })]), orders.createOrder)
  .get('/my', orders.myOrders)
  .post('/validate-coupon', validate([body('code').isString().trim().notEmpty(), body('subtotal').isFloat({ min: 0 }), body('city').optional().isString()]), orders.validateCoupon)
  .get('/:id', orders.getMyOrder)
  .post('/:id/cancel', orders.cancelMyOrder)
  .post('/:id/return', validate([body('type').isIn(['return', 'exchange']), body('reason').trim().isLength({ min: 5, max: 500 })]), orders.requestReturn);

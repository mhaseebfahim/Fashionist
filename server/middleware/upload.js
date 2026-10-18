import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/AppError.js';

export const cloudinaryReady = () => !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (cloudinaryReady())
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

// Only jpg / png / webp, max 5 MB each, max 10 per request.
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => (/^image\/(jpeg|png|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new AppError('Only JPG, PNG or WEBP images are allowed', 400))),
}).array('images', 10);

export const toCloudinary = (buffer, folder = 'fashionist') =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (err, r) => (err ? reject(err) : resolve({ url: r.secure_url, publicId: r.public_id }))).end(buffer);
  });

export const removeFromCloudinary = (publicId) => (publicId && cloudinaryReady() ? cloudinary.uploader.destroy(publicId).catch(() => {}) : Promise.resolve());

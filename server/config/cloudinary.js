import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/.env is loaded
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

export const initCloudinary = () => {
  const cloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
};

initCloudinary();

export const isCloudinaryConfigured = () => {
  initCloudinary();
  if ((process.env.CLOUDINARY_URL || '').trim()) return true;
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  return Boolean(cloudName && apiKey && apiSecret);
};

export const uploadToCloudinary = async (fileBase64OrUrl, folder = 'kerala_wood_billing', filename = '') => {
  initCloudinary();

  const sanitizedName = filename
    ? `${filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`
    : `file_${Date.now()}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      fileBase64OrUrl,
      {
        folder,
        resource_type: 'auto',
        public_id: sanitizedName,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      }
    );
  });
};

export const deleteFromCloudinary = async (publicId) => {
  initCloudinary();
  if (!publicId) return null;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

export default cloudinary;

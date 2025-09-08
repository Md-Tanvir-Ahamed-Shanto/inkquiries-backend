import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const reviewPhotosPath = path.join(UPLOADS_DIR, 'review_photos');
    if (!fs.existsSync(reviewPhotosPath)) {
      fs.mkdirSync(reviewPhotosPath, { recursive: true });
    }
    cb(null, reviewPhotosPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const portfolioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const portfolioImagesPath = path.join(UPLOADS_DIR, 'portfolio_images');
    if (!fs.existsSync(portfolioImagesPath)) {
      fs.mkdirSync(portfolioImagesPath, { recursive: true });
    }
    cb(null, portfolioImagesPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const galleryImagesPath = path.join(UPLOADS_DIR, 'gallery_images');
    if (!fs.existsSync(galleryImagesPath)) {
      fs.mkdirSync(galleryImagesPath, { recursive: true });
    }
    cb(null, galleryImagesPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileImagesPath = path.join(UPLOADS_DIR, 'profile_images');
    if (!fs.existsSync(profileImagesPath)) {
      fs.mkdirSync(profileImagesPath, { recursive: true });
    }
    cb(null, profileImagesPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});


const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|webp|png|svg|gif/;
  const mimeType = allowedFileTypes.test(file.mimetype);
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, svg, gif) are allowed!'), false);
  }
};

export const uploadReviewPhotos = multer({
  storage: reviewStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter,
});

export const uploadPortfolioImage = multer({
  storage: portfolioStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: fileFilter,
});

export const uploadsBaseDir = UPLOADS_DIR;

export const uploadGalleryImage = multer({
  storage: galleryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter,
});

export const uploadProfileImage = multer({
  storage: profileStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter,
});
import express from 'express';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import cors from 'cors';
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from 'path';
import { fileURLToPath } from 'url';

// Import Passport configuration
import './config/passport.js';
import { uploadsBaseDir } from './config/multerConfig.js';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import artistRoutes from './routes/artistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import portfolioRoutes from './routes/portfolioImageRoutes.js';
import reviewCommentRoutes from './routes/reviewCommentRoutes.js';
import portfolioCommentRoutes from './routes/portfolioCommentRoutes.js';
import socialLinkRoutes from './routes/socialLinkRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
// import reviewReportRoutes from './reviewReport.routes.js';
// import promotionRoutes from './promotion.routes.js';
// import adminLogRoutes from './adminLog.routes.js';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(morgan('dev'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fdgdfg',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads', express.static(path.join(uploadsBaseDir, '../uploads')));

app.get('/', (req, res) => {
  res.send('Tattoo Finder API is running...');
});

// Mount routes
app.use('/api/auth', authRoutes);
// OAuth routes - direct access without /api prefix
app.use('/auth', authRoutes); // This allows /auth/facebook and /auth/instagram to work
app.use('/api/admins', adminRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/review-comments', reviewCommentRoutes);
app.use('/api/portfolio-comments', portfolioCommentRoutes);
app.use('/api/social-links', socialLinkRoutes);
app.use('/api/notifications', notificationRoutes);
// app.use('/api/review-reports', reviewReportRoutes); 
// app.use('/api/promotions', promotionRoutes);
// app.use('/api/admin-logs', adminLogRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Max 5MB allowed.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Too many files uploaded or unexpected field name.' });
    }
  }
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on  http://localhost:${PORT}`);
});
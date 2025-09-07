import { Router } from 'express';
import {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  uploadAdminProfilePhoto,
  deleteAdminProfilePhoto,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getArtistSubscriptions,
  deleteArtist,
  updateArtistStatus,
  getArtistById,
  getAllArtists,
  getAllClients,
  updateClientStatus,
  deleteClient,
  getAllReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  getAllSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
  deleteSupportTicket,
  getDashboardOverview,
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/auth.js';
import { uploadProfileImage } from '../config/multerConfig.js';

const router = Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

router.route('/')
  .post(createAdmin)
  .get(getAllAdmins);

router.route('profiles/:id')
  .get(getAdminById)
  .put(updateAdmin)
  .delete(deleteAdmin);

  // Client management routes
  router.get('/clients', getAllClients);
  router.put('/clients/:id/status', protectAdmin, updateClientStatus);
  router.delete('/clients/:id', protectAdmin, deleteClient);

// Admin settings routes
router.get('/profile', protectAdmin, getAdminProfile);
router.put('/profile', protectAdmin, updateAdminProfile);
router.put('/profile/password', protectAdmin, changeAdminPassword);
router.post('/profile/photo', protectAdmin,uploadProfileImage.single('profilePhoto'), uploadAdminProfilePhoto);
router.delete('/profile/photo', protectAdmin, deleteAdminProfilePhoto);

// Subscription plan routes
router.get('/subscription-plans', protectAdmin, getAllSubscriptionPlans);
router.get('/subscription-plans/:id', protectAdmin, getSubscriptionPlanById);
router.post('/subscription-plans', protectAdmin, createSubscriptionPlan);
router.put('/subscription-plans/:id', protectAdmin, updateSubscriptionPlan);
router.delete('/subscription-plans/:id', protectAdmin, deleteSubscriptionPlan);

// Report routes
router.get('/reports', protectAdmin, getAllReports);
router.get('/reports/:id', protectAdmin, getReportById);
router.put('/reports/:id/status', protectAdmin, updateReportStatus);
router.delete('/reports/:id', protectAdmin, deleteReport);

// Support ticket routes
router.get('/support-tickets', protectAdmin, getAllSupportTickets);
router.get('/support-tickets/:id', protectAdmin, getSupportTicketById);
router.put('/support-tickets/:id/status', protectAdmin, updateSupportTicketStatus);
router.delete('/support-tickets/:id', protectAdmin, deleteSupportTicket);

// promotions management routes

router.get('/promotions', protectAdmin, getAllPromotions);
router.get('/promotions/:id', protectAdmin, getPromotionById);
router.post('/promotions', protectAdmin, createPromotion);
router.put('/promotions/:id', protectAdmin, updatePromotion);
router.delete('/promotions/:id', protectAdmin, deletePromotion);


// Artist management routes
router.get('/artists', protectAdmin, getAllArtists);
router.get('/artists/:id', protectAdmin, getArtistById);
router.put('/artists/:id/status', protectAdmin, updateArtistStatus);
router.delete('/artists/:id', protectAdmin, deleteArtist);
router.get('/artists/:id/subscriptions', protectAdmin, getArtistSubscriptions);

// Overview routes
router.get('/dashboard/overview', getDashboardOverview);


export default router;
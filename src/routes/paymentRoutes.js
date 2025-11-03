import { Router } from 'express';
import {
  createCardContract,
  createAchContract,
  createHostedPaymentPage,
  createTransaction,
  getTransaction,
  renderReceipt,
  getTransactionReports,
  getUserPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  processSubscriptionPayment
} from '../controllers/paymentController.js';
import { protectUser } from '../middleware/auth.js';

const router = Router();

// Contract routes
router.post('/contracts/card', protectUser, createCardContract);
router.post('/contracts/ach', protectUser, createAchContract);

// Hosted payment page route
router.post('/hosted-payment-page', protectUser, createHostedPaymentPage);

// Transaction routes
router.post('/transactions', protectUser, createTransaction);
router.get('/transactions/:transactionId', protectUser, getTransaction);
router.get('/transactions/:transactionId/receipt', protectUser, renderReceipt);

// Reports route
router.get('/reports', protectUser, getTransactionReports);

// Payment methods routes
router.get('/methods', protectUser, getUserPaymentMethods);
router.delete('/methods/:paymentMethodId', protectUser, deletePaymentMethod);
router.put('/methods/:paymentMethodId/default', protectUser, setDefaultPaymentMethod);

// Artist subscription payment
router.post('/subscription', protectUser, processSubscriptionPayment);

export default router;
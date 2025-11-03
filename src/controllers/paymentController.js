import { PrismaClient } from '@prisma/client';
import paymentService from '../services/paymentService.js';

const prisma = new PrismaClient();

// Fixed subscription amount for artists
const SUBSCRIPTION_AMOUNT = 29.99;

/**
 * Process artist subscription payment
 */
export const processSubscriptionPayment = async (req, res) => {
  try {
    const { paymentMethod, cardData } = req.body;
    const userId = req.user?.id;
    
    if (paymentMethod === 'card') {
      // Validate card data
      if (!cardData) {
        return res.status(400).json({ error: 'Card data is required' });
      }
      
      // Create card contract
      let cardContract;
      try {
        cardContract = await paymentService.createCardContract(cardData, {
          userId,
          userType: 'artist'
        });
      } catch (contractError) {
        console.error('Contract creation error:', contractError);
        return res.status(400).json({ 
          error: 'Payment method processing failed',
          details: contractError.message
        });
      }
      
      // Process transaction with fixed amount
      let transaction;
      try {
        transaction = await paymentService.createTransaction({
          amount: SUBSCRIPTION_AMOUNT,
          contractId: cardContract.id,
          description: 'Artist Subscription Payment'
        });
      } catch (transactionError) {
        console.error('Transaction processing error:', transactionError);
        return res.status(400).json({ 
          error: 'Payment transaction failed',
          details: transactionError.message
        });
      }
      
      // Store transaction in database
      const paymentRecord = await prisma.payment.create({
        data: {
          amount: SUBSCRIPTION_AMOUNT,
          currency: 'USD',
          status: transaction.status,
          transactionId: transaction.id,
          paymentMethod: 'card',
          description: 'Artist Subscription Payment',
          artistId: userId
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Subscription payment processed successfully',
        transaction: paymentRecord,
        isMockPayment: process.env.NODE_ENV !== 'production'
      });
    } else if (paymentMethod === 'hostedPage') {
      // Generate hosted payment page for subscription
      let hostedPage;
      try {
        hostedPage = await paymentService.createHostedPaymentPage({
          amount: SUBSCRIPTION_AMOUNT,
          description: 'Artist Subscription Payment',
          returnUrl: `${req.protocol}://${req.get('host')}/payment/subscription/complete`,
          metadata: { userId, type: 'subscription' }
        });
      } catch (pageError) {
        console.error('Hosted page creation error:', pageError);
        return res.status(400).json({ 
          error: 'Failed to create payment page',
          details: pageError.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Hosted payment page generated',
        paymentPageUrl: hostedPage.url,
        paymentPageId: hostedPage.id,
        isMockPayment: process.env.NODE_ENV !== 'production'
      });
    } else {
      return res.status(400).json({
        error: 'Invalid payment method'
      });
    }
  } catch (error) {
    console.error('Subscription payment error:', error);
    return res.status(500).json({
      error: 'Failed to process subscription payment',
      details: error.message,
      isMockPayment: process.env.NODE_ENV !== 'production'
    });
  }
};

/**
 * Create a card contract for future payments
 */
export const createCardContract = async (req, res) => {
  try {
    const { cardData, customerData } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!cardData || !customerData) {
      return res.status(400).json({ error: 'Card data and customer data are required' });
    }
    
    const contract = await paymentService.createCardContract(cardData, customerData);
    
    // Store contract reference in database
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        type: 'card',
        contractId: contract.id,
        lastFour: cardData.number.slice(-4),
        expirationMonth: cardData.expirationMonth,
        expirationYear: cardData.expirationYear,
        isDefault: true,
        metadata: {
          cardType: contract.cardType || 'unknown'
        },
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Card contract created successfully',
      paymentMethod
    });
  } catch (error) {
    console.error('Error creating card contract:', error);
    res.status(500).json({ error: 'Failed to create card contract' });
  }
};

/**
 * Create an ACH contract for bank transfers
 */
export const createAchContract = async (req, res) => {
  try {
    const { bankData, customerData } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!bankData || !customerData) {
      return res.status(400).json({ error: 'Bank data and customer data are required' });
    }
    
    const contract = await paymentService.createAchContract(bankData, customerData);
    
    // Store contract reference in database
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        type: 'ach',
        contractId: contract.id,
        lastFour: bankData.accountNumber.slice(-4),
        metadata: {
          bankName: bankData.bankName,
          accountType: bankData.accountType
        },
        isDefault: true,
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'ACH contract created successfully',
      paymentMethod
    });
  } catch (error) {
    console.error('Error creating ACH contract:', error);
    res.status(500).json({ error: 'Failed to create ACH contract' });
  }
};

/**
 * Create a hosted payment page
 */
export const createHostedPaymentPage = async (req, res) => {
  try {
    const { paymentData } = req.body;
    
    if (!paymentData) {
      return res.status(400).json({ error: 'Payment data is required' });
    }
    
    const hppResponse = await paymentService.createHostedPaymentPage(paymentData);
    
    res.status(201).json({
      success: true,
      message: 'Hosted payment page created successfully',
      paymentPageUrl: hppResponse.url,
      paymentPageId: hppResponse.id
    });
  } catch (error) {
    console.error('Error creating hosted payment page:', error);
    res.status(500).json({ error: 'Failed to create hosted payment page' });
  }
};

/**
 * Process a transaction
 */
export const createTransaction = async (req, res) => {
  try {
    const { transactionData } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!transactionData) {
      return res.status(400).json({ error: 'Transaction data is required' });
    }
    
    const transaction = await paymentService.createTransaction(transactionData);
    
    // Store transaction in database
    const paymentRecord = await prisma.payment.create({
      data: {
        amount: transactionData.amount,
        currency: transactionData.currency || 'USD',
        status: transaction.status,
        transactionId: transaction.id,
        paymentMethod: transactionData.paymentMethod,
        description: transactionData.description,
        metadata: transactionData.metadata || {},
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Transaction processed successfully',
      transaction: paymentRecord
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
};

/**
 * Get transaction details
 */
export const getTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    const transaction = await paymentService.getTransaction(transactionId);
    
    res.status(200).json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Failed to get transaction details' });
  }
};

/**
 * Generate a receipt for a transaction
 */
export const renderReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    const receipt = await paymentService.renderReceipt(transactionId);
    
    res.status(200).json({
      success: true,
      receipt
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};

/**
 * Get transaction reports
 */
export const getTransactionReports = async (req, res) => {
  try {
    const filters = req.query;
    
    const reports = await paymentService.getTransactionReports(filters);
    
    res.status(200).json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error getting transaction reports:', error);
    res.status(500).json({ error: 'Failed to get transaction reports' });
  }
};

/**
 * Get user payment methods
 */
export const getUserPaymentMethods = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      }
    });
    
    res.status(200).json({
      success: true,
      paymentMethods
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
};

/**
 * Delete a payment method
 */
export const deletePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }
    
    // Verify ownership
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      }
    });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found or unauthorized' });
    }
    
    await prisma.paymentMethod.delete({
      where: {
        id: paymentMethodId
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
};

/**
 * Set default payment method
 */
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }
    
    // Verify ownership
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      }
    });
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found or unauthorized' });
    }
    
    // Update all payment methods to not be default
    await prisma.paymentMethod.updateMany({
      where: {
        ...(userRole === 'client' ? { clientId: userId } : { artistId: userId })
      },
      data: {
        isDefault: false
      }
    });
    
    // Set the selected payment method as default
    await prisma.paymentMethod.update({
      where: {
        id: paymentMethodId
      },
      data: {
        isDefault: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Default payment method updated successfully'
    });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
};
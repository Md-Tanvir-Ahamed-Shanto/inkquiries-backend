// Set environment to test mode to use mock responses
process.env.NODE_ENV = 'test';

import dotenv from 'dotenv';
import paymentService from '../services/paymentService.js';

dotenv.config();

console.log('\n🔍 PAYMENT SERVICE VALIDATION TESTS\n');

// Validation functions
async function validateCreateCardContract() {
  console.log('🔄 Validating Create Card Contract...');
  try {
    const cardData = {
      cardNumber: '4111111111111111',
      expirationMonth: '12',
      expirationYear: '2025',
      cvv: '123'
    };
    
    const customerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      address: {
        line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US'
      }
    };
    
    const response = await paymentService.createCardContract(cardData, customerData);
    
    // Validate response
    if (!response || !response.contractId) {
      throw new Error('Invalid response: Missing contractId');
    }
    
    console.log('✅ Create Card Contract Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Create Card Contract Validation Failed:', error.message);
    throw error;
  }
}

async function validateCreateAchContract() {
  console.log('🔄 Validating Create ACH Contract...');
  try {
    const achData = {
      accountNumber: '9876543210',
      routingNumber: '021000021',
      accountType: 'checking',
      accountHolderName: 'John Doe'
    };
    
    const customerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      address: {
        line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        country: 'US'
      }
    };
    
    const response = await paymentService.createAchContract(achData, customerData);
    
    // Validate response
    if (!response || !response.contractId) {
      throw new Error('Invalid response: Missing contractId');
    }
    
    console.log('✅ Create ACH Contract Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Create ACH Contract Validation Failed:', error.message);
    throw error;
  }
}

async function validateGenerateHostedPaymentPage() {
  console.log('🔄 Validating Generate Hosted Payment Page...');
  try {
    const paymentData = {
      amount: 99.99,
      currency: 'USD',
      description: 'Test Payment',
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: {
          line1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'US'
        }
      }
    };
    
    const response = await paymentService.generateHostedPaymentPage(paymentData);
    
    // Validate response
    if (!response || !response.url) {
      throw new Error('Invalid response: Missing url');
    }
    
    console.log('✅ Generate Hosted Payment Page Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Generate Hosted Payment Page Validation Failed:', error.message);
    throw error;
  }
}

async function validateProcessTransaction(contractId) {
  console.log('🔄 Validating Process Transaction...');
  try {
    const transactionData = {
      contractId,
      amount: 49.99,
      currency: 'USD',
      description: 'Test Transaction'
    };
    
    const response = await paymentService.processTransaction(transactionData);
    
    // Validate response
    if (!response || !response.transactionId) {
      throw new Error('Invalid response: Missing transactionId');
    }
    
    console.log('✅ Process Transaction Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Process Transaction Validation Failed:', error.message);
    throw error;
  }
}

async function validateGetTransactionDetails(transactionId) {
  console.log('🔄 Validating Get Transaction Details...');
  try {
    const response = await paymentService.getTransactionDetails(transactionId);
    
    // Validate response
    if (!response || !response.transactionId || !response.status) {
      throw new Error('Invalid response: Missing required fields');
    }
    
    console.log('✅ Get Transaction Details Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Get Transaction Details Validation Failed:', error.message);
    throw error;
  }
}

async function validateRenderReceipt(transactionId) {
  console.log('🔄 Validating Render Receipt...');
  try {
    const response = await paymentService.renderReceipt(transactionId);
    
    // Validate response
    if (!response || !response.html) {
      throw new Error('Invalid response: Missing html content');
    }
    
    console.log('✅ Render Receipt Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Render Receipt Validation Failed:', error.message);
    throw error;
  }
}

async function validateGetTransactionReport() {
  console.log('🔄 Validating Get Transaction Report...');
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    const response = await paymentService.getTransactionReport(formattedStartDate, formattedEndDate);
    
    // Validate response
    if (!response || !Array.isArray(response.transactions)) {
      throw new Error('Invalid response: Missing transactions array');
    }
    
    console.log('✅ Get Transaction Report Validation Passed');
    return response;
  } catch (error) {
    console.error('❌ Get Transaction Report Validation Failed:', error.message);
    throw error;
  }
}

// Run validation tests
async function runValidationTests() {
  try {
    // Create contracts
    const cardContractResponse = await validateCreateCardContract();
    const achContractResponse = await validateCreateAchContract();
    
    // Generate hosted payment page
    await validateGenerateHostedPaymentPage();
    
    // Process transaction using card contract
    const transactionResponse = await validateProcessTransaction(cardContractResponse.contractId);
    
    // Get transaction details
    await validateGetTransactionDetails(transactionResponse.transactionId);
    
    // Render receipt
    await validateRenderReceipt(transactionResponse.transactionId);
    
    // Get transaction report
    await validateGetTransactionReport();
    
    console.log('\n✨ Payment Service Validation Tests Completed ✨\n');
  } catch (error) {
    console.error('\n❌ Validation Tests Failed:', error.message);
    process.exit(1);
  }
}

runValidationTests();
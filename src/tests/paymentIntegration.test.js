// Set environment to test mode to use mock responses
process.env.NODE_ENV = 'test';

import dotenv from 'dotenv';
import paymentService, { PaymentService } from '../services/paymentService.js';

dotenv.config();

console.log('\n🔄 BANK OF AMERICA PAYMENT GATEWAY INTEGRATION TESTS\n');

// Test data
const cardData = {
  cardNumber: '4111111111111111',
  expirationMonth: '12',
  expirationYear: '2025',
  cvv: '123'
};

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

// Test functions
async function testCreateCardContract() {
  console.log('🔄 Creating Card Contract...');
  try {
    const cardContractResponse = await paymentService.createCardContract(cardData, customerData);
    console.log('✅ Card Contract Created:', cardContractResponse.contractId);
    return cardContractResponse;
  } catch (error) {
    console.error('❌ Card Contract Creation Failed:', error.message);
    throw error;
  }
}

async function testCreateAchContract() {
  console.log('🔄 Creating ACH Contract...');
  try {
    const achContractResponse = await paymentService.createAchContract(achData, customerData);
    console.log('✅ ACH Contract Created:', achContractResponse.contractId);
    return achContractResponse;
  } catch (error) {
    console.error('❌ ACH Contract Creation Failed:', error.message);
    throw error;
  }
}

async function testGenerateHostedPaymentPage() {
  console.log('🔄 Generating Hosted Payment Page...');
  try {
    const paymentData = {
      amount: 99.99,
      currency: 'USD',
      description: 'Test Payment',
      customer: customerData
    };
    
    const hostedPageResponse = await paymentService.generateHostedPaymentPage(paymentData);
    console.log('✅ Hosted Payment Page Generated:', hostedPageResponse.url);
    return hostedPageResponse;
  } catch (error) {
    console.error('❌ Hosted Payment Page Generation Failed:', error.message);
    throw error;
  }
}

async function testProcessTransaction(contractId) {
  console.log('🔄 Processing Transaction...');
  try {
    const transactionData = {
      contractId,
      amount: 49.99,
      currency: 'USD',
      description: 'Test Transaction'
    };
    
    const transactionResponse = await paymentService.processTransaction(transactionData);
    console.log('✅ Transaction Processed:', transactionResponse.transactionId);
    return transactionResponse;
  } catch (error) {
    console.error('❌ Transaction Processing Failed:', error.message);
    throw error;
  }
}

async function testGetTransactionDetails(transactionId) {
  console.log('🔄 Getting Transaction Details...');
  try {
    const transactionDetails = await paymentService.getTransactionDetails(transactionId);
    console.log('✅ Transaction Details Retrieved:', transactionDetails.transactionId);
    return transactionDetails;
  } catch (error) {
    console.error('❌ Get Transaction Details Failed:', error.message);
    throw error;
  }
}

async function testRenderReceipt(transactionId) {
  console.log('🔄 Rendering Receipt...');
  try {
    const receipt = await paymentService.renderReceipt(transactionId);
    console.log('✅ Receipt Rendered');
    return receipt;
  } catch (error) {
    console.error('❌ Receipt Rendering Failed:', error.message);
    throw error;
  }
}

async function testGetTransactionReport() {
  console.log('🔄 Getting Transaction Report...');
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    const report = await paymentService.getTransactionReport(formattedStartDate, formattedEndDate);
    console.log('✅ Transaction Report Retrieved:', report.transactions?.length || 0, 'transactions');
    return report;
  } catch (error) {
    console.error('❌ Get Transaction Report Failed:', error.message);
    throw error;
  }
}

// Run tests
async function runTests() {
  try {
    // Create contracts
    const cardContractResponse = await testCreateCardContract();
    const achContractResponse = await testCreateAchContract();
    
    // Generate hosted payment page
    await testGenerateHostedPaymentPage();
    
    // Process transaction using card contract
    const transactionResponse = await testProcessTransaction(cardContractResponse.contractId);
    
    // Get transaction details
    await testGetTransactionDetails(transactionResponse.transactionId);
    
    // Render receipt
    await testRenderReceipt(transactionResponse.transactionId);
    
    // Get transaction report
    await testGetTransactionReport();
    
    console.log('\n✨ Payment Gateway Integration Tests Completed ✨\n');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

runTests();
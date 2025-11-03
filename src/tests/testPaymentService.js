import { PaymentService } from '../services/paymentService.js';
import dotenv from 'dotenv';

// Set environment to test to ensure mock responses
process.env.NODE_ENV = 'test';

// Load environment variables
dotenv.config();

// Create a new instance of PaymentService for testing
const paymentService = new PaymentService();

// Helper function to run tests
async function runTest(testName, testFunction) {
  try {
    console.log(`\n🧪 Running test: ${testName}`);
    await testFunction();
    console.log(`✅ Test passed: ${testName}`);
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${testName}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting PaymentService tests...');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Create Card Contract
  totalTests++;
  if (await runTest('Create Card Contract', async () => {
    const cardData = {
      number: '4111111111111111',
      expirationMonth: '12',
      expirationYear: '2025',
      cvv: '123'
    };
    
    const customerData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '1234567890'
    };
    
    const response = await paymentService.createCardContract(cardData, customerData);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.contractId) {
      throw new Error('Contract ID not found in response');
    }
  })) passedTests++;
  
  // Test 2: Create ACH Contract
  totalTests++;
  if (await runTest('Create ACH Contract', async () => {
    const achData = {
      accountNumber: '12345678',
      routingNumber: '123456789',
      accountType: 'checking',
      accountHolderName: 'John Doe'
    };
    
    const customerData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '1234567890'
    };
    
    const response = await paymentService.createAchContract(achData, customerData);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.contractId) {
      throw new Error('Contract ID not found in response');
    }
  })) passedTests++;
  
  // Test 3: Generate Hosted Payment Page
  totalTests++;
  if (await runTest('Generate Hosted Payment Page', async () => {
    const paymentData = {
      amount: 99.99,
      currency: 'USD',
      description: 'Test Payment',
      returnUrl: 'https://example.com/return',
      cancelUrl: 'https://example.com/cancel'
    };
    
    const response = await paymentService.generateHostedPaymentPage(paymentData);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.url) {
      throw new Error('Payment page URL not found in response');
    }
  })) passedTests++;
  
  // Test 4: Process Transaction
  totalTests++;
  if (await runTest('Process Transaction', async () => {
    const transactionData = {
      contractId: 'mock-card-contract-123',
      amount: 49.99,
      currency: 'USD',
      description: 'Test Transaction'
    };
    
    const response = await paymentService.processTransaction(transactionData);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.transactionId) {
      throw new Error('Transaction ID not found in response');
    }
  })) passedTests++;
  
  // Test 5: Get Transaction Details
  totalTests++;
  if (await runTest('Get Transaction Details', async () => {
    const response = await paymentService.getTransactionDetails('mock-transaction-789');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.transactionId) {
      throw new Error('Transaction details not found in response');
    }
  })) passedTests++;
  
  // Test 6: Render Receipt
  totalTests++;
  if (await runTest('Render Receipt', async () => {
    const response = await paymentService.renderReceipt('mock-transaction-789');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.html) {
      throw new Error('Receipt HTML not found in response');
    }
  })) passedTests++;
  
  // Test 7: Get Transaction Report
  totalTests++;
  if (await runTest('Get Transaction Report', async () => {
    const startDate = '2023-01-01';
    const endDate = '2023-12-31';
    
    const response = await paymentService.getTransactionReport(startDate, endDate);
    console.log('Response:', JSON.stringify(response, null, 2));
    
    if (!response.transactions || !Array.isArray(response.transactions)) {
      throw new Error('Transactions not found in response');
    }
  })) passedTests++;
  
  // Print test summary
  console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed`);
}

// Run all tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
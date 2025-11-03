import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Running Bank of America Payment Gateway Tests\n');

// Run integration tests
console.log('📋 Running Integration Tests...');
const integrationTest = spawn('node', [path.join(__dirname, 'paymentIntegration.test.js')], {
  stdio: 'inherit'
});

integrationTest.on('close', (code) => {
  if (code !== 0) {
    console.log(`\n❌ Integration tests exited with code ${code}`);
  }
  
  // Run validation tests
  console.log('\n📋 Running Validation Tests...');
  const validationTest = spawn('node', [path.join(__dirname, 'paymentValidation.js')], {
    stdio: 'inherit'
  });
  
  validationTest.on('close', (code) => {
    if (code !== 0) {
      console.log(`\n❌ Validation tests exited with code ${code}`);
    }
    
    console.log('\n✅ All tests completed');
  });
});
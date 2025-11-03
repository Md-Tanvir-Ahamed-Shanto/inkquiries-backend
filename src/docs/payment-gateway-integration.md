# Bank of America Payment Gateway Integration

## Overview
This document outlines the implementation and testing of the Bank of America Merchant Services payment gateway integration for Inkquiries Tattoo platform.

## Implementation Components

### 1. Payment Service (`src/services/paymentService.js`)
- Handles all direct communication with Bank of America APIs
- Implements authentication, signature generation, and API requests
- Provides methods for all required payment operations

### 2. Payment Controller (`src/controllers/paymentController.js`)
- Exposes payment functionality to the application
- Handles request validation and error handling
- Manages database operations related to payments

### 3. Payment Routes (`src/routes/paymentRoutes.js`)
- Defines API endpoints for payment operations
- Implements route protection and middleware

### 4. Database Schema (`prisma/schema.prisma`)
- Added models for `PaymentMethod` and `PaymentTransaction`
- Established relationships with `Artist` and `Client` models

## Testing Implementation

### Integration Tests (`src/tests/paymentIntegration.test.js`)
Tests the following operations:
- Environment variable configuration
- Card contract creation
- ACH contract creation
- Hosted Payment Page generation
- Transaction processing
- Transaction details retrieval
- Receipt rendering
- Transaction reporting

### Validation Tests (`src/tests/paymentValidation.js`)
Validates the integration against requirements:
- API response validation
- Response time measurement
- Error handling scenarios
- Data consistency verification

## Running Tests
Execute the following command to run all payment gateway tests:
```
node src/tests/runPaymentTests.js
```

## Environment Configuration
Required environment variables in `.env`:
- `BOA_MERCHANT_ID`: Bank of America merchant identifier
- `BOA_ACCESS_KEY`: API access key
- `BOA_SECRET_KEY`: API secret key
- `BOA_PROFILE_ID`: Merchant profile identifier

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/contracts/card` | POST | Create card payment contract |
| `/api/payments/contracts/ach` | POST | Create ACH payment contract |
| `/api/payments/hosted-page` | POST | Generate hosted payment page |
| `/api/payments/transactions` | POST | Process payment transaction |
| `/api/payments/transactions/:id` | GET | Get transaction details |
| `/api/payments/transactions/:id/receipt` | GET | Render transaction receipt |
| `/api/payments/reports` | GET | Get transaction reports |
| `/api/payments/methods` | GET | Get user payment methods |
| `/api/payments/methods/:id` | DELETE | Delete payment method |
| `/api/payments/methods/:id/default` | PUT | Set default payment method |
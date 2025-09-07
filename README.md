# Inkquiries Tattoo Review Platform API Documentation

## Base URL
```
https://api.inkquiries.com/v1
```

## Authentication
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## 1. Authentication & User Management

### 1.1 User Registration
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "client", // "client" or "artist"
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "JohnDoe",
    "location": {
      "city": "New York",
      "state": "NY",
      "country": "USA"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "role": "client",
      "profile": { ... }
    },
    "token": "jwt_token_here"
  }
}
```

### 1.2 User Login
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "role": "client",
      "profile": { ... }
    },
    "token": "jwt_token_here"
  }
}
```

### 1.3 Password Reset Request
**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### 1.4 Password Reset
**POST** `/auth/reset-password`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "newpassword123"
}
```

### 1.5 Get Current User
**GET** `/auth/me`

Get current authenticated user's information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "role": "client",
      "profile": { ... },
      "artistProfile": { ... } // if artist
    }
  }
}
```

### 1.6 Update User Profile
**PUT** `/auth/profile`

Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "profile": {
    "firstName": "Updated Name",
    "bio": "Updated bio",
    "location": {
      "city": "Los Angeles",
      "state": "CA"
    },
    "pronouns": "they/them"
  }
}
```

---

## 2. Artist Management

### 2.1 Search Artists
**GET** `/artists/search`

Search for artists by various criteria.

**Query Parameters:**
- `q` - Search query (name, social handle)
- `city` - Filter by city
- `state` - Filter by state
- `style` - Filter by tattoo style
- `minRating` - Minimum rating (1-10)
- `pronouns` - Filter by pronouns
- `promoted` - Show promoted artists first (true/false)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Example:**
```
GET /artists/search?q=john&city=New%20York&style=Traditional&minRating=8&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "artists": [
      {
        "_id": "artist_id",
        "profile": {
          "displayName": "John Tattoo Artist",
          "profilePhoto": "https://cloudinary.com/image.jpg",
          "location": {
            "city": "New York",
            "state": "NY"
          }
        },
        "artistProfile": {
          "specialties": ["Traditional", "Realism"],
          "averageRatings": {
            "overall": 8.5,
            "bedsideManner": 9.0,
            "artworkQuality": 8.7
          },
          "totalReviews": 45,
          "isPromoted": true
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalResults": 89,
      "hasNextPage": true
    }
  }
}
```

### 2.2 Get Artist Profile
**GET** `/artists/:artistId`

Get detailed artist profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "artist": {
      "_id": "artist_id",
      "profile": {
        "displayName": "John Tattoo Artist",
        "bio": "Professional tattoo artist...",
        "profilePhoto": "https://cloudinary.com/image.jpg",
        "location": { ... },
        "socialLinks": {
          "instagram": "@johntattoo",
          "website": "https://johntattoo.com"
        }
      },
      "artistProfile": {
        "specialties": ["Traditional", "Realism"],
        "portfolioImages": [
          {
            "imageUrl": "https://cloudinary.com/portfolio1.jpg",
            "caption": "Traditional rose tattoo",
            "uploadDate": "2025-06-01T10:00:00Z",
            "likes": 25
          }
        ],
        "averageRatings": { ... },
        "totalReviews": 45,
        "qrCode": "https://cloudinary.com/qr_code.png"
      }
    }
  }
}
```

### 2.3 Update Artist Profile
**PUT** `/artists/profile`

Update artist profile information (artist only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "profile": {
    "bio": "Updated bio",
    "specialties": ["Traditional", "Watercolor"],
    "socialLinks": {
      "instagram": "@updated_handle"
    }
  }
}
```

### 2.4 Add Portfolio Image
**POST** `/artists/portfolio`

Add image to artist portfolio.

**Headers:** `Authorization: Bearer <token>`

**Request Body (multipart/form-data):**
```
image: [file]
caption: "Beautiful rose tattoo"
```

### 2.5 Delete Portfolio Image
**DELETE** `/artists/portfolio/:imageId`

Remove image from portfolio.

**Headers:** `Authorization: Bearer <token>`

### 2.6 Get Artist QR Code
**GET** `/artists/qr-code`

Generate and retrieve QR code for artist profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://cloudinary.com/qr_code.png",
    "profileUrl": "https://inkquiries.com/artist/artist_id"
  }
}
```

---

## 3. Review System

### 3.1 Create Review
**POST** `/reviews`

Submit a new review for an artist.

**Headers:** `Authorization: Bearer <token>`

**Request Body (multipart/form-data):**
```
artistId: "artist_id"
ratings[bedsideManner]: 9
ratings[accommodation]: 8
ratings[pricing]: 7
ratings[heavyHandedness]: 6
ratings[artworkQuality]: 9
ratings[tattooQuality]: 8
ratings[overallExperience]: 9
reviewText: "Great experience with this artist..."
tattooDate: "2025-06-01"
isAnonymous: false
freshPhoto: [file] // Required
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "_id": "review_id",
      "artistId": "artist_id",
      "ratings": { ... },
      "reviewText": "Great experience...",
      "tattooPhotos": {
        "fresh": {
          "imageUrl": "https://cloudinary.com/fresh_tattoo.jpg",
          "uploadDate": "2025-06-14T10:00:00Z"
        }
      },
      "createdAt": "2025-06-14T10:00:00Z"
    }
  }
}
```

### 3.2 Get Artist Reviews
**GET** `/reviews/artist/:artistId`

Get all reviews for a specific artist.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)
- `sort` - Sort by: "newest", "oldest", "highest_rated", "lowest_rated"

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "clientId": "client_id", // null if anonymous
        "ratings": { ... },
        "reviewText": "Great experience...",
        "tattooPhotos": { ... },
        "likes": 12,
        "helpfulVotes": 8,
        "createdAt": "2025-06-14T10:00:00Z",
        "client": {
          "profile": {
            "displayName": "John D." // masked if anonymous
          }
        }
      }
    ],
    "pagination": { ... }
  }
}
```

### 3.3 Get User Reviews
**GET** `/reviews/my-reviews`

Get current user's submitted reviews.

**Headers:** `Authorization: Bearer <token>`

### 3.4 Update Review
**PUT** `/reviews/:reviewId`

Update an existing review (client only, within 24 hours).

**Headers:** `Authorization: Bearer <token>`

### 3.5 Upload Healed Photo
**POST** `/reviews/:reviewId/healed-photo`

Upload healed tattoo photo for existing review.

**Headers:** `Authorization: Bearer <token>`

**Request Body (multipart/form-data):**
```
healedPhoto: [file]
healingStage: "1_month" // "1_month", "6_months", "1_year"
```

### 3.6 Like Review
**POST** `/reviews/:reviewId/like`

Like or unlike a review.

**Headers:** `Authorization: Bearer <token>`

### 3.7 Mark Review Helpful
**POST** `/reviews/:reviewId/helpful`

Mark review as helpful or unhelpful.

**Headers:** `Authorization: Bearer <token>`

---

## 4. Explore & Discovery

### 4.1 Explore Feed
**GET** `/explore`

Get explore page content with trending tattoos and artists.

**Query Parameters:**
- `type` - "tattoos" or "artists" (default: "tattoos")
- `filter` - "trending", "recent", "top_rated", "promoted"
- `style` - Filter by tattoo style
- `location` - Filter by location
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "_id": "review_id",
        "tattooPhotos": {
          "fresh": {
            "imageUrl": "https://cloudinary.com/tattoo1.jpg"
          }
        },
        "artist": {
          "_id": "artist_id",
          "profile": {
            "displayName": "Artist Name"
          }
        },
        "likes": 45,
        "createdAt": "2025-06-14T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 4.2 Get Tattoo Styles
**GET** `/tattoo-styles`

Get list of available tattoo styles for filtering.

**Response:**
```json
{
  "success": true,
  "data": {
    "styles": [
      {
        "_id": "style_id",
        "name": "Traditional",
        "description": "Classic American traditional style"
      },
      {
        "_id": "style_id",
        "name": "Realism",
        "description": "Photorealistic tattoo style"
      }
    ]
  }
}
```

---

## 5. Notifications

### 5.1 Get Notifications
**GET** `/notifications`

Get user notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `unread` - Show only unread notifications (true/false)
- `page` - Page number
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notification_id",
        "type": "photo_reminder",
        "title": "Time to upload healed photo",
        "message": "It's been 1 month since your tattoo. Upload a healed photo!",
        "isRead": false,
        "createdAt": "2025-06-14T10:00:00Z",
        "relatedReviewId": "review_id"
      }
    ],
    "unreadCount": 3
  }
}
```

### 5.2 Mark Notification as Read
**PUT** `/notifications/:notificationId/read`

Mark a notification as read.

**Headers:** `Authorization: Bearer <token>`

### 5.3 Mark All Notifications as Read
**PUT** `/notifications/read-all`

Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

---

## 6. Reporting & Moderation

### 6.1 Report Review
**POST** `/reports`

Report inappropriate content or behavior.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reportedReviewId": "review_id",
  "reportType": "inappropriate_content",
  "description": "This review contains inappropriate language..."
}
```

### 6.2 Get My Reports
**GET** `/reports/my-reports`

Get reports submitted by current user.

**Headers:** `Authorization: Bearer <token>`

---

## 7. Promotions

### 7.1 Create Promotion Request
**POST** `/promotions`

Request paid promotion for artist profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "duration": 14, // 7, 14, or 30 days
  "paymentMethod": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "promotion": {
      "_id": "promotion_id",
      "duration": 14,
      "paymentAmount": 49.99,
      "status": "pending"
    },
    "paymentUrl": "https://checkout.stripe.com/session_id"
  }
}
```

### 7.2 Get Promotion Status
**GET** `/promotions/status`

Get current promotion status for artist.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "currentPromotion": {
      "_id": "promotion_id",
      "status": "active",
      "startDate": "2025-06-01T00:00:00Z",
      "endDate": "2025-06-15T00:00:00Z",
      "impressions": 1250,
      "clicks": 89
    }
  }
}
```

### 7.3 Cancel Promotion
**DELETE** `/promotions/:promotionId`

Cancel active promotion.

**Headers:** `Authorization: Bearer <token>`

---

## 8. Admin Panel APIs

### 8.1 Admin Dashboard Stats
**GET** `/admin/dashboard`

Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 1250,
      "totalArtists": 340,
      "totalReviews": 2890,
      "pendingReports": 12,
      "activePromotions": 25,
      "newUsersToday": 15,
      "newReviewsToday": 45
    }
  }
}
```

### 8.2 Get Reported Content
**GET** `/admin/reports`

Get all reported content for moderation.

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `status` - Filter by status: "pending", "under_review", "resolved"
- `page` - Page number
- `limit` - Results per page

### 8.3 Handle Report
**PUT** `/admin/reports/:reportId`

Take action on a reported item.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "status": "resolved",
  "actionTaken": "content_removed",
  "adminNotes": "Inappropriate content removed and user warned"
}
```

### 8.4 Manage Users
**GET** `/admin/users`

Get list of users for management.

**Headers:** `Authorization: Bearer <admin-token>`

### 8.5 Block/Unblock User
**PUT** `/admin/users/:userId/status`

Block or unblock a user account.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Repeated policy violations"
}
```

### 8.6 Verify Artist
**PUT** `/admin/artists/:artistId/verify`

Verify an artist account.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "isVerified": true,
  "verificationNotes": "ID verified and social media confirmed"
}
```

### 8.7 Approve Promotion
**PUT** `/admin/promotions/:promotionId/approve`

Approve or reject promotion request.

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:**
```json
{
  "approved": true,
  "adminNotes": "Promotion approved for quality artist"
}
```

### 8.8 Site Analytics
**GET** `/admin/analytics`

Get detailed site analytics.

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `metric` - Specific metric to retrieve

---

## 9. Search & Discovery

### 9.1 QR Code Lookup
**GET** `/qr/:qrCode`

Look up artist by QR code.

**Response:**
```json
{
  "success": true,
  "data": {
    "artist": {
      "_id": "artist_id",
      "profile": {
        "displayName": "Artist Name"
      },
      "artistProfile": { ... }
    }
  }
}
```

### 9.2 Autocomplete Search
**GET** `/search/autocomplete`

Get search suggestions for autocomplete.

**Query Parameters:**
- `q` - Search query
- `type` - "artists" or "styles"

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "artist",
        "name": "John Tattoo Artist",
        "id": "artist_id"
      },
      {
        "type": "style",
        "name": "Traditional"
      }
    ]
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {
      "field": "validation error details"
    }
  }
}
```

## Rate Limiting

- **General API calls:** 100 requests per minute per IP
- **Authentication endpoints:** 5 requests per minute per IP
- **File uploads:** 10 requests per minute per user
- **Search endpoints:** 50 requests per minute per IP

## File Upload Specifications

### Image Requirements:
- **Formats:** JPEG, PNG, WebP
- **Max size:** 10MB per file
- **Dimensions:** Minimum 500x500px, Maximum 4000x4000px
- **Quality:** Automatic optimization via Cloudinary

### Upload Process:
1. Files are uploaded to Cloudinary
2. Multiple sizes are generated automatically
3. URLs are stored in database
4. Original files are deleted after processing

---

## Webhooks

### Payment Webhooks (Stripe/PayPal)
**POST** `/webhooks/payments`

Handles payment status updates for promotions.

### Reminder System
**POST** `/webhooks/reminders`

Handles scheduled photo upload reminders.

---

## API Testing

### Postman Collection
Download the complete Postman collection: [Inkquiries API Collection](https://api.inkquiries.com/postman-collection)

### Test Environment
- **Base URL:** `https://api-staging.inkquiries.com/v1`
- **Test Artist Account:** `test-artist@inkquiries.com`
- **Test Client Account:** `test-client@inkquiries.com`

---

## Changelog

### v1.0.0 (2025-06-14)
- Initial API release
- All core functionality implemented
- Authentication and user management
- Review system with photo uploads
- Artist profiles and search
- Admin panel APIs
- Promotion system
- Notification system#   i n k q u i r i e s - b a c k e n d  
 
// Test script to verify JWT token and generate a new token
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Setup ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// The token we're testing
const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFydGlzdCIsImlhdCI6MTYxNjE1MTUxNX0.Gj0Lm3HsIQNXlx9uHZ-9MmJJSPzP0NUuQGGIF9jbFIU';

// Get the JWT_SECRET from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

console.log('Using JWT_SECRET:', JWT_SECRET);

try {
  // Verify the old token
  const decoded = jwt.verify(oldToken, JWT_SECRET);
  console.log('Old token is valid!');
  console.log('Decoded token:', decoded);
} catch (error) {
  console.error('Old token verification failed:', error.message);
  
  // Generate a new token with the same payload but current JWT_SECRET
  try {
    // Decode without verification to get the payload
    const payload = jwt.decode(oldToken);
    console.log('Old token payload:', payload);
    
    // Create a new token with the same payload
    const artistToken = jwt.sign(
      { id: payload?.id || 1, role: 'artist' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('\nNew artist token generated:');
    console.log(artistToken);
    
    // Create an admin token
    const adminToken = jwt.sign(
      { id: 1, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('\nNew admin token generated:');
    console.log(adminToken);
    
    // Verify the artist token
    const artistDecoded = jwt.verify(artistToken, JWT_SECRET);
    console.log('\nArtist token is valid!');
    console.log('Artist decoded token:', artistDecoded);
    
    // Verify the admin token
    const adminDecoded = jwt.verify(adminToken, JWT_SECRET);
    console.log('\nAdmin token is valid!');
    console.log('Admin decoded token:', adminDecoded);
  } catch (genError) {
    console.error('Error generating new token:', genError.message);
  }
}
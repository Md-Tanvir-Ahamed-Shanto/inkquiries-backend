import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as InstagramStrategy } from 'passport-instagram'; // Note: Instagram API has changed significantly. This strategy might require specific setups or older API versions.
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

dotenv.config();

// Function to generate JWT for social login
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your_jwt_secret', {
    expiresIn: '1d',
  });
};

// Function to generate a random password for new social login users
const generateRandomPassword = async () => {
  const randomPassword = Math.random().toString(36).slice(-8);
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(randomPassword, salt);
};

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      passReqToCallback: true, // Pass request to callback
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user;
        // Get role from session if available, otherwise default to client
        let role = req.session?.socialLoginRole || 'client';
        
        // Check if this social account already exists
        const socialAccount = await prisma.socialAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'facebook',
              providerAccountId: profile.id,
            },
          },
        });

        if (socialAccount) {
          // If social account exists, find the linked user (either client or artist)
          if (socialAccount.clientId) {
            user = await prisma.client.findUnique({ where: { id: socialAccount.clientId } });
            role = 'client';
          } else if (socialAccount.artistId) {
            user = await prisma.artist.findUnique({ where: { id: socialAccount.artistId } });
            role = 'artist';
          }
        } else {
          // If no social account, check if user exists by email
          const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          
          if (email) {
            // Check if email exists in client or artist table
            const client = await prisma.client.findUnique({ where: { email } });
            const artist = await prisma.artist.findUnique({ where: { email } });
            
            if (client) {
              user = client;
              role = 'client';
              
              // Link this social account to the existing client
              await prisma.socialAccount.create({
                data: {
                  provider: 'facebook',
                  providerAccountId: profile.id,
                  clientId: client.id,
                  accessToken,
                  refreshToken,
                  tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                  profileData: profile._json
                },
              });
            } else if (artist) {
              user = artist;
              role = 'artist';
              
              // Link this social account to the existing artist
              await prisma.socialAccount.create({
                data: {
                  provider: 'facebook',
                  providerAccountId: profile.id,
                  artistId: artist.id,
                  accessToken,
                  refreshToken,
                  tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                  profileData: profile._json
                },
              });
            }
          }

          // If no existing user found, create a new user based on role
          if (!user) {
            const hashedPassword = await generateRandomPassword();
            const username = profile.displayName.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
            
            // Create a new user based on role
            if (role === 'artist') {
              user = await prisma.artist.create({
                data: {
                  email: email || `facebook_${profile.id}@example.com`, // Fallback email if not provided
                  name: profile.displayName,
                  username: username,
                  password: hashedPassword,
                  profilePhoto: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                  socialLogin: {
                    provider: 'facebook',
                    id: profile.id,
                    displayName: profile.displayName
                  },
                  role: 'artist', // Explicitly set role
                  isActive: true
                },
              });
            } else {
              // Default to client
              user = await prisma.client.create({
                data: {
                  email: email || `facebook_${profile.id}@example.com`, // Fallback email if not provided
                  name: profile.displayName,
                  username: username,
                  password: hashedPassword,
                  profilePhoto: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                  socialLogin: {
                    provider: 'facebook',
                    id: profile.id,
                    displayName: profile.displayName
                  },
                  role: 'client', // Explicitly set role
                  isActive: true
                },
              });
            }
            
            // Create the social account link based on role
            await prisma.socialAccount.create({
              data: {
                provider: 'facebook',
                providerAccountId: profile.id,
                ...(role === 'artist' ? { artistId: user.id } : { clientId: user.id }),
                accessToken,
                refreshToken,
                tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                profileData: profile._json
              },
            });
          }
        }
        
        // Attach JWT and role to user object for transport
        const token = generateToken(user.id, role);
        user.token = token;
        user.role = role;
        
        return done(null, user);
      } catch (error) {
        console.error('Error during Facebook authentication:', error);
        return done(error, false);
      }
    }
  )
);

passport.use(
  new InstagramStrategy(
    {
      clientID: process.env.INSTAGRAM_APP_ID,
      clientSecret: process.env.INSTAGRAM_APP_SECRET,
      callbackURL: process.env.INSTAGRAM_CALLBACK_URL,
      passReqToCallback: true, // Pass request to callback
      // You might need to specify scope depending on Instagram API version and permissions
      // scope: ['user_profile', 'user_media'], // For Instagram Basic Display API
    },
    async (req, accessToken, refreshToken, profile, done) => {
      // Instagram's API is very strict. User emails are not typically provided directly.
      try {
        let user;
        // Get role from session if available, otherwise default to client
        let role = req.session?.socialLoginRole || 'client';
        
        // Check if this social account already exists
        const socialAccount = await prisma.socialAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'instagram',
              providerAccountId: profile.id,
            },
          },
        });

        if (socialAccount) {
          // If social account exists, find the linked user (either client or artist)
          if (socialAccount.clientId) {
            user = await prisma.client.findUnique({ where: { id: socialAccount.clientId } });
            role = 'client';
          } else if (socialAccount.artistId) {
            user = await prisma.artist.findUnique({ where: { id: socialAccount.artistId } });
            role = 'artist';
          }
        } else {
          // With Instagram, we might not get an email, so we'll create a new client
          const hashedPassword = await generateRandomPassword();
          const username = (profile.displayName || `InstagramUser_${profile.id}`).toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
          
          // Create a new user based on role
          if (role === 'artist') {
            user = await prisma.artist.create({
              data: {
                email: `instagram_${profile.id}@example.com`, // Placeholder email
                name: profile.displayName || `InstagramUser_${profile.id}`,
                username: username,
                password: hashedPassword,
                profilePhoto: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                role: 'artist', // Explicitly set role
                socialLogin: {
                  provider: 'instagram',
                  id: profile.id,
                  displayName: profile.displayName || `InstagramUser_${profile.id}`
                },
                isActive: true
              },
            });
          } else {
            // Default to client
            user = await prisma.client.create({
              data: {
                email: `instagram_${profile.id}@example.com`, // Placeholder email
                name: profile.displayName || `InstagramUser_${profile.id}`,
                username: username,
                password: hashedPassword,
                profilePhoto: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
                role: 'client', // Explicitly set role
                socialLogin: {
                  provider: 'instagram',
                  id: profile.id,
                  displayName: profile.displayName || `InstagramUser_${profile.id}`
                },
                isActive: true
              },
            });
          }
          
          // Create the social account link based on role
            await prisma.socialAccount.create({
              data: {
                provider: 'instagram',
                providerAccountId: profile.id,
                ...(role === 'artist' ? { artistId: user.id } : { clientId: user.id }),
                accessToken,
                refreshToken,
                tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                profileData: profile._json
              },
            });
        }
        
        // Attach JWT and role to user object for transport
        const token = generateToken(user.id, role);
        user.token = token;
        user.role = role;
        
        return done(null, user);
      } catch (error) {
        console.error('Error during Instagram authentication:', error);
        return done(error, false);
      }
    }
  )
);

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
  // Store both user ID and role for proper deserialization
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser(async (serialized, done) => {
  try {
    const { id, role } = serialized;
    let user;
    
    // Find the user based on their role
    if (role === 'client') {
      user = await prisma.client.findUnique({ where: { id } });
    } else if (role === 'artist') {
      user = await prisma.artist.findUnique({ where: { id } });
    } else if (role === 'admin') {
      user = await prisma.admin.findUnique({ where: { id } });
    }
    
    if (!user) {
      return done(new Error('User not found'), null);
    }
    
    user.role = role; // Attach role for convenience
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

const prisma = new PrismaClient();
dotenv.config();

/**
 * Modern OAuth Service for Facebook and Instagram
 * Replaces deprecated Passport.js strategies with direct OAuth 2.0 implementation
 */
class OAuthService {
  constructor() {
    this.facebookAppId = process.env.FACEBOOK_APP_ID;
    this.facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    this.facebookCallbackUrl = process.env.FACEBOOK_CALLBACK_URL;
    this.instagramAppId = process.env.INSTAGRAM_APP_ID;
    this.instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;
    this.instagramCallbackUrl = process.env.INSTAGRAM_CALLBACK_URL;
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(id, role) {
    return jwt.sign({ id, role }, this.jwtSecret, {
      expiresIn: '1d',
    });
  }

  /**
   * Generate random password for social login users
   */
  async generateRandomPassword() {
    const randomPassword = Math.random().toString(36).slice(-8);
    const salt = await bcryptjs.genSalt(10);
    return bcryptjs.hash(randomPassword, salt);
  }

  /**
   * Get Facebook OAuth URL for authentication with Instagram access
   * @param {string} role - User role (client/artist)
   * @param {boolean} includeInstagram - Whether to request Instagram permissions
   */
  getFacebookAuthUrl(role = 'client', includeInstagram = true) {
    const stateData = { role, provider: 'facebook', includeInstagram, timestamp: Date.now() };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Facebook permissions with Instagram access
    let scope = 'email,public_profile';
    if (includeInstagram) {
      // Add Instagram permissions for accessing Instagram accounts through Facebook
      scope += ',pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights';
    }
    
    // Create a signed state to prevent CSRF attacks
    const stateSecret = process.env.OAUTH_STATE_SECRET || 'fallback-secret';
    const signedState = crypto.createHmac('sha256', stateSecret).update(state).digest('hex');
    const finalState = `${state}.${signedState}`;
    
    const params = new URLSearchParams({
      client_id: this.facebookAppId,
      redirect_uri: this.facebookCallbackUrl,
      scope: scope,
      response_type: 'code',
      state: finalState,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Validate and parse state parameter
   */
  validateState(stateParam) {
    try {
      const [state, signature] = stateParam.split('.');
      if (!state || !signature) {
        throw new Error('Invalid state format');
      }

      const stateSecret = process.env.OAUTH_STATE_SECRET || 'fallback-secret';
      const expectedSignature = crypto.createHmac('sha256', stateSecret).update(state).digest('hex');
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid state signature');
      }

      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }

      return stateData;
    } catch (error) {
      throw new Error(`State validation failed: ${error.message}`);
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: this.facebookAppId,
          client_secret: this.facebookAppSecret,
          redirect_uri: this.facebookCallbackUrl,
          code: code,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  /**
   * Get user profile from Facebook
   */
  async getFacebookProfile(accessToken) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          fields: 'id,name,email,picture.type(large)',
          access_token: accessToken,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Facebook profile:', error.response?.data || error.message);
      throw new Error('Failed to fetch user profile from Facebook');
    }
  }

  /**
   * Get Instagram accounts linked to Facebook account
   */
  async getInstagramAccounts(accessToken) {
    try {
      // First, get Facebook pages that the user manages
      const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: {
          access_token: accessToken,
        },
      });

      const instagramAccounts = [];

      // For each page, check if it has an Instagram business account
      for (const page of pagesResponse.data.data) {
        try {
          const instagramResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
            params: {
              fields: 'instagram_business_account',
              access_token: page.access_token,
            },
          });

          if (instagramResponse.data.instagram_business_account) {
            // Get Instagram account details using the new Instagram Graph API
            const instagramDetailsResponse = await axios.get(
              `https://graph.facebook.com/v18.0/${instagramResponse.data.instagram_business_account.id}`,
              {
                params: {
                  fields: 'id,username,profile_picture_url,account_type',
                  access_token: page.access_token,
                },
              }
            );

            instagramAccounts.push({
              ...instagramDetailsResponse.data,
              page_access_token: page.access_token,
              page_id: page.id,
            });
          }
        } catch (error) {
          // Continue if this page doesn't have Instagram or we can't access it
          console.log(`No Instagram account found for page ${page.id}:`, error.response?.data?.error?.message || error.message);
        }
      }

      return instagramAccounts;
    } catch (error) {
      console.error('Error fetching Instagram accounts:', error.response?.data || error.message);
      return []; // Return empty array if no Instagram accounts found
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code, stateData) {
    try {
      // Use validated state data directly
      const { role = 'client', includeInstagram = false } = stateData;

      // Exchange code for access token
      const tokenData = await this.exchangeCodeForToken(code);
      const { access_token: accessToken } = tokenData;

      // Get Facebook profile
      const facebookProfile = await this.getFacebookProfile(accessToken);

      // Get Instagram accounts if requested
      let instagramAccounts = [];
      if (includeInstagram) {
        instagramAccounts = await this.getInstagramAccounts(accessToken);
      }

      // Find or create user
      const user = await this.findOrCreateUser(facebookProfile, role, accessToken, instagramAccounts);

      // Generate JWT token
      const token = this.generateToken(user.id, role);

      return {
        user: { ...user, role },
        token,
        instagramAccounts,
      };
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Find existing user or create new one
   */
  async findOrCreateUser(facebookProfile, role, accessToken, instagramAccounts = []) {
    try {
      let user;
      const { id: facebookId, email, name, picture } = facebookProfile;

      // Check if social account already exists
      const socialAccount = await prisma.socialAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'facebook',
            providerAccountId: facebookId,
          },
        },
      });

      if (socialAccount) {
        // Find linked user
        if (socialAccount.clientId) {
          user = await prisma.client.findUnique({ where: { id: socialAccount.clientId } });
          role = 'client';
        } else if (socialAccount.artistId) {
          user = await prisma.artist.findUnique({ where: { id: socialAccount.artistId } });
          role = 'artist';
        }

        // Update access token
        await prisma.socialAccount.update({
          where: { id: socialAccount.id },
          data: {
            accessToken,
            tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            profileData: {
              ...facebookProfile,
              instagramAccounts,
            },
          },
        });
      } else {
        // Check if user exists by email
        if (email) {
          const client = await prisma.client.findUnique({ where: { email } });
          const artist = await prisma.artist.findUnique({ where: { email } });

          if (client) {
            user = client;
            role = 'client';
          } else if (artist) {
            user = artist;
            role = 'artist';
          }
        }

        // Create new user if none exists
        if (!user) {
          const hashedPassword = await this.generateRandomPassword();
          const username = name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);

          const userData = {
            email: email || `facebook_${facebookId}@example.com`,
            name: name,
            username: username,
            password: hashedPassword,
            profilePhoto: picture?.data?.url || null,
            socialLogin: {
              provider: 'facebook',
              id: facebookId,
              displayName: name,
              instagramAccounts,
            },
            role: role,
            isActive: true,
          };

          if (role === 'artist') {
            user = await prisma.artist.create({ data: userData });
          } else {
            user = await prisma.client.create({ data: userData });
          }
        }

        // Create social account link
        await prisma.socialAccount.create({
          data: {
            provider: 'facebook',
            providerAccountId: facebookId,
            ...(role === 'artist' ? { artistId: user.id } : { clientId: user.id }),
            accessToken,
            tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            profileData: {
              ...facebookProfile,
              instagramAccounts,
            },
          },
        });
      }

      return user;
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw error;
    }
  }

  /**
   * Get Instagram media for a user (if they have Instagram connected)
   */
  async getInstagramMedia(userId, userRole) {
    try {
      const socialAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'facebook',
          ...(userRole === 'artist' ? { artistId: userId } : { clientId: userId }),
        },
      });

      if (!socialAccount || !socialAccount.profileData?.instagramAccounts?.length) {
        return { error: 'No Instagram account connected' };
      }

      const instagramAccount = socialAccount.profileData.instagramAccounts[0];
      
      // Use the Instagram Graph API to fetch media
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${instagramAccount.id}/media`,
        {
          params: {
            fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink',
            access_token: instagramAccount.page_access_token,
            limit: 25, // Limit to recent 25 posts
          },
        }
      );

      return {
        success: true,
        data: response.data.data || [],
        account: {
          id: instagramAccount.id,
          username: instagramAccount.username,
          profile_picture_url: instagramAccount.profile_picture_url,
          account_type: instagramAccount.account_type,
        },
      };
    } catch (error) {
      console.error('Error fetching Instagram media:', error.response?.data || error);
      return { 
        error: error.response?.data?.error?.message || 'Failed to fetch Instagram media',
        details: error.response?.data || error.message 
      };
    }
  }

  /**
   * Get Instagram OAuth URL for authentication using Instagram Business Login
   * @param {string} role - User role (client/artist)
   */
  getInstagramAuthUrl(role = 'client') {
    const stateData = { role, provider: 'instagram', timestamp: Date.now() };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Create a signed state to prevent CSRF attacks
    const stateSecret = process.env.OAUTH_STATE_SECRET || 'fallback-secret';
    const signedState = crypto.createHmac('sha256', stateSecret).update(state).digest('hex');
    const finalState = `${state}.${signedState}`;
    
    // Instagram Business Login scopes
    const scope = 'instagram_business_basic';
    
    const params = new URLSearchParams({
      client_id: this.instagramAppId,
      redirect_uri: this.instagramCallbackUrl,
      scope: scope,
      response_type: 'code',
      state: finalState,
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle Instagram OAuth callback
   */
  async handleInstagramCallback(code, stateData) {
    try {
      // Exchange code for access token
      const tokenResponse = await this.exchangeInstagramCodeForToken(code);
      const { access_token, user_id } = tokenResponse;

      // Get Instagram user profile
      const profile = await this.getInstagramProfile(access_token, user_id);

      // Find or create user
      const { user, isNewUser } = await this.findOrCreateUser(profile, stateData.role, 'instagram');

      // Store or update social account
      await this.storeSocialAccount(user.id, stateData.role, 'instagram', {
        accessToken: access_token,
        userId: user_id,
        profile: profile,
      });

      // Generate JWT token
      const token = this.generateToken(user.id, stateData.role);

      return { user, token, isNewUser };
    } catch (error) {
      console.error('Instagram callback error:', error);
      throw new Error(`Instagram authentication failed: ${error.message}`);
    }
  }

  /**
   * Exchange Instagram authorization code for access token
   */
  async exchangeInstagramCodeForToken(code) {
    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: this.instagramAppId,
        client_secret: this.instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.instagramCallbackUrl,
        code: code,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging Instagram code for token:', error.response?.data || error);
      throw new Error('Failed to exchange Instagram authorization code');
    }
  }

  /**
   * Get Instagram user profile
   */
  async getInstagramProfile(accessToken, userId) {
    try {
      const response = await axios.get(`https://graph.instagram.com/v18.0/${userId}`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Instagram profile:', error.response?.data || error);
      throw new Error('Failed to fetch Instagram profile');
    }
  }

  /**
   * Get Instagram media using Instagram Graph API
   */
  async getInstagramMediaDirect(userId, userRole) {
    try {
      const socialAccount = await prisma.socialAccount.findFirst({
        where: {
          provider: 'instagram',
          ...(userRole === 'artist' ? { artistId: userId } : { clientId: userId }),
        },
      });

      if (!socialAccount) {
        return { error: 'No Instagram account connected' };
      }

      const { accessToken, userId: instagramUserId } = socialAccount.profileData;
      
      // Get Instagram media using Instagram Graph API
      const response = await axios.get(
        `https://graph.instagram.com/v18.0/${instagramUserId}/media`,
        {
          params: {
            fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink',
            access_token: accessToken,
            limit: 25,
          },
        }
      );

      return {
        success: true,
        data: response.data.data || [],
        account: socialAccount.profileData.profile,
      };
    } catch (error) {
      console.error('Error fetching Instagram media directly:', error.response?.data || error);
      return { 
        error: error.response?.data?.error?.message || 'Failed to fetch Instagram media',
        details: error.response?.data || error.message 
      };
    }
  }
}

export default new OAuthService();
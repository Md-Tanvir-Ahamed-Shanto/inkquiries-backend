import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * @desc Get social links
 * @route GET /api/admin/social-links
 * @access Private (Admin)
 */
export const getSocialLinks = async (req, res) => {
  try {
    // Get the first social link record (assuming there's only one record for the site)
    const socialLinks = await prisma.socialLink.findFirst();
    
    // If no social links exist yet, return an empty object
    if (!socialLinks) {
      return res.status(200).json({});
    }
    
    res.status(200).json(socialLinks);
  } catch (error) {
    console.error('Error fetching social links:', error);
    res.status(500).json({ error: 'Could not retrieve social links.' });
  }
};

/**
 * @desc Create or update social links
 * @route POST /api/admin/social-links
 * @access Private (Admin)
 */
export const updateSocialLinks = async (req, res) => {
  try {
    const { logo, facebook, twitter, instagram, linkedin, youtube } = req.body;
    
    // Find existing social links
    const existingSocialLinks = await prisma.socialLink.findFirst();
    
    let socialLinks;
    
    if (existingSocialLinks) {
      // Update existing record
      socialLinks = await prisma.socialLink.update({
        where: { id: existingSocialLinks.id },
        data: {
          logo,
          facebook,
          twitter,
          instagram,
          linkedin,
          youtube
        }
      });
    } else {
      // Create new record if none exists
      socialLinks = await prisma.socialLink.create({
        data: {
          logo,
          facebook,
          twitter,
          instagram,
          linkedin,
          youtube
        }
      });
    }
    
    // Log the admin action if admin middleware is used
    if (req.user && req.user.id) {
      await prisma.adminLog.create({
        data: {
          adminId: req.user.id,
          action: existingSocialLinks ? 'UPDATE_SOCIAL_LINKS' : 'CREATE_SOCIAL_LINKS',
          targetType: 'SOCIAL_LINKS',
          targetId: socialLinks.id,
          details: { updatedFields: Object.keys(req.body) }
        }
      });
    }
    
    res.status(200).json({
      message: existingSocialLinks ? 'Social links updated successfully.' : 'Social links created successfully.',
      socialLinks
    });
  } catch (error) {
    console.error('Error updating social links:', error);
    res.status(500).json({ error: 'Could not update social links.' });
  }
};
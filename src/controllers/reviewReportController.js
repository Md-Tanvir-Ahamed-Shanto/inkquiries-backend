import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createReviewReport = async (req, res) => {
  const { reviewId, reason } = req.body;
  const reporterId = req.artist;

  if (!reviewId || !reason) {
    return res.status(400).json({ error: 'Review ID and a reason are required to file a report.' });
  }

  try {
    const newReport = await prisma.reviewReport.create({
      data: {
        reviewId,
        reason,
        reporterId,
      },
    });
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error creating review report:', error);
    res.status(500).json({ error: 'Could not create review report.' });
  }
};

export const getReviewReports = async (req, res) => {
  try {
    const reports = await prisma.reviewReport.findMany({
      include: {
        review: true,
        reporter: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching review reports:', error);
    res.status(500).json({ error: 'Could not retrieve review reports.' });
  }
};
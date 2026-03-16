import { Request, Response } from 'express';
import { PrismaClient, BountyStatus, ApplicationStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { stellarService } from '../services/stellar.service';

const prisma = new PrismaClient();

export class BountyController {
  async createBounty(req: AuthRequest, res: Response) {
    try {
      const { title, description, category, difficulty, reward, tokenReward, tags, requirements, deadline } = req.body;
      const creatorId = req.user!.id;

      const bounty = await prisma.bounty.create({
        data: {
          title,
          description,
          category,
          difficulty,
          reward,
          tokenReward,
          tags,
          requirements,
          deadline: deadline ? new Date(deadline) : null,
          creatorId,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
            }
          }
        }
      });

      res.status(201).json(bounty);
    } catch (error) {
      console.error('Error creating bounty:', error);
      res.status(500).json({ error: 'Failed to create bounty' });
    }
  }

  async getBounties(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        difficulty, 
        status = BountyStatus.OPEN,
        search 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        status: status as BountyStatus,
      };

      if (category) {
        where.category = category;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } }
        ];
      }

      const [bounties, total] = await Promise.all([
        prisma.bounty.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                reputation: true,
              }
            },
            assignee: {
              select: {
                id: true,
                username: true,
                displayName: true,
              }
            },
            _count: {
              select: {
                applications: true,
                submissions: true,
              }
            }
          }
        }),
        prisma.bounty.count({ where })
      ]);

      res.json({
        bounties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching bounties:', error);
      res.status(500).json({ error: 'Failed to fetch bounties' });
    }
  }

  async getBounty(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const bounty = await prisma.bounty.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
              avatar: true,
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
              avatar: true,
            }
          },
          applications: {
            include: {
              applicant: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  reputation: true,
                  avatar: true,
                  skills: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          submissions: {
            include: {
              submitter: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  reputation: true,
                  avatar: true,
                }
              },
              reviews: {
                include: {
                  reviewer: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!bounty) {
        return res.status(404).json({ error: 'Bounty not found' });
      }

      res.json(bounty);
    } catch (error) {
      console.error('Error fetching bounty:', error);
      res.status(500).json({ error: 'Failed to fetch bounty' });
    }
  }

  async applyToBounty(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { proposal, experience, timeline } = req.body;
      const applicantId = req.user!.id;

      // Check if bounty exists and is open
      const bounty = await prisma.bounty.findUnique({
        where: { id }
      });

      if (!bounty) {
        return res.status(404).json({ error: 'Bounty not found' });
      }

      if (bounty.status !== BountyStatus.OPEN) {
        return res.status(400).json({ error: 'Bounty is not open for applications' });
      }

      // Check if user has already applied
      const existingApplication = await prisma.bountyApplication.findFirst({
        where: {
          bountyId: id,
          applicantId
        }
      });

      if (existingApplication) {
        return res.status(400).json({ error: 'You have already applied to this bounty' });
      }

      const application = await prisma.bountyApplication.create({
        data: {
          bountyId: id,
          applicantId,
          proposal,
          experience,
          timeline,
        },
        include: {
          applicant: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
              avatar: true,
              skills: true,
            }
          }
        }
      });

      res.status(201).json(application);
    } catch (error) {
      console.error('Error applying to bounty:', error);
      res.status(500).json({ error: 'Failed to apply to bounty' });
    }
  }

  async updateApplicationStatus(req: AuthRequest, res: Response) {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      const application = await prisma.bountyApplication.findUnique({
        where: { id: applicationId },
        include: {
          bounty: true
        }
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Check if user is the bounty creator
      if (application.bounty.creatorId !== userId) {
        return res.status(403).json({ error: 'Only bounty creator can update application status' });
      }

      const updatedApplication = await prisma.bountyApplication.update({
        where: { id: applicationId },
        data: { status: status as ApplicationStatus },
        include: {
          applicant: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
            }
          }
        }
      });

      // If application is approved, update bounty status and assignee
      if (status === ApplicationStatus.APPROVED) {
        await prisma.bounty.update({
          where: { id: application.bountyId },
          data: {
            status: BountyStatus.ASSIGNED,
            assigneeId: application.applicantId
          }
        });

        // Reject other applications
        await prisma.bountyApplication.updateMany({
          where: {
            bountyId: application.bountyId,
            id: { not: applicationId },
            status: ApplicationStatus.PENDING
          },
          data: { status: ApplicationStatus.REJECTED }
        });
      }

      res.json(updatedApplication);
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  }

  async getMyApplications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [applications, total] = await Promise.all([
        prisma.bountyApplication.findMany({
          where: { applicantId: userId },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            bounty: {
              include: {
                creator: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                  }
                }
              }
            }
          }
        }),
        prisma.bountyApplication.count({ where: { applicantId: userId } })
      ]);

      res.json({
        applications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }

  async getMyBounties(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10, type = 'created' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where = type === 'created' 
        ? { creatorId: userId }
        : { assigneeId: userId };

      const [bounties, total] = await Promise.all([
        prisma.bounty.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                reputation: true,
              }
            },
            assignee: {
              select: {
                id: true,
                username: true,
                displayName: true,
                reputation: true,
              }
            },
            _count: {
              select: {
                applications: true,
                submissions: true,
              }
            }
          }
        }),
        prisma.bounty.count({ where })
      ]);

      res.json({
        bounties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching bounties:', error);
      res.status(500).json({ error: 'Failed to fetch bounties' });
    }
  }

  async updateBountyStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      const bounty = await prisma.bounty.findUnique({
        where: { id }
      });

      if (!bounty) {
        return res.status(404).json({ error: 'Bounty not found' });
      }

      // Check if user is the bounty creator or assignee
      if (bounty.creatorId !== userId && bounty.assigneeId !== userId) {
        return res.status(403).json({ error: 'Only bounty creator or assignee can update status' });
      }

      const updatedBounty = await prisma.bounty.update({
        where: { id },
        data: { status: status as BountyStatus },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
            }
          },
          assignee: {
            select: {
              id: true,
              username: true,
              displayName: true,
            }
          }
        }
      });

      res.json(updatedBounty);
    } catch (error) {
      console.error('Error updating bounty status:', error);
      res.status(500).json({ error: 'Failed to update bounty status' });
    }
  }
}

export const bountyController = new BountyController();

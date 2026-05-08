import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'
import { createError, asyncHandler } from '../middleware/errorHandler'

const prisma = new PrismaClient()

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('Authentication required', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      certifications: {
        orderBy: { issueDate: 'desc' }
      },
      createdBounties: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              submissions: true
            }
          }
        }
      },
      assignedBounties: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              username: true,
              displayName: true
            }
          }
        }
      },
      submissions: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          bounty: {
            select: {
              title: true,
              reward: true
            }
          }
        }
      },
      _count: {
        select: {
          createdBounties: true,
          assignedBounties: true,
          submissions: true,
          certifications: true
        }
      }
    }
  })

  if (!user) {
    throw createError('User not found', 404)
  }

  res.json({
    success: true,
    data: user
  })
})

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('Authentication required', 401)
  }

  const {
    username,
    displayName,
    bio,
    avatar,
    skills
  } = req.body

  const updateData: any = {}

  if (username) updateData.username = username
  if (displayName) updateData.displayName = displayName
  if (bio !== undefined) updateData.bio = bio
  if (avatar !== undefined) updateData.avatar = avatar
  if (skills) updateData.skills = skills

  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: req.user.id }
      }
    })

    if (existingUser) {
      throw createError('Username already taken', 400)
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      walletAddress: true,
      username: true,
      displayName: true,
      bio: true,
      avatar: true,
      skills: true,
      reputation: true,
      totalEarned: true,
      createdAt: true,
      updatedAt: true
    }
  })

  res.json({
    success: true,
    data: user
  })
})

export const getUserStats = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          createdBounties: true,
          assignedBounties: true,
          submissions: true,
          certifications: true
        }
      }
    }
  })

  if (!user) {
    throw createError('User not found', 404)
  }

  const completedBounties = await prisma.bounty.count({
    where: {
      assigneeId: userId,
      status: 'COMPLETED'
    }
  })

  const totalEarned = await prisma.bounty.aggregate({
    where: {
      assigneeId: userId,
      status: 'COMPLETED'
    },
    _sum: {
      reward: true
    }
  })

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        reputation: user.reputation
      },
      stats: {
        createdBounties: user._count.createdBounties,
        assignedBounties: user._count.assignedBounties,
        submissions: user._count.submissions,
        certifications: user._count.certifications,
        completedBounties,
        totalEarned: user.totalEarned
      }
    }
  })
})

export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.params

  const user = await prisma.user.findUnique({
    where: { walletAddress },
    include: {
      submissions: {
        where: {
          status: 'APPROVED'
        },
        include: {
          bounty: {
            select: {
              id: true,
              title: true,
              reward: true,
              category: true,
              difficulty: true,
              completedAt: true
            }
          },
          reviews: {
            include: {
              reviewer: {
                select: {
                  username: true,
                  displayName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      assignedBounties: {
        where: {
          status: 'COMPLETED'
        },
        include: {
          creator: {
            select: {
              username: true,
              displayName: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      },
      certifications: {
        orderBy: { issueDate: 'desc' },
        take: 10
      },
      _count: {
        select: {
          submissions: true,
          assignedBounties: true,
          certifications: true
        }
      }
    }
  })

  if (!user) {
    throw createError('Profile not found', 404)
  }

  // Calculate reputation score based on approved submissions and peer ratings
  const approvedSubmissions = user._count.submissions
  const completedBounties = user._count.assignedBounties
  const averageRating = user.averageRating || 0
  
  // Reputation calculation: base score from submissions + bonus from ratings
  const baseReputation = approvedSubmissions * 10 + completedBounties * 5
  const ratingBonus = averageRating > 0 ? Math.round(averageRating * 20) : 0
  const calculatedReputation = baseReputation + ratingBonus

  // Calculate total earned from completed bounties
  const totalEarnedFromBounties = user.assignedBounties.reduce((sum, bounty) => {
    return sum + parseFloat(bounty.reward || '0')
  }, 0)

  res.json({
    success: true,
    data: {
      profile: {
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        skills: user.skills,
        reputation: calculatedReputation,
        totalEarned: user.totalEarned || totalEarnedFromBounties.toString(),
        submissionCount: approvedSubmissions,
        averageRating: averageRating,
        completedBounties: completedBounties
      },
      activity: {
        submissions: user.submissions.map(submission => ({
          id: submission.id,
          bountyTitle: submission.bounty.title,
          bountyReward: submission.bounty.reward,
          category: submission.bounty.category,
          difficulty: submission.bounty.difficulty,
          completedAt: submission.bounty.completedAt || submission.updatedAt,
          reviews: submission.reviews.map(review => ({
            rating: review.rating,
            comment: review.comment,
            reviewer: review.reviewer.displayName || review.reviewer.username,
            createdAt: review.createdAt
          }))
        })),
        completedBounties: user.assignedBounties.map(bounty => ({
          id: bounty.id,
          title: bounty.title,
          reward: bounty.reward,
          category: bounty.category,
          difficulty: bounty.difficulty,
          completedAt: bounty.updatedAt,
          creator: bounty.creator.displayName || bounty.creator.username
        })),
        certifications: user.certifications.map(cert => ({
          title: cert.title,
          issuer: cert.issuer,
          issueDate: cert.issueDate,
          verified: cert.verified
        }))
      },
      stats: {
        totalSubmissions: approvedSubmissions,
        completedBounties: completedBounties,
        certifications: user._count.certifications,
        reputation: calculatedReputation
      }
    }
  })
})

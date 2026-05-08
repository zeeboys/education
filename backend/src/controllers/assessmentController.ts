import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { CertificateService } from '../services/certificateService'
import { createError, asyncHandler } from '../middleware/errorHandler'

const prisma = new PrismaClient()

export const submitAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId, answers } = req.body
  const userId = req.user?.id

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  if (!assessmentId || !answers) {
    throw createError('Assessment ID and answers are required', 400)
  }

  // Get assessment with questions
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      course: true
    }
  })

  if (!assessment) {
    throw createError('Assessment not found', 404)
  }

  // Calculate score
  const questions = assessment.questions as any[]
  let correctAnswers = 0
  
  questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) {
      correctAnswers++
    }
  })

  const score = Math.round((correctAnswers / questions.length) * 100)
  const passed = score >= assessment.passingScore

  // Create assessment attempt
  const attempt = await prisma.assessmentAttempt.create({
    data: {
      assessmentId,
      userId,
      score,
      passed,
      answers,
      completedAt: new Date()
    },
    include: {
      assessment: {
        include: {
          course: true
        }
      },
      user: true
    }
  })

  // If this is a final assessment and passed, trigger certificate issuance
  let certificateResult = null
  if (passed && assessment.type === 'FINAL') {
    // Check if user has wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user?.walletAddress) {
      // Check for existing certificate
      const existingCertificate = await prisma.certificate.findFirst({
        where: {
          courseId: assessment.courseId,
          userId
        }
      })

      if (!existingCertificate) {
        // Auto-issue certificate (in production, you might want user confirmation)
        // For now, we'll create a pending certificate that can be claimed later
        certificateResult = {
          pendingCertificate: true,
          message: 'Certificate ready to be issued. Complete the process with your Stellar wallet.'
        }
      }
    }
  }

  res.json({
    success: true,
    data: {
      attempt: {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        completedAt: attempt.completedAt
      },
      certificate: certificateResult,
      message: passed 
        ? 'Congratulations! You passed the assessment.'
        : 'You did not pass the assessment. Try again!'
    }
  })
})

export const getAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params

  if (!assessmentId) {
    throw createError('Assessment ID is required', 400)
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          difficulty: true
        }
      }
    }
  })

  if (!assessment) {
    throw createError('Assessment not found', 404)
  }

  // Don't include correct answers in the response
  const { questions, ...assessmentWithoutAnswers } = assessment
  const questionsWithoutAnswers = (questions as any[]).map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    type: q.type
  }))

  res.json({
    success: true,
    data: {
      assessment: {
        ...assessmentWithoutAnswers,
        questions: questionsWithoutAnswers
      }
    }
  })
})

export const getAssessmentAttempts = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params
  const userId = req.user?.id

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      assessmentId,
      userId
    },
    orderBy: {
      completedAt: 'desc'
    },
    select: {
      id: true,
      score: true,
      passed: true,
      completedAt: true
    }
  })

  res.json({
    success: true,
    data: {
      attempts,
      count: attempts.length
    }
  })
})

import { Request, Response } from 'express'
import { CertificateService } from '../services/certificateService'
import { createError, asyncHandler } from '../middleware/errorHandler'

export const issueCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentAttemptId, userSecret } = req.body
  const userId = req.user?.id

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  if (!assessmentAttemptId || !userSecret) {
    throw createError('Assessment attempt ID and user secret are required', 400)
  }

  const result = await CertificateService.triggerCertificateIssuance(
    assessmentAttemptId,
    userSecret
  )

  if (!result.success) {
    throw createError(result.error || 'Failed to issue certificate', 500)
  }

  res.json({
    success: true,
    data: {
      certificate: result.certificate,
      message: 'Certificate issued successfully on Stellar blockchain'
    }
  })
})

export const getUserCertificates = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  const certificates = await CertificateService.getUserCertificates(userId)

  res.json({
    success: true,
    data: {
      certificates,
      count: certificates.length
    }
  })
})

export const getCertificateByHash = asyncHandler(async (req: Request, res: Response) => {
  const { certificateHash } = req.params

  if (!certificateHash) {
    throw createError('Certificate hash is required', 400)
  }

  const certificate = await CertificateService.getCertificateByHash(certificateHash)

  if (!certificate) {
    throw createError('Certificate not found', 404)
  }

  res.json({
    success: true,
    data: {
      certificate
    }
  })
})

export const verifyCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { certificateHash } = req.params

  if (!certificateHash) {
    throw createError('Certificate hash is required', 400)
  }

  const result = await CertificateService.verifyCertificate(certificateHash)

  if (!result.success) {
    throw createError(result.error || 'Failed to verify certificate', 500)
  }

  res.json({
    success: true,
    data: {
      verified: result.verified,
      stellarData: result.stellarData,
      message: result.verified 
        ? 'Certificate successfully verified on Stellar blockchain'
        : 'Certificate verification failed'
    }
  })
})

export const checkDuplicateCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params
  const userId = req.user?.id

  if (!userId) {
    throw createError('User not authenticated', 401)
  }

  if (!courseId) {
    throw createError('Course ID is required', 400)
  }

  const isDuplicate = await CertificateService.checkDuplicateCertificate(courseId, userId)

  res.json({
    success: true,
    data: {
      isDuplicate,
      message: isDuplicate 
        ? 'Certificate already exists for this course'
        : 'No certificate found for this course'
    }
  })
})

export const getCertificatesByWallet = asyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.params

  if (!walletAddress) {
    throw createError('Wallet address is required', 400)
  }

  const certificates = await CertificateService.getCertificatesByWallet(walletAddress)

  res.json({
    success: true,
    data: {
      certificates,
      count: certificates.length
    }
  })
})

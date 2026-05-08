import { PrismaClient } from '@prisma/client'
import * as StellarSdk from 'stellar-sdk'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Stellar configuration
const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'TESTNET'
const HORIZON_URL = STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org'

const server = new StellarSdk.Horizon.Server(HORIZON_URL)

export interface CertificateData {
  courseId: string
  userId: string
  assessmentId: string
  walletAddress: string
  completionTimestamp: Date
  score?: number
}

export interface CertificateMetadata {
  courseTitle: string
  learnerName: string
  issuerName: string
  certificateType: string
  difficulty: string
  duration: number
}

export class CertificateService {
  /**
   * Generate a unique certificate hash using SHA-256
   */
  static generateCertificateHash(data: CertificateData & CertificateMetadata): string {
    const hashInput = JSON.stringify({
      courseId: data.courseId,
      userId: data.userId,
      assessmentId: data.assessmentId,
      walletAddress: data.walletAddress,
      completionTimestamp: data.completionTimestamp,
      courseTitle: data.courseTitle,
      learnerName: data.learnerName,
      issuerName: data.issuerName,
      certificateType: data.certificateType,
      difficulty: data.difficulty,
      duration: data.duration
    })
    
    return crypto.createHash('sha256').update(hashInput).digest('hex')
  }

  /**
   * Generate Stellar data key for MANAGE_DATA operation
   */
  static generateStellarDataKey(certificateHash: string): string {
    // Use prefix to identify certificate data entries
    return `cert_${certificateHash.substring(0, 32)}`
  }

  /**
   * Create certificate data for Stellar MANAGE_DATA operation
   */
  static createCertificateData(data: CertificateData & CertificateMetadata): string {
    const certificatePayload = {
      v: '1.0', // Version
      type: 'certificate',
      courseId: data.courseId,
      userId: data.userId,
      assessmentId: data.assessmentId,
      completionDate: data.completionTimestamp.toISOString(),
      score: data.score,
      courseTitle: data.courseTitle,
      learnerName: data.learnerName,
      issuerName: data.issuerName,
      certificateType: data.certificateType,
      difficulty: data.difficulty,
      duration: data.duration,
      platform: 'decentralized-education'
    }
    
    return Buffer.from(JSON.stringify(certificatePayload)).toString('base64')
  }

  /**
   * Check if certificate already exists for this course and user
   */
  static async checkDuplicateCertificate(courseId: string, userId: string): Promise<boolean> {
    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        courseId,
        userId
      }
    })
    
    return !!existingCertificate
  }

  /**
   * Issue a verifiable certificate on Stellar blockchain
   */
  static async issueCertificate(
    certificateData: CertificateData,
    metadata: CertificateMetadata,
    userSecret: string
  ): Promise<{ success: boolean; certificate?: any; error?: string }> {
    try {
      // Check for duplicate certificates
      const isDuplicate = await this.checkDuplicateCertificate(
        certificateData.courseId,
        certificateData.userId
      )
      
      if (isDuplicate) {
        return {
          success: false,
          error: 'Certificate already exists for this course and user'
        }
      }

      // Generate certificate hash
      const certificateHash = this.generateCertificateHash({
        ...certificateData,
        ...metadata
      })

      // Generate Stellar data key
      const stellarDataKey = this.generateStellarDataKey(certificateHash)

      // Create certificate data payload
      const certificatePayload = this.createCertificateData({
        ...certificateData,
        ...metadata
      })

      // Create Stellar keypair from user secret
      const keypair = StellarSdk.Keypair.fromSecret(userSecret)

      // Load user account
      const account = await server.loadAccount(keypair.publicKey())

      // Build transaction with MANAGE_DATA operation
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks[STELLAR_NETWORK]
      })
        .addOperation(StellarSdk.Operation.manageData({
          name: stellarDataKey,
          value: certificatePayload
        }))
        .setTimeout(30)
        .build()

      // Sign transaction
      transaction.sign(keypair)

      // Submit transaction
      const result = await server.submitTransaction(transaction)

      // Generate Stellar Explorer URL
      const stellarExplorerUrl = STELLAR_NETWORK === 'PUBLIC'
        ? `https://stellar.expert/explorer/public/tx/${result.hash}`
        : `https://stellar.expert/explorer/testnet/tx/${result.hash}`

      // Save certificate to database
      const certificate = await prisma.certificate.create({
        data: {
          userId: certificateData.userId,
          courseId: certificateData.courseId,
          assessmentId: certificateData.assessmentId,
          stellarTxHash: result.hash,
          certificateHash,
          stellarDataKey,
          walletAddress: certificateData.walletAddress,
          completionDate: certificateData.completionTimestamp,
          stellarExplorerUrl,
          verified: true,
          metadata: {
            ...metadata,
            score: certificateData.score
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              walletAddress: true
            }
          },
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
              duration: true
            }
          }
        }
      })

      return {
        success: true,
        certificate
      }
    } catch (error) {
      console.error('Error issuing certificate:', error)
      return {
        success: false,
        error: error.message || 'Failed to issue certificate'
      }
    }
  }

  /**
   * Verify certificate on Stellar blockchain
   */
  static async verifyCertificate(certificateHash: string): Promise<{
    success: boolean
    verified?: boolean
    stellarData?: any
    error?: string
  }> {
    try {
      // Find certificate in database
      const certificate = await prisma.certificate.findUnique({
        where: { certificateHash },
        include: {
          user: true,
          course: true
        }
      })

      if (!certificate) {
        return {
          success: false,
          error: 'Certificate not found'
        }
      }

      if (!certificate.stellarTxHash || !certificate.stellarDataKey) {
        return {
          success: false,
          error: 'Certificate Stellar data missing'
        }
      }

      // Get transaction from Stellar
      const transaction = await server
        .transactions()
        .transaction(certificate.stellarTxHash)
        .call()

      // Check if transaction was successful
      if (!transaction.successful) {
        return {
          success: true,
          verified: false,
          error: 'Stellar transaction failed'
        }
      }

      // Find MANAGE_DATA operation in transaction
      const manageDataOp = transaction.operations.find(
        (op: any) => op.type === 'manage_data' && op.name === certificate.stellarDataKey
      )

      if (!manageDataOp) {
        return {
          success: true,
          verified: false,
          error: 'Certificate data not found in transaction'
        }
      }

      // Decode and verify certificate data
      const decodedData = JSON.parse(
        Buffer.from(manageDataOp.value, 'base64').toString('utf-8')
      )

      // Verify data integrity
      const expectedHash = this.generateCertificateHash({
        courseId: certificate.courseId,
        userId: certificate.userId,
        assessmentId: certificate.assessmentId,
        walletAddress: certificate.walletAddress,
        completionTimestamp: certificate.completionDate,
        courseTitle: decodedData.courseTitle,
        learnerName: decodedData.learnerName,
        issuerName: decodedData.issuerName,
        certificateType: decodedData.certificateType,
        difficulty: decodedData.difficulty,
        duration: decodedData.duration
      })

      const isVerified = expectedHash === certificateHash

      // Update certificate verification status
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: { verified: isVerified }
      })

      return {
        success: true,
        verified: isVerified,
        stellarData: decodedData
      }
    } catch (error) {
      console.error('Error verifying certificate:', error)
      return {
        success: false,
        error: error.message || 'Failed to verify certificate'
      }
    }
  }

  /**
   * Get user certificates
   */
  static async getUserCertificates(userId: string): Promise<any[]> {
    return await prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
            duration: true,
            thumbnail: true
          }
        }
      },
      orderBy: { completionDate: 'desc' }
    })
  }

  /**
   * Get certificate by hash
   */
  static async getCertificateByHash(certificateHash: string): Promise<any> {
    return await prisma.certificate.findUnique({
      where: { certificateHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            walletAddress: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
            duration: true,
            thumbnail: true
          }
        }
      }
    })
  }

  /**
   * Trigger certificate issuance after assessment completion
   */
  static async triggerCertificateIssuance(
    assessmentAttemptId: string,
    userSecret?: string
  ): Promise<{ success: boolean; certificate?: any; error?: string }> {
    try {
      // Get assessment attempt with related data
      const assessmentAttempt = await prisma.assessmentAttempt.findUnique({
        where: { id: assessmentAttemptId },
        include: {
          assessment: {
            include: {
              course: {
                include: {
                  creator: {
                    select: {
                      displayName: true
                    }
                  }
                }
              }
            }
          },
          user: true
        }
      })

      if (!assessmentAttempt) {
        return {
          success: false,
          error: 'Assessment attempt not found'
        }
      }

      // Check if assessment was passed
      if (!assessmentAttempt.passed) {
        return {
          success: false,
          error: 'Assessment not passed - certificate not issued'
        }
      }

      // Check if this is a final assessment
      if (assessmentAttempt.assessment.type !== 'FINAL') {
        return {
          success: false,
          error: 'Only final assessments trigger certificate issuance'
        }
      }

      // Check if user has wallet address
      if (!assessmentAttempt.user.walletAddress) {
        return {
          success: false,
          error: 'User wallet address required for certificate issuance'
        }
      }

      // Check for existing certificate
      const existingCertificate = await prisma.certificate.findFirst({
        where: {
          courseId: assessmentAttempt.assessment.course.id,
          userId: assessmentAttempt.userId
        }
      })

      if (existingCertificate) {
        return {
          success: false,
          error: 'Certificate already exists for this course'
        }
      }

      if (!userSecret) {
        return {
          success: false,
          error: 'User secret required for Stellar transaction'
        }
      }

      // Prepare certificate data
      const certificateData: CertificateData = {
        courseId: assessmentAttempt.assessment.course.id,
        userId: assessmentAttempt.userId,
        assessmentId: assessmentAttempt.assessment.id,
        walletAddress: assessmentAttempt.user.walletAddress,
        completionTimestamp: assessmentAttempt.completedAt,
        score: assessmentAttempt.score
      }

      const metadata: CertificateMetadata = {
        courseTitle: assessmentAttempt.assessment.course.title,
        learnerName: assessmentAttempt.user.displayName || assessmentAttempt.user.username,
        issuerName: assessmentAttempt.assessment.course.creator.displayName || 'Education Platform',
        certificateType: 'Course Completion',
        difficulty: assessmentAttempt.assessment.course.difficulty,
        duration: assessmentAttempt.assessment.course.duration
      }

      // Issue certificate
      return await this.issueCertificate(certificateData, metadata, userSecret)
    } catch (error) {
      console.error('Error triggering certificate issuance:', error)
      return {
        success: false,
        error: error.message || 'Failed to trigger certificate issuance'
      }
    }
  }
}

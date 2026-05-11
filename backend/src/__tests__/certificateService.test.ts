import { CertificateService } from '../services/certificateService'
import * as StellarSdk from 'stellar-sdk'
import { PrismaClient } from '@prisma/client'

// Mock dependencies
jest.mock('@prisma/client')
jest.mock('stellar-sdk')

describe('CertificateService', () => {
  let mockPrisma: jest.Mocked<PrismaClient>
  let mockServer: jest.Mocked<any>

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>
    mockServer = StellarSdk.Horizon.Server as jest.Mocked<any>
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('generateCertificateHash', () => {
    it('should generate consistent hash for same data', () => {
      const certificateData = {
        courseId: 'course-123',
        userId: 'user-123',
        assessmentId: 'assessment-123',
        walletAddress: 'GD123456789',
        completionTimestamp: new Date('2024-01-01'),
        score: 85
      }

      const metadata = {
        courseTitle: 'Test Course',
        learnerName: 'John Doe',
        issuerName: 'Test Platform',
        certificateType: 'Course Completion',
        difficulty: 'Intermediate',
        duration: 40
      }

      const hash1 = CertificateService.generateCertificateHash({
        ...certificateData,
        ...metadata
      })
      const hash2 = CertificateService.generateCertificateHash({
        ...certificateData,
        ...metadata
      })

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different hashes for different data', () => {
      const data1 = {
        courseId: 'course-123',
        userId: 'user-123',
        assessmentId: 'assessment-123',
        walletAddress: 'GD123456789',
        completionTimestamp: new Date('2024-01-01'),
        courseTitle: 'Course 1'
      }

      const data2 = {
        courseId: 'course-456',
        userId: 'user-123',
        assessmentId: 'assessment-123',
        walletAddress: 'GD123456789',
        completionTimestamp: new Date('2024-01-01'),
        courseTitle: 'Course 2'
      }

      const hash1 = CertificateService.generateCertificateHash(data1 as any)
      const hash2 = CertificateService.generateCertificateHash(data2 as any)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateStellarDataKey', () => {
    it('should generate key with cert_ prefix', () => {
      const certificateHash = 'a'.repeat(64) // 64 character hash
      const key = CertificateService.generateStellarDataKey(certificateHash)
      
      expect(key).toBe('cert_' + 'a'.repeat(32))
      expect(key.length).toBeLessThanOrEqual(64) // Stellar data key max length
    })

    it('should handle short hashes', () => {
      const certificateHash = 'short'
      const key = CertificateService.generateStellarDataKey(certificateHash)
      
      expect(key).toBe('cert_short')
    })
  })

  describe('createCertificateData', () => {
    it('should create base64 encoded certificate payload', () => {
      const certificateData = {
        courseId: 'course-123',
        userId: 'user-123',
        assessmentId: 'assessment-123',
        walletAddress: 'GD123456789',
        completionTimestamp: new Date('2024-01-01'),
        score: 85,
        courseTitle: 'Test Course',
        learnerName: 'John Doe',
        issuerName: 'Test Platform',
        certificateType: 'Course Completion',
        difficulty: 'Intermediate',
        duration: 40
      }

      const payload = CertificateService.createCertificateData(certificateData as any)
      
      // Should be base64 encoded
      expect(() => Buffer.from(payload, 'base64').toString('utf-8')).not.toThrow()
      
      // Should contain all required fields
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'))
      expect(decoded.v).toBe('1.0')
      expect(decoded.type).toBe('certificate')
      expect(decoded.courseId).toBe('course-123')
      expect(decoded.userId).toBe('user-123')
      expect(decoded.platform).toBe('decentralized-education')
    })
  })

  describe('checkDuplicateCertificate', () => {
    it('should return true for existing certificate', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue({
        id: 'cert-123',
        courseId: 'course-123',
        userId: 'user-123'
      } as any)

      const result = await CertificateService.checkDuplicateCertificate('course-123', 'user-123')
      
      expect(mockPrisma.certificate.findFirst).toHaveBeenCalledWith({
        where: {
          courseId: 'course-123',
          userId: 'user-123'
        }
      })
      expect(result).toBe(true)
    })

    it('should return false for no existing certificate', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null)

      const result = await CertificateService.checkDuplicateCertificate('course-123', 'user-123')
      
      expect(result).toBe(false)
    })
  })

  describe('issueCertificate', () => {
    const mockCertificateData = {
      courseId: 'course-123',
      userId: 'user-123',
      assessmentId: 'assessment-123',
      walletAddress: 'GD123456789',
      completionTimestamp: new Date('2024-01-01'),
      score: 85
    }

    const mockMetadata = {
      courseTitle: 'Test Course',
      learnerName: 'John Doe',
      issuerName: 'Test Platform',
      certificateType: 'Course Completion',
      difficulty: 'Intermediate',
      duration: 40
    }

    it('should issue certificate successfully', async () => {
      // Mock successful Stellar transaction
      const mockTransaction = {
        hash: 'tx-hash-123',
        successful: true
      }
      mockServer.submitTransaction.mockResolvedValue(mockTransaction)
      
      // Mock database operations
      mockPrisma.certificate.create.mockResolvedValue({
        id: 'cert-123',
        ...mockCertificateData,
        stellarTxHash: 'tx-hash-123'
      } as any)

      const result = await CertificateService.issueCertificate(
        mockCertificateData,
        mockMetadata as any,
        'secret-key-123'
      )

      expect(result.success).toBe(true)
      expect(result.certificate).toBeDefined()
      expect(mockPrisma.certificate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          courseId: 'course-123',
          assessmentId: 'assessment-123',
          stellarTxHash: 'tx-hash-123',
          walletAddress: 'GD123456789',
          verified: true
        })
      })
    })

    it('should prevent duplicate certificates', async () => {
      // Mock existing certificate
      mockPrisma.certificate.findFirst.mockResolvedValue({ id: 'existing-cert' } as any)

      const result = await CertificateService.issueCertificate(
        mockCertificateData,
        mockMetadata as any,
        'secret-key-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Certificate already exists for this course and user')
    })

    it('should handle Stellar transaction failure', async () => {
      // Mock failed Stellar transaction
      mockServer.submitTransaction.mockRejectedValue(new Error('Transaction failed'))

      const result = await CertificateService.issueCertificate(
        mockCertificateData,
        mockMetadata as any,
        'secret-key-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to issue certificate')
    })
  })

  describe('verifyCertificate', () => {
    const mockCertificate = {
      id: 'cert-123',
      certificateHash: 'hash-123',
      stellarTxHash: 'tx-hash-123',
      stellarDataKey: 'cert_hash123',
      userId: 'user-123',
      courseId: 'course-123',
      assessmentId: 'assessment-123',
      walletAddress: 'GD123456789',
      completionDate: new Date('2024-01-01'),
      verified: false,
      user: {
        id: 'user-123',
        username: 'johndoe',
        displayName: 'John Doe'
      },
      course: {
        id: 'course-123',
        title: 'Test Course',
        difficulty: 'Intermediate',
        duration: 40
      }
    }

    it('should verify certificate successfully', async () => {
      // Mock successful Stellar transaction with MANAGE_DATA operation
      const mockTransaction = {
        successful: true,
        operations: [
          {
            type: 'manage_data',
            name: 'cert_hash123',
            value: Buffer.from(JSON.stringify({
              v: '1.0',
              type: 'certificate',
              courseId: 'course-123'
            })).toString('base64')
          }
        ]
      }
      mockServer.transactions().transaction.mockResolvedValue(mockTransaction)
      
      // Mock database operations
      mockPrisma.certificate.findUnique.mockResolvedValue(mockCertificate as any)
      mockPrisma.certificate.update.mockResolvedValue({ verified: true } as any)

      const result = await CertificateService.verifyCertificate('hash-123')

      expect(result.success).toBe(true)
      expect(result.verified).toBe(true)
      expect(result.stellarData).toBeDefined()
      expect(mockPrisma.certificate.update).toHaveBeenCalledWith({
        where: { id: 'cert-123' },
        data: { verified: true }
      })
    })

    it('should handle certificate not found', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null)

      const result = await CertificateService.verifyCertificate('nonexistent-hash')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Certificate not found')
    })

    it('should handle invalid Stellar transaction', async () => {
      const mockTransaction = {
        successful: false,
        operations: []
      }
      mockServer.transactions().transaction.mockResolvedValue(mockTransaction)
      
      mockPrisma.certificate.findUnique.mockResolvedValue(mockCertificate as any)

      const result = await CertificateService.verifyCertificate('hash-123')

      expect(result.success).toBe(true)
      expect(result.verified).toBe(false)
    })
  })

  describe('getCertificatesByWallet', () => {
    it('should return certificates ordered by completion date', async () => {
      const mockCertificates = [
        { id: 'cert-1', completionDate: new Date('2024-01-02') },
        { id: 'cert-2', completionDate: new Date('2024-01-01') },
        { id: 'cert-3', completionDate: new Date('2024-01-03') }
      ]

      mockPrisma.certificate.findMany.mockResolvedValue(mockCertificates as any)

      const result = await CertificateService.getCertificatesByWallet('GD123456789')

      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith({
        where: { walletAddress: 'GD123456789' },
        include: expect.any(Object),
        orderBy: { completionDate: 'desc' }
      })
      expect(result).toEqual(mockCertificates)
    })
  })
})

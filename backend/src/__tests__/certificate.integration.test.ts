import request from 'supertest'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import * as StellarSdk from 'stellar-sdk'

describe('Certificate Integration Tests', () => {
  let app: express.Application
  let mockPrisma: jest.Mocked<PrismaClient>
  let mockServer: jest.Mocked<any>

  beforeAll(() => {
    // Set up test environment
    process.env.STELLAR_NETWORK = 'TESTNET'
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
  })

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    // Mock database
    mockPrisma = {
      certificate: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      assessmentAttempt: {
        findUnique: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      }
    } as any

    // Mock Stellar server
    mockServer = {
      loadAccount: jest.fn().mockResolvedValue({
        accountId: 'GD123456789',
        sequence: 1
      }),
      submitTransaction: jest.fn()
    }
    
    StellarSdk.Horizon.Server = jest.fn().mockImplementation(() => mockServer)
    StellarSdk.Networks.TESTNET = 'Test SDF Network ; September 2015'
    StellarSdk.TransactionBuilder = jest.fn().mockImplementation((account: any, options: any) => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        sign: jest.fn().mockReturnThis(),
        toEnvelope: jest.fn().mockReturnValue('mock-envelope')
      }),
      sign: jest.fn().mockReturnThis()
    } as any))
    
    StellarSdk.Operation = {
      manageData: jest.fn().mockReturnValue({
        type: 'manage_data',
        name: 'cert_test123',
        value: 'base64-encoded-data'
      })
    } as any

    StellarSdk.Keypair = {
      fromSecret: jest.fn().mockReturnValue({
        publicKey: jest.fn().mockReturnValue('GD123456789'),
        sign: jest.fn()
      })
    } as any
  })

  describe('Complete Certificate Flow', () => {
    it('should issue and verify certificate end-to-end', async () => {
      // Mock successful assessment
      const mockAssessmentAttempt = {
        id: 'attempt-123',
        passed: true,
        score: 85,
        completedAt: new Date('2024-01-01'),
        assessment: {
          type: 'FINAL',
          courseId: 'course-123',
          course: {
            id: 'course-123',
            title: 'Test Course',
            difficulty: 'Intermediate',
            duration: 40,
            creator: {
              displayName: 'Test Platform'
            }
          }
        },
        user: {
          id: 'user-123',
          walletAddress: 'GD123456789',
          displayName: 'John Doe'
        }
      }

      mockPrisma.assessmentAttempt.findUnique.mockResolvedValue(mockAssessmentAttempt as any)
      mockPrisma.certificate.findFirst.mockResolvedValue(null) // No duplicate
      mockPrisma.user.findUnique.mockResolvedValue({ walletAddress: 'GD123456789' } as any)

      // Mock successful Stellar transaction
      const mockTransaction = {
        hash: 'tx-hash-123',
        successful: true,
        operations: [
          {
            type: 'manage_data',
            name: 'cert_test123',
            value: Buffer.from(JSON.stringify({
              v: '1.0',
              type: 'certificate',
              courseId: 'course-123'
            })).toString('base64')
          }
        ]
      }
      mockServer.submitTransaction.mockResolvedValue(mockTransaction)

      // Mock certificate creation
      const mockCertificate = {
        id: 'cert-123',
        userId: 'user-123',
        courseId: 'course-123',
        assessmentId: 'assessment-123',
        stellarTxHash: 'tx-hash-123',
        certificateHash: 'hash-123',
        stellarDataKey: 'cert_hash123',
        walletAddress: 'GD123456789',
        completionDate: new Date('2024-01-01'),
        verified: true,
        user: {
          id: 'user-123',
          username: 'johndoe',
          displayName: 'John Doe',
          walletAddress: 'GD123456789'
        },
        course: {
          id: 'course-123',
          title: 'Test Course',
          category: 'Blockchain',
          difficulty: 'Intermediate',
          duration: 40
        }
      }
      mockPrisma.certificate.create.mockResolvedValue(mockCertificate as any)

      // Import and use routes
      const certificateRoutes = require('../routes/certificateRoutes').default
      app.use('/api/certificates', certificateRoutes)

      // Test certificate issuance
      const issueResponse = await request(app)
        .post('/api/certificates/issue')
        .send({
          assessmentAttemptId: 'attempt-123',
          userSecret: 'secret-key-123'
        })
        .expect(200)

      expect(issueResponse.body.success).toBe(true)
      expect(issueResponse.body.data.certificate).toEqual(mockCertificate)

      // Test certificate verification
      mockPrisma.certificate.findUnique.mockResolvedValue(mockCertificate as any)
      mockServer.transactions().transaction.mockResolvedValue(mockTransaction)

      const verifyResponse = await request(app)
        .get('/api/certificates/hash-123/verify')
        .expect(200)

      expect(verifyResponse.body.success).toBe(true)
      expect(verifyResponse.body.data.verified).toBe(true)
      expect(verifyResponse.body.data.stellarData).toBeDefined()
    })

    it('should prevent duplicate certificate issuance', async () => {
      // Mock existing certificate
      mockPrisma.certificate.findFirst.mockResolvedValue({
        id: 'existing-cert',
        courseId: 'course-123',
        userId: 'user-123'
      } as any)

      const certificateRoutes = require('../routes/certificateRoutes').default
      app.use('/api/certificates', certificateRoutes)

      const response = await request(app)
        .post('/api/certificates/issue')
        .send({
          assessmentAttemptId: 'attempt-123',
          userSecret: 'secret-key-123'
        })
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Certificate already exists')
    })
  })

  describe('Public Certificate Access', () => {
    it('should allow public access to certificates by wallet', async () => {
      const mockCertificates = [
        {
          id: 'cert-1',
          walletAddress: 'GD123456789',
          course: { title: 'Course 1' },
          user: { displayName: 'User 1' }
        },
        {
          id: 'cert-2',
          walletAddress: 'GD123456789',
          course: { title: 'Course 2' },
          user: { displayName: 'User 1' }
        }
      ]

      mockPrisma.certificate.findMany.mockResolvedValue(mockCertificates as any)

      const certificateRoutes = require('../routes/certificateRoutes').default
      app.use('/api/certificates', certificateRoutes)

      const response = await request(app)
        .get('/api/certificates/user/GD123456789')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificates).toEqual(mockCertificates)
      expect(response.body.data.count).toBe(2)
    })

    it('should return empty list for wallet with no certificates', async () => {
      mockPrisma.certificate.findMany.mockResolvedValue([])

      const certificateRoutes = require('../routes/certificateRoutes').default
      app.use('/api/certificates', certificateRoutes)

      const response = await request(app)
        .get('/api/certificates/user/GD123456789')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificates).toEqual([])
      expect(response.body.data.count).toBe(0)
    })
  })

  describe('Certificate Validation', () => {
    it('should validate certificate hash format', async () => {
      const mockCertificate = {
        id: 'cert-123',
        certificateHash: 'a1b2c3d4e5f67890a1b2c3d4e5f67890',
        stellarTxHash: 'tx-hash-123',
        stellarDataKey: 'cert_a1b2c3d4e5f67890a1b2c3d4',
        verified: true
      }

      mockPrisma.certificate.findUnique.mockResolvedValue(mockCertificate as any)

      const certificateRoutes = require('../routes/certificateRoutes').default
      app.use('/api/certificates', certificateRoutes)

      const response = await request(app)
        .get('/api/certificates/a1b2c3d4e5f67890a1b2c3d4e5f67890')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificate.certificateHash).toBe('a1b2c3d4e5f67890a1b2c3d4e5f67890')
    })

    it('should return 404 for non-existent certificate', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null)

      const certificateRoutes = require('../routes/certificateRoutes').default
      app.use('/api/certificates', certificateRoutes)

      const response = await request(app)
        .get('/api/certificates/non-existent-hash')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Certificate not found')
    })
  })
})

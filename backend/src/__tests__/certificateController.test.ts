import request from 'supertest'
import express from 'express'
import { CertificateService } from '../services/certificateService'
import certificateRoutes from '../routes/certificateRoutes'

// Mock CertificateService
jest.mock('../services/certificateService')

describe('Certificate Controller', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use('/api/certificates', certificateRoutes)
    jest.clearAllMocks()
  })

  describe('POST /api/certificates/issue', () => {
    it('should issue certificate successfully', async () => {
      const mockCertificate = {
        id: 'cert-123',
        stellarTxHash: 'tx-hash-123',
        certificateHash: 'hash-123'
      }

      ;(CertificateService.triggerCertificateIssuance as jest.Mock).mockResolvedValue({
        success: true,
        certificate: mockCertificate
      })

      const response = await request(app)
        .post('/api/certificates/issue')
        .send({
          assessmentAttemptId: 'attempt-123',
          userSecret: 'secret-123'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificate).toEqual(mockCertificate)
    })

    it('should handle missing assessment attempt ID', async () => {
      const response = await request(app)
        .post('/api/certificates/issue')
        .send({
          userSecret: 'secret-123'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Assessment attempt ID and user secret are required')
    })

    it('should handle certificate issuance failure', async () => {
      ;(CertificateService.triggerCertificateIssuance as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Certificate already exists'
      })

      const response = await request(app)
        .post('/api/certificates/issue')
        .send({
          assessmentAttemptId: 'attempt-123',
          userSecret: 'secret-123'
        })
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Failed to issue certificate')
    })
  })

  describe('GET /api/certificates', () => {
    it('should get user certificates', async () => {
      const mockCertificates = [
        { id: 'cert-1', title: 'Course 1' },
        { id: 'cert-2', title: 'Course 2' }
      ]

      ;(CertificateService.getUserCertificates as jest.Mock).mockResolvedValue(mockCertificates)

      const response = await request(app)
        .get('/api/certificates')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificates).toEqual(mockCertificates)
      expect(response.body.data.count).toBe(2)
    })
  })

  describe('GET /api/certificates/user/:walletAddress', () => {
    it('should get certificates by wallet address', async () => {
      const mockCertificates = [
        { id: 'cert-1', walletAddress: 'GD123456789' }
      ]

      ;(CertificateService.getCertificatesByWallet as jest.Mock).mockResolvedValue(mockCertificates)

      const response = await request(app)
        .get('/api/certificates/user/GD123456789')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificates).toEqual(mockCertificates)
      expect(response.body.data.count).toBe(1)
    })

    it('should handle missing wallet address', async () => {
      const response = await request(app)
        .get('/api/certificates/user/')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Wallet address is required')
    })
  })

  describe('GET /api/certificates/check-duplicate/:courseId', () => {
    it('should check for duplicate certificate', async () => {
      ;(CertificateService.checkDuplicateCertificate as jest.Mock).mockResolvedValue(true)

      const response = await request(app)
        .get('/api/certificates/check-duplicate/course-123')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.isDuplicate).toBe(true)
      expect(response.body.data.message).toContain('Certificate already exists')
    })

    it('should handle missing course ID', async () => {
      const response = await request(app)
        .get('/api/certificates/check-duplicate/')
        .expect(404)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/certificates/:certificateHash', () => {
    it('should get certificate by hash', async () => {
      const mockCertificate = {
        id: 'cert-123',
        certificateHash: 'hash-123',
        course: { title: 'Test Course' }
      }

      ;(CertificateService.getCertificateByHash as jest.Mock).mockResolvedValue(mockCertificate)

      const response = await request(app)
        .get('/api/certificates/hash-123')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.certificate).toEqual(mockCertificate)
    })

    it('should handle certificate not found', async () => {
      ;(CertificateService.getCertificateByHash as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/certificates/nonexistent-hash')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Certificate not found')
    })
  })

  describe('GET /api/certificates/:certificateHash/verify', () => {
    it('should verify certificate successfully', async () => {
      ;(CertificateService.verifyCertificate as jest.Mock).mockResolvedValue({
        success: true,
        verified: true,
        stellarData: { type: 'certificate' }
      })

      const response = await request(app)
        .get('/api/certificates/hash-123/verify')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.verified).toBe(true)
      expect(response.body.data.stellarData).toBeDefined()
    })

    it('should handle verification failure', async () => {
      ;(CertificateService.verifyCertificate as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Certificate verification failed'
      })

      const response = await request(app)
        .get('/api/certificates/hash-123/verify')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Failed to verify certificate')
    })
  })
})

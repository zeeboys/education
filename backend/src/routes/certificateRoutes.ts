import { Router } from 'express'
import {
  issueCertificate,
  getUserCertificates,
  getCertificateByHash,
  verifyCertificate,
  checkDuplicateCertificate
} from '../controllers/certificateController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// All certificate routes require authentication
router.use(authenticateToken)

// POST /api/certificates/issue - Issue a new certificate
router.post('/issue', issueCertificate)

// GET /api/certificates - Get user's certificates
router.get('/', getUserCertificates)

// GET /api/certificates/check-duplicate/:courseId - Check for duplicate certificate
router.get('/check-duplicate/:courseId', checkDuplicateCertificate)

// GET /api/certificates/:certificateHash - Get certificate by hash
router.get('/:certificateHash', getCertificateByHash)

// GET /api/certificates/:certificateHash/verify - Verify certificate on Stellar
router.get('/:certificateHash/verify', verifyCertificate)

export default router

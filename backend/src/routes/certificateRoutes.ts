import { Router } from 'express'
import {
  issueCertificate,
  getUserCertificates,
  getCertificateByHash,
  verifyCertificate,
  checkDuplicateCertificate,
  getCertificatesByWallet
} from '../controllers/certificateController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// GET /api/certificates/user/:walletAddress - Get certificates by wallet address (public route)
router.get('/user/:walletAddress', getCertificatesByWallet)

// All certificate routes below require authentication
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

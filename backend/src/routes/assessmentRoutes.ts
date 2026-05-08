import { Router } from 'express'
import {
  submitAssessment,
  getAssessment,
  getAssessmentAttempts
} from '../controllers/assessmentController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// All assessment routes require authentication
router.use(authenticateToken)

// POST /api/assessments/:assessmentId/submit - Submit assessment answers
router.post('/:assessmentId/submit', submitAssessment)

// GET /api/assessments/:assessmentId - Get assessment details
router.get('/:assessmentId', getAssessment)

// GET /api/assessments/:assessmentId/attempts - Get user's attempts
router.get('/:assessmentId/attempts', getAssessmentAttempts)

export default router

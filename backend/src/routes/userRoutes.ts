import { Router } from 'express'
import { getUserProfile, updateUserProfile, getUserStats, getPublicProfile } from '../controllers/userController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/profile', authenticateToken, getUserProfile)
router.put('/profile', authenticateToken, updateUserProfile)
router.get('/stats/:userId', getUserStats)
router.get('/public/:walletAddress', getPublicProfile)

export default router

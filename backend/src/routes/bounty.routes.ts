import { Router } from 'express';
import { bountyController } from '../controllers/bounty.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', optionalAuth, bountyController.getBounties.bind(bountyController));
router.get('/:id', optionalAuth, bountyController.getBounty.bind(bountyController));

// Protected routes - require authentication
router.use(authenticateToken);

// Bounty management
router.post('/', bountyController.createBounty.bind(bountyController));
router.put('/:id/status', bountyController.updateBountyStatus.bind(bountyController));

// Applications
router.post('/:id/apply', bountyController.applyToBounty.bind(bountyController));
router.put('/applications/:applicationId/status', bountyController.updateApplicationStatus.bind(bountyController));

// User-specific routes
router.get('/my/created', bountyController.getMyBounties.bind(bountyController));
router.get('/my/assigned', bountyController.getMyBounties.bind(bountyController));
router.get('/my/applications', bountyController.getMyApplications.bind(bountyController));

export default router;

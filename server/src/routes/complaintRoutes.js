import { Router } from 'express';
import * as controller from '../controllers/complaintController.js';
import { authenticate, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', controller.list);
router.post('/', allowRoles('student'), controller.create);
router.get('/dashboard', allowRoles('admin'), controller.dashboard);
router.get('/staff', allowRoles('admin'), controller.staff);
router.get('/:id', controller.detail);
router.post('/:id/assign', allowRoles('admin'), controller.assign);
router.post('/:id/reject', allowRoles('admin'), controller.reject);
router.patch('/:id/priority', allowRoles('admin'), controller.updatePriority);
router.patch('/:id/status', allowRoles('staff'), controller.updateStatus);
export default router;

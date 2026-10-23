import { Router } from 'express';
import * as controller from '../controllers/complaintController.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { receiveComplaintPhoto } from '../middleware/complaintPhotoUpload.js';

const router = Router();
router.use(authenticate);
router.get('/', controller.list);
router.post('/', allowRoles('student'), receiveComplaintPhoto, controller.create);
router.get('/dashboard', allowRoles('admin'), controller.dashboard);
router.get('/escalated', allowRoles('admin'), controller.escalated);
router.get('/staff', allowRoles('admin'), controller.staff);
router.get('/:id/photo', controller.photo);
router.get('/:id', controller.detail);
router.post('/:id/assign', allowRoles('admin'), controller.assign);
router.post('/:id/reject', allowRoles('admin'), controller.reject);
router.patch('/:id/priority', allowRoles('admin'), controller.updatePriority);
router.patch('/:id/status', allowRoles('staff'), controller.updateStatus);
export default router;

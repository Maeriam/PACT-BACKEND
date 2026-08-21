import { Router } from 'express';
import { signup, login, getMe, signupartisan } from '../controllers/auth';
import { protect } from '../middleware/auth';
const router = Router();

router.post('/signup/client', signup);
router.post('/signup/artisan', signupartisan);

router.post('/login', login);
router.get('/me', protect, getMe);

export default router;
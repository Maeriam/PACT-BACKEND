import { Router } from 'express';
import { updateNINForVerification } from '../controllers/auth';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/',protect, updateNINForVerification);


export default router;
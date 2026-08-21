import { Router } from 'express'
import { proposePrice, retryAgreement } from '../controllers/negotiation'
import { protect} from '../middleware/auth'

const router = Router()

router.patch('/requests/:requestId/price', protect, proposePrice)
router.post('/requests/:requestId/agreement', protect, retryAgreement)

export default router

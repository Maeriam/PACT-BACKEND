import { Router } from 'express'

import {
    requestService,
    acceptJob,
    cancelJob,
} from '../controllers/job'
import { protect, restrictTo } from '../middleware/auth'

const router = Router()

// A client starts a service request using an artisan profile id.
router.post(
    '/artisans/:artisanId/requests',
    protect,
    restrictTo('client'),
    requestService
)

router.patch('/jobs/:jobId/accept', protect, restrictTo('artisan'), acceptJob)
router.patch('/jobs/:jobId/cancel', protect, cancelJob)

export default router

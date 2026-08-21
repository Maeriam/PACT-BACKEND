import { Router } from 'express'
import {
  getArtisans,
  filterArtisans,
  getArtisanProfile,
  getArtisanReviews
} from '../controllers/artisan'

import {
  protect,
  restrictTo,
} from '../middleware/auth'

const router = Router()

// Get all verified artisans
router.get(
  '/',
  protect,
  restrictTo('client'),
  getArtisans
)

// Filter verified artisans
router.get(
  '/filter',
  protect,
  restrictTo('client'),
  filterArtisans
)

router.get(
  '/:id',
  protect,
  restrictTo('client'),
  getArtisanProfile
)

// Get reviews for an artisan
router.get(
  '/:id/reviews',
  protect,
  restrictTo('client'),
  getArtisanReviews
)



export default router
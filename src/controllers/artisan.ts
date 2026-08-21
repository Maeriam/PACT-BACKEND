import { Request, Response } from 'express'
import ArtisanProfile from '../models/ArtisanProfile'
import { sendSuccess, sendError } from '../utils/response'
import { AuthRequest } from '../middleware/auth'
import mongoose from 'mongoose'
import Review from '../models/Review'

export const getArtisans = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const artisans = await ArtisanProfile.find({
      verificationStatus: 'verified',
    })
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage state city',
      })
      .sort({
        rating: -1,
        reviewCount: -1,
      })

    const formattedArtisans = artisans.map((artisan: any) => {
      const user = artisan.user

      return {
        id: artisan._id,

        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,

        services: artisan.services,
        experience: artisan.experience,

        bio: artisan.bio,

        startingPrice: artisan.startingPrice,

        rating: artisan.rating,
        reviewCount: artisan.reviewCount,
        completedJobs: artisan.completedJobs,

        state: user.state,
        city: user.city,

        verificationStatus: artisan.verificationStatus,
      }
    })

    return sendSuccess(
      res,
      {
        artisans: formattedArtisans,
        count: formattedArtisans.length,
      },
      'Artisans fetched successfully'
    )
  } catch (error) {
    console.error('Get artisans error:', error)

    return sendError(
      res,
      'Failed to fetch artisans',
      500
    )
  }
}

export const filterArtisans = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      search,
      service,
      state,
      city,
      minRating,
      minPrice,
      maxPrice,
      experience,
      sort,
    } = req.query

    // Build User filter
    const userFilter: any = {
      role: 'artisan',
    }

    if (state) {
      userFilter.state = {
        $regex: state,
        $options: 'i',
      }
    }

    if (city) {
      userFilter.city = {
        $regex: city,
        $options: 'i',
      }
    }

    // Search artisan name
    if (search) {
      userFilter.$or = [
        {
          firstName: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          lastName: {
            $regex: search,
            $options: 'i',
          },
        },
      ]
    }

    // Find matching users first
    const users = await mongoose.model('User').find(
      userFilter
    ).select('_id')

    const userIds = users.map((user) => user._id)

    // Build ArtisanProfile filter
    const artisanFilter: any = {
      user: {
        $in: userIds,
      },

      verificationStatus: 'verified',
    }

    // Service filter
    if (service) {
      artisanFilter.services = {
        $regex: service,
        $options: 'i',
      }
    }

    // Rating
    if (minRating) {
      artisanFilter.rating = {
        $gte: Number(minRating),
      }
    }

    // Price
    if (minPrice || maxPrice) {
      artisanFilter.startingPrice = {}

      if (minPrice) {
        artisanFilter.startingPrice.$gte = Number(minPrice)
      }

      if (maxPrice) {
        artisanFilter.startingPrice.$lte = Number(maxPrice)
      }
    }

    // Experience
    if (experience) {
      artisanFilter.experience = {
        $regex: experience,
        $options: 'i',
      }
    }

    // Sorting
    let sortOption: any = {
      rating: -1,
    }

    if (sort === 'price-low') {
      sortOption = {
        startingPrice: 1,
      }
    }

    if (sort === 'price-high') {
      sortOption = {
        startingPrice: -1,
      }
    }

    if (sort === 'rating') {
      sortOption = {
        rating: -1,
      }
    }

    if (sort === 'jobs') {
      sortOption = {
        completedJobs: -1,
      }
    }

    const artisans = await ArtisanProfile.find(
      artisanFilter
    )
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage state city',
      })
      .sort(sortOption)

    const formattedArtisans = artisans.map(
      (artisan: any) => {
        const user = artisan.user

        return {
          id: artisan._id,

          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage,

          services: artisan.services,
          experience: artisan.experience,
          bio: artisan.bio,

          startingPrice: artisan.startingPrice,

          rating: artisan.rating,
          reviewCount: artisan.reviewCount,
          completedJobs: artisan.completedJobs,

          state: user.state,
          city: user.city,

          verificationStatus:
            artisan.verificationStatus,
        }
      }
    )

    return sendSuccess(
      res,
      {
        artisans: formattedArtisans,
        count: formattedArtisans.length,
      },
      'Artisans filtered successfully'
    )
  } catch (error) {
    console.error('Filter artisans error:', error)

    return sendError(
      res,
      'Failed to filter artisans',
      500
    )
  }
}


export const getArtisanProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params


    const artisan = await ArtisanProfile.findOne({
      _id: id,
      verificationStatus: 'verified',
    }).populate({
      path: 'user',
      select: 'firstName lastName profileImage state city',
    })

    if (!artisan) {
      return sendError(
        res,
        'Artisan not found',
        404
      )
    }

    const user = artisan.user as any

    const profile = {
      id: artisan._id,

      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,

      services: artisan.services,

      experience: artisan.experience,

      education: artisan.education,

      trainingDetails: artisan.trainingDetails,

      bio: artisan.bio,

      startingPrice: artisan.startingPrice,

      rating: artisan.rating,

      reviewCount: artisan.reviewCount,

      completedJobs: artisan.completedJobs,

      state: user.state,
      city: user.city,

      verificationStatus:
        artisan.verificationStatus,
    }

    return sendSuccess(
      res,
      {
        profile,
      },
      'Artisan profile fetched successfully'
    )
  } catch (error) {
    console.error(
      'Get artisan profile error:',
      error
    )

    return sendError(
      res,
      'Failed to fetch artisan profile',
      500
    )
  }
}

export const getArtisanReviews = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params


    const reviews = await Review.find({
      artisan: id,
    })
      .populate({
        path: 'client',
        select: 'firstName lastName profileImage',
      })
      .sort({
        createdAt: -1,
      })

    const formattedReviews = reviews.map(
      (review: any) => {
        const client = review.client

        return {
          id: review._id,

          client: {
            id: client._id,
            firstName: client.firstName,
            lastName: client.lastName,
            profileImage: client.profileImage,
          },

          rating: review.rating,

          comment: review.comment,

          service: review.service,

          createdAt: review.createdAt,
        }
      }
    )

    return sendSuccess(
      res,
      {
        reviews: formattedReviews,
        count: formattedReviews.length,
      },
      'Artisan reviews fetched successfully'
    )
  } catch (error) {
    console.error(
      'Get artisan reviews error:',
      error
    )

    return sendError(
      res,
      'Failed to fetch artisan reviews',
      500
    )
  }
}
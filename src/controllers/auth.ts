import { Request, Response } from 'express'
import User from '../models/User'
import ArtisanProfile from '../models/ArtisanProfile'
import { sendSuccess, sendError } from '../utils/response'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken } from '../utils/jwt'
import { verifyAndUpdateNIN, verifyNIN } from '../utils/nin'
import { createNotification } from '../utils/notification'

export const signup = async (req: Request, res: Response) => {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            state,
            city,
        } = req.body

        const exists = await User.findOne({ email })

        if (exists) {
            return sendError(res, 'Email already exists', 400)
        }

        const hashed = await hashPassword(password)

        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashed,
            role: 'client',
            state,
            city,
        })

        const token = generateToken(
            user._id.toString(),
            user.role
        )

        const { password: _, ...userObj } = user.toObject()

        return sendSuccess(
            res,
            {
                user: userObj,
                token,
            },
            'Registered successfully',
            201
        )
    } catch (error) {
        console.error(error)

        return sendError(
            res,
            'Registration failed',
            500
        )
    }
}

export const signupartisan = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            state,
            city,

            services,
            experience,
            education,
            trainingDetails,
            bio,
            startingPrice,
            nin,
        } = req.body

        const exists = await User.findOne({ email })

        if (exists) {
            return sendError(
                res,
                'Email already exists',
                400
            )
        }

        if (!nin || !/^\d{11}$/.test(nin)) {
            return sendError(
                res,
                'Invalid NIN',
                400
            )
        }

        const hashedPassword =
            await hashPassword(password)

        // Create User
        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            role: 'artisan',
            state,
            city,
        })

        // Create ArtisanProfile immediately
        const artisanProfile =
            await ArtisanProfile.create({
                user: user._id,

                services: services || [],
                experience: experience || '',
                education: education || '',
                trainingDetails:
                    trainingDetails || '',
                bio: bio || '',
                startingPrice:
                    startingPrice || 0,

                nin,

                // Verification has not happened yet
                verificationStatus: 'pending',
            })

        const token = generateToken(
            user._id.toString(),
            user.role
        )

        const {
            password: _,
            ...userObj
        } = user.toObject()

        // Start verification in background
        verifyAndUpdateNIN(
            user._id.toString(),
            nin
        ).catch((error) => {
            console.error(
                'Background NIN verification failed:',
                error
            )
        })

        // Respond immediately
        return sendSuccess(
            res,
            {
                user: userObj,

                artisanProfile: {
                    ...artisanProfile.toObject(),

                    // Never return sensitive data
                    nin: undefined,
                },

                token,
            },
            'Registration successful. NIN verification is being processed.',
            201
        )
    } catch (error) {
        console.error(
            'Artisan signup error:',
            error
        )

        return sendError(
            res,
            'Registration failed',
            500
        )
    }
}

export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const { email, password } = req.body

        const user = await User
            .findOne({ email })
            .select('+password')

        if (!user) {
            return sendError(
                res,
                'Invalid credentials',
                401
            )
        }

        const isValid = await comparePassword(
            password,
            user.password
        )

        if (!isValid) {
            return sendError(
                res,
                'Invalid credentials',
                401
            )
        }

        const token = generateToken(
            user._id.toString(),
            user.role
        )

        const { password: _, ...userObj } = user.toObject()

        return sendSuccess(
            res,
            {
                user: userObj,
                token,
            },
            'Login successful'
        )
    } catch (error) {
        console.error(error)

        return sendError(
            res,
            'Login failed',
            500
        )
    }
}

export const getMe = async (
    req: any,
    res: Response
) => {
    try {
        const user = await User.findById(
            req.user.id
        )

        if (!user) {
            return sendError(
                res,
                'User not found',
                404
            )
        }

        const { password: _, ...userObj } = user.toObject()

        // If artisan, also return artisan profile
        if (user.role === 'artisan') {
            const artisanProfile =
                await ArtisanProfile.findOne({
                    user: user._id,
                })

            return sendSuccess(
                res,
                {
                    user: userObj,
                    artisanProfile,
                },
                'Profile retrieved'
            )
        }

        return sendSuccess(
            res,
            userObj,
            'Profile retrieved'
        )
    } catch (error) {
        console.error(error)

        return sendError(
            res,
            'Failed to get profile',
            500
        )
    }
}


export const updateNINForVerification = async (
    req: any,
    res: Response
) => {
    try {
        const userId = req.user?.id
        const { nin } = req.body

        // ----------------------------------
        // Validate authenticated user
        // ----------------------------------

        if (!userId) {
            return sendError(
                res,
                'Unauthorized',
                401
            )
        }

        // ----------------------------------
        // Validate NIN
        // ----------------------------------

        if (!nin || !/^\d{11}$/.test(nin)) {
            return sendError(
                res,
                'Invalid NIN. NIN must be exactly 11 digits.',
                400
            )
        }

        // ----------------------------------
        // Find artisan profile
        // ----------------------------------

        const artisanProfile =
            await ArtisanProfile.findOne({
                user: userId
            })

        if (!artisanProfile) {
            return sendError(
                res,
                'Artisan profile not found',
                404
            )
        }
        if(artisanProfile.verificationStatus === "verified"){
               return sendError(
                res,
                'Already Verified',
                403
            )
        }

        // ----------------------------------
        // Update NIN immediately
        // ----------------------------------

        artisanProfile.nin = nin
        artisanProfile.verificationStatus = 'pending'

        await artisanProfile.save()

        // ----------------------------------
        // Verify new NIN
        // ----------------------------------

        const result = await verifyNIN(nin)

        // ----------------------------------
        // VERIFICATION SUCCESS
        // ----------------------------------

        if (result.success && result.data) {

            artisanProfile.verificationStatus =
                'verified'

            artisanProfile.nin = result.data.nin


            await artisanProfile.save()

            await createNotification({
                user: userId,

                title:
                    'Identity Verification',

                message:
                    'Your identity has been successfully verified.',

                type:
                    'verification',

                data: {
                    verificationType: 'nin'
                }
            })

            return sendSuccess(
                res,
                {
                    verificationStatus:
                        'verified'
                },
                'NIN verified successfully',
                200
            )
        }

        // ----------------------------------
        // VERIFICATION FAILED
        // ----------------------------------

        artisanProfile.verificationStatus =
            'pending'

        await artisanProfile.save()

        await createNotification({
            user: userId,

            title:
                'Identity Verification',

            message:
                'Your NIN could not be verified. Please check your NIN and try again.',

            type:
                'verification',

            data: {
                verificationType: 'nin'
            }
        })

        return sendError(
            res,
            result.message ||
                'NIN verification failed',
            400
        )

    } catch (error) {

        console.error(
            'Update NIN verification error:',
            error
        )

        return sendError(
            res,
            'Failed to update NIN',
            500
        )
    }
}
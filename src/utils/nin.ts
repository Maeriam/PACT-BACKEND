import fetch from 'node-fetch'
import ArtisanProfile from '../models/ArtisanProfile'
import { createNotification } from './notification'
import dotenv from "dotenv";

// ==========================================
// NINJA CONFIG
// ==========================================

const NINJA_BASE_URL =
  process.env.NINJA_BASE_URL ||
  'https://api.sandbox.ninja.boucloud.io'

const NINJA_CLIENT_KEY = 'pk_f255ddff-41f3-424c-ba9e-5c97eac3b3dc';
const NINJA_CLIENT_SECRET = 'sk_56ae07c6-9676-4534-9ab9-11b44f86deea';


// ==========================================
// TYPES
// ==========================================

interface NinjaSessionResponse {
  expiry?: string
  token?: string
  message?: string
  error?: string
}

interface NinjaNINData {
  id_number?: string

  first_name?: string
  middle_name?: string
  last_name?: string

  date_of_birth?: string

  mobile?: string
  phone?: string

  email?: string

  gender?: string

  country?: string

  image?: string

  address_state?: string
  address_town?: string
  address_line?: string

  status?: string
}

interface NinjaNINResponse {
  status?: string

  data?: NinjaNINData

  message?: string
  error?: string
}

interface NINResponse {
  success: boolean

  data?: {
    nin: string
    firstName: string
    middleName?: string
    lastName: string
    dob: string
    phone: string
    email: string
    gender: string
    residenceCountry: string
    profileImage?: string

    address: {
      country: string
      state: string | null
      district: string
      address: string
    }
  }

  message?: string
}


// ==========================================
// GET NINJA SESSION TOKEN
// ==========================================

const getNinjaSessionToken =
  async (): Promise<string> => {

    if (
      !NINJA_CLIENT_KEY ||
      !NINJA_CLIENT_SECRET
    ) {
      throw new Error(
        'NINJA_CLIENT_KEY or NINJA_CLIENT_SECRET is missing'
      )
    }

    console.log(
      'Getting Ninja session token...'
    )

    const response = await fetch(
      `${NINJA_BASE_URL}/auth/session`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          client_key:
            NINJA_CLIENT_KEY,

          client_secret:
            NINJA_CLIENT_SECRET,
        }),
      }
    )

    const data =
      (await response.json()) as NinjaSessionResponse

    // Never print the actual token
    console.log(
      'Ninja session response:',
      JSON.stringify(
        {
          expiry: data.expiry,
          tokenReceived:
            Boolean(data.token),
        },
        null,
        2
      )
    )

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        `Ninja authentication failed (${response.status})`
      )
    }

    if (!data.token) {
      throw new Error(
        'Ninja did not return a session token'
      )
    }

    return data.token
  }


// ==========================================
// VERIFY NIN
// ==========================================

export const verifyNIN = async (
  ninNumber: string
): Promise<NINResponse> => {

  try {

    // --------------------------------------
    // Validate NIN
    // --------------------------------------

    if (
      !ninNumber ||
      !/^\d{11}$/.test(ninNumber)
    ) {
      return {
        success: false,

        message:
          'Invalid NIN format. NIN must be exactly 11 digits.',
      }
    }

    console.log(
      `Starting Ninja NIN verification`
    )

    // --------------------------------------
    // Get session token
    // --------------------------------------

    const token =
      await getNinjaSessionToken()

    // --------------------------------------
    // Verify NIN
    // --------------------------------------

    const response = await fetch(
      `${NINJA_BASE_URL}/api/identity/identify`,
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          idType: 'nin',

          mode: 'lookup',

          idNumber: ninNumber,
        }),
      }
    )

    const data =
      (await response.json()) as NinjaNINResponse

    // --------------------------------------
    // SAFE LOGGING
    // --------------------------------------

    console.log(
      'Ninja NIN Response:',
      JSON.stringify(
        {
          status: data.status,

          data: data.data
            ? {
              id_number:
                data.data.id_number,

              first_name:
                data.data.first_name,

              last_name:
                data.data.last_name,

              date_of_birth:
                data.data.date_of_birth,

              gender:
                data.data.gender,

              country:
                data.data.country,

              image:
                data.data.image
                  ? '[IMAGE PRESENT]'
                  : undefined,
            }
            : undefined,

          message:
            data.message,
        },
        null,
        2
      )
    )

    // --------------------------------------
    // HTTP ERROR
    // --------------------------------------

    if (!response.ok) {

      return {
        success: false,

        message:
          data.message ||
          data.error ||
          `NIN verification failed (${response.status})`,
      }
    }

    // --------------------------------------
    // NIN NOT FOUND
    // --------------------------------------

    if (
      data.status !== 'found' ||
      !data.data
    ) {

      return {
        success: false,

        message:
          'NIN was not found in the registry',
      }
    }

    const ninData =
      data.data

    // --------------------------------------
    // SUCCESS
    // --------------------------------------

    return {
      success: true,

      data: {

        nin:
          ninData.id_number ||
          ninNumber,

        firstName:
          ninData.first_name ||
          '',

        middleName:
          ninData.middle_name ||
          '',

        lastName:
          ninData.last_name ||
          '',

        dob:
          ninData.date_of_birth ||
          '',

        phone:
          ninData.mobile ||
          ninData.phone ||
          '',

        email:
          ninData.email ||
          '',

        gender:
          ninData.gender ||
          '',

        residenceCountry:
          ninData.country ||
          'Nigeria',

        profileImage:
          ninData.image ||
          '',

        address: {

          country:
            ninData.country ||
            'Nigeria',

          state:
            ninData.address_state ||
            null,

          district:
            ninData.address_town ||
            '',

          address:
            ninData.address_line ||
            '',
        },
      },
    }

  } catch (error) {

    console.error(
      'Ninja NIN verification error:',
      error
    )

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : 'NIN verification service error',
    }
  }
}


// ==========================================
// MOCK VERIFICATION
// ==========================================

export const mockVerifyNIN = async (
  ninNumber: string
): Promise<NINResponse> => {

  if (
    ninNumber.length === 11 &&
    /^\d+$/.test(ninNumber)
  ) {

    return {
      success: true,

      data: {

        nin: ninNumber,

        firstName: 'Josh',

        middleName: 'David',

        lastName: 'Coffey',

        dob: '1976-02-21',

        phone: '441172345678',

        email:
          'josh.coffey@example.com',

        gender: 'M',

        residenceCountry: 'GB',

        profileImage: '',

        address: {

          country: 'GB',

          state: null,

          district: 'Westminster',

          address:
            '45 High Street, Flat 2A',
        },
      },
    }
  }

  return {
    success: false,

    message:
      'Invalid NIN format (must be 11 digits)',
  }
}


// ==========================================
// VERIFY AND UPDATE DATABASE
// ==========================================

export const verifyAndUpdateNIN =
  async (
    userId: string,
    ninNumber: string
  ): Promise<void> => {

    try {

      console.log(
        `Starting NIN verification for user ${userId}`
      )

      // ------------------------------------
      // Verify with Ninja
      // ------------------------------------

      const result =
        await verifyNIN(ninNumber)

      // ------------------------------------
      // SUCCESS
      // ------------------------------------

      if (
        result.success &&
        result.data
      ) {

        await ArtisanProfile.findOneAndUpdate(
          { user: userId },

          {
            nin:
              result.data.nin,

            verificationStatus:
              'verified',
          },

          {
            new: true,
          }
        )

        await createNotification({
          user: userId,

          title:
            'Identity Verification',

          message:
            'Your identity has been successfully verified.',

          type:
            'verification',

          data: {
            verificationType:
              'nin',
          },
        })

        console.log(
          `NIN verified successfully for ${userId}`
        )

        return
      }

      // ------------------------------------
      // FAILED
      // ------------------------------------

      await ArtisanProfile.findOneAndUpdate(
        { user: userId },

        {
          verificationStatus:
            'unverified',
        }
      )

      await createNotification({
        user: userId,

        title:
          'Identity Verification',

        message:
          'Your identity could not be verified. Please check your NIN and try again.',

        type:
          'verification',

        data: {
          verificationType:
            'nin',
        },
      })

      console.log(
        `NIN verification failed for ${userId}:`,
        result.message
      )

    } catch (error) {

      console.error(
        `NIN verification error for ${userId}:`,
        error
      )

      // ------------------------------------
      // Keep profile pending if service fails
      // ------------------------------------

      await ArtisanProfile.findOneAndUpdate(
        { user: userId },

        {
          verificationStatus:
            'pending',
        }
      )
    }
  }
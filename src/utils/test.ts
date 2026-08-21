// test.ts

const NINJA_BASE_URL =
  'https://api.sandbox.ninja.boucloud.io';

const NINJA_CLIENT_KEY = 'pk_f255ddff-41f3-424c-ba9e-5c97eac3b3dc';
const NINJA_CLIENT_SECRET = 'sk_56ae07c6-9676-4534-9ab9-11b44f86deea';


// ==========================================
// 1. GET SESSION TOKEN
// ==========================================

async function getSessionToken(): Promise<string> {
  console.log('Getting Ninja session token...');

  const response = await fetch(
    `${NINJA_BASE_URL}/auth/session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_key: NINJA_CLIENT_KEY,
        client_secret: NINJA_CLIENT_SECRET,
      }),
    }
  );

  const data = await response.json();

  console.log(
    'Session response:',
    JSON.stringify(data, null, 2)
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get session token: ${response.status}`
    );
  }

  if (!data.token) {
    throw new Error('No session token returned');
  }

  return data.token;
}


// ==========================================
// 2. VERIFY / LOOKUP NIN
// ==========================================

async function verifyNIN(ninNumber: string) {
  try {
    const token = await getSessionToken();

    console.log('\nSession token received.');
    console.log(`Verifying NIN: ${ninNumber}`);

    const response = await fetch(
      `${NINJA_BASE_URL}/api/identity/identify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idType: 'nin',
          mode: 'lookup',
          idNumber: ninNumber,
        }),
      }
    );

    const data = await response.json();

    console.log('\n==============================');
    console.log('NINJA RESPONSE');
    console.log('==============================');

    console.log('HTTP Status:', response.status);

    console.log(
      JSON.stringify(data, null, 2)
    );

    if (!response.ok) {
      return {
        success: false,
        message: 'NIN verification request failed',
        error: data,
      };
    }

    if (data.status === 'found') {
      return {
        success: true,
        data: data.data,
      };
    }

    return {
      success: false,
      message: 'NIN not found',
      data: null,
    };

  } catch (error) {
    console.error(
      '\nNIN verification error:',
      error
    );

    return {
      success: false,
      message: 'NIN verification service error',
    };
  }
}


// ==========================================
// 3. TEST
// ==========================================

async function main() {

  // Ninja sandbox test NIN
  const ninNumber = '77777777779';

  const result = await verifyNIN(ninNumber);

  console.log('\n==============================');
  console.log('FINAL RESULT');
  console.log('==============================');

  console.log(
    JSON.stringify(result, null, 2)
  );
}

main();
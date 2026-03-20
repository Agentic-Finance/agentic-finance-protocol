/**
 * Passkey Authentication — Tempo Native WebAuthn (P256)
 *
 * Tempo natively supports P256 (WebAuthn) signatures in its custom
 * transaction type. This allows users to authenticate and sign
 * transactions via Face ID / Touch ID / Security Key instead of
 * browser wallet extensions like MetaMask.
 *
 * Flow:
 *   1. Register: User creates passkey → P256 public key stored
 *   2. Authenticate: User signs challenge → P256 signature verified
 *   3. Transaction: Tempo TX with P256 signature (no MetaMask needed)
 */

/** Check if WebAuthn passkeys are supported in this browser */
export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

/** Generate cryptographic challenge for registration/authentication */
export function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/** Convert Uint8Array to base64url string */
function toBase64Url(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** Register a new passkey credential (Face ID / Touch ID) */
export async function registerPasskey(params: {
  username: string;
  displayName: string;
  challenge?: Uint8Array;
}): Promise<{
  credentialId: string;
  publicKey: string;
  algorithm: number;
} | null> {
  if (!isPasskeySupported()) return null;

  const challenge = params.challenge || generateChallenge();

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge as BufferSource,
        rp: { name: 'Agentic Finance', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(params.username) as BufferSource,
          name: params.username,
          displayName: params.displayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256 (P-256) — Tempo native
          { alg: -257, type: 'public-key' },  // RS256 fallback
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential;

    if (!credential) return null;

    const response = credential.response as AuthenticatorAttestationResponse;
    const pubKey = response.getPublicKey?.();

    return {
      credentialId: toBase64Url(new Uint8Array(credential.rawId)),
      publicKey: pubKey ? toBase64Url(new Uint8Array(pubKey)) : '',
      algorithm: -7,
    };
  } catch (err) {
    console.error('[Passkey] Registration failed:', err);
    return null;
  }
}

/** Authenticate with existing passkey */
export async function authenticatePasskey(params?: {
  challenge?: Uint8Array;
}): Promise<{
  credentialId: string;
  signature: string;
  authenticatorData: string;
  clientDataJSON: string;
} | null> {
  if (!isPasskeySupported()) return null;

  const challenge = params?.challenge || generateChallenge();

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge as BufferSource,
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential;

    if (!assertion) return null;

    const response = assertion.response as AuthenticatorAssertionResponse;

    return {
      credentialId: toBase64Url(new Uint8Array(assertion.rawId)),
      signature: toBase64Url(new Uint8Array(response.signature)),
      authenticatorData: toBase64Url(new Uint8Array(response.authenticatorData)),
      clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
    };
  } catch (err) {
    console.error('[Passkey] Authentication failed:', err);
    return null;
  }
}

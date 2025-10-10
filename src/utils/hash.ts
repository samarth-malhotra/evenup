// src/utils/hash.ts
import * as Crypto from 'expo-crypto';

import { normalizePhoneToE164 } from '@/utils/phone';

export async function sha256Hex(input: string): Promise<string> {
  // console.log("input:", input);
  // server side should use same algorithm (hex lower-case)
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  return digest.toLowerCase();
}

export const encryptPhone = async (input: string) => {
  const normalised = normalizePhoneToE164(input);
  const hashed = await sha256Hex(normalised ?? '');
  return hashed;
};

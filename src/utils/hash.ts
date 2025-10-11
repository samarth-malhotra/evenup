// src/utils/hash.ts
import * as Crypto from 'expo-crypto';

export async function sha256Hex(input: string): Promise<string> {
  // console.log("input:", input);
  // server side should use same algorithm (hex lower-case)
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
  return digest.toLowerCase();
}

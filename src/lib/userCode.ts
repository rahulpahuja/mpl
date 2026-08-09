// Short codes handed out at onboarding (see ensureUserDoc in lib/auth.ts) so
// someone can be added as a team manager by ID instead of a name/email/phone
// search. Alphabet excludes 0/O and 1/I so codes are unambiguous when read
// aloud or handwritten.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateUserCode(): string {
  const randomValues = crypto.getRandomValues(new Uint32Array(CODE_LENGTH))
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomValues[i] % CODE_ALPHABET.length]
  }
  return code
}

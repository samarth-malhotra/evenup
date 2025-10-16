/** Structured error from RPC or Supabase */
export class SupaError extends Error {
  code?: string;
  constructor(message?: string, code?: string) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
  }
}

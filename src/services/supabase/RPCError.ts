/** Structured error from RPC or Supabase */
export class RPCError extends Error {
  code?: string;
  constructor(message?: string, code?: string) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
  }
}

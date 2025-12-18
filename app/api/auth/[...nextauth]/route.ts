import { handlers } from "@/lib/auth"

// Ensure this route uses Node.js runtime (not Edge) for nodemailer support
export const runtime = 'nodejs'

export const { GET, POST } = handlers

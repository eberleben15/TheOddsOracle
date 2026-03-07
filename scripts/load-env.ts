/**
 * Load environment variables before any other imports.
 * Must be imported first in scripts that use prisma.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Admin Utilities
 * 
 * Helper functions for admin-only access control
 */

import { auth } from "./auth";
import { prisma } from "./prisma";

/**
 * Check if current user is admin
 * Admin is determined by email matching ADMIN_EMAIL from environment
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  
  if (!session?.user?.email) {
    return false;
  }
  
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return false;
  }
  
  return session.user.email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Get admin email from environment or database
 */
export function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL || null;
}

/**
 * Verify user is admin, throw error if not
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Admin access required");
  }
}


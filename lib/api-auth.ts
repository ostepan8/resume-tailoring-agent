/**
 * Shared API Authentication Utilities
 * 
 * Provides consistent authentication and authorization helpers
 * for API routes that require user authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Create a server-side Supabase client with service role key
 * for verifying JWT tokens and performing admin operations.
 */
export function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                             process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extract and verify user ID from the Authorization header.
 * 
 * @param request - The Next.js request object
 * @returns User ID if authenticated, null otherwise
 * 
 * @example
 * ```typescript
 * const userId = await getUserFromRequest(request);
 * if (!userId) {
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 * ```
 */
export async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  try {
    const supabase = getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Helper to create a standardized 401 Unauthorized response.
 */
export function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Check if the request is authenticated and return user ID or error response.
 * 
 * @param request - The Next.js request object
 * @returns Object with userId if authenticated, or errorResponse if not
 * 
 * @example
 * ```typescript
 * const auth = await requireAuth(request);
 * if (auth.errorResponse) {
 *   return auth.errorResponse;
 * }
 * const userId = auth.userId;
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<{
  userId: string | null;
  errorResponse: NextResponse | null;
}> {
  const userId = await getUserFromRequest(request);
  
  if (!userId) {
    return {
      userId: null,
      errorResponse: unauthorizedResponse(),
    };
  }
  
  return {
    userId,
    errorResponse: null,
  };
}

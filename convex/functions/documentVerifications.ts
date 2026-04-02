import { v } from "convex/values";
import { query, internalMutation } from "../_generated/server";
import { authMutation } from "../lib/customFunctions";
import { internal } from "../_generated/api";

// ============================================================================
// PUBLIC QUERIES (for verification page)
// ============================================================================

/**
 * Verify a document by its token
 * Public query - no auth required
 */
export const verifyDocument = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const verification = await ctx.db
			.query("documentVerifications")
			.withIndex("by_token", (q) => q.eq("verificationToken", args.token))
			.unique();

		if (!verification) {
			return {
				valid: false,
				error: "Document non trouvé",
			};
		}

		// Check if revoked
		if (verification.isRevoked) {
			return {
				valid: false,
				error: "Ce document a été révoqué",
				revokedAt: verification.revokedAt,
				revokedReason: verification.revokedReason,
			};
		}

		// Check if expired
		if (verification.expiresAt && verification.expiresAt < Date.now()) {
			return {
				valid: false,
				error: "Ce document a expiré",
				expiredAt: verification.expiresAt,
			};
		}

		// Get org info for display
		const org = await ctx.db.get(verification.orgId);

		return {
			valid: true,
			verificationId: verification._id,
			document: {
				type: verification.documentType,
				title: verification.documentTitle,
				holderName: verification.holderName,
				generatedAt: verification.generatedAt,
				expiresAt: verification.expiresAt,
				verificationCount: verification.verificationCount,
			},
			issuer: {
				name: org?.name || "Consulat du Gabon",
			},
		};
	},
});

/**
 * Track verification (called after viewing)
 */
export const trackVerification = internalMutation({
	args: { verificationId: v.id("documentVerifications") },
	handler: async (ctx, args) => {
		const verification = await ctx.db.get(args.verificationId);
		if (!verification) return;

		await ctx.db.patch(args.verificationId, {
			verificationCount: verification.verificationCount + 1,
			lastVerifiedAt: Date.now(),
		});
	},
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const incrementVerificationCount = internalMutation({
	args: { verificationId: v.id("documentVerifications") },
	handler: async (ctx, args) => {
		const verification = await ctx.db.get(args.verificationId);
		if (!verification) return;

		await ctx.db.patch(args.verificationId, {
			verificationCount: verification.verificationCount + 1,
			lastVerifiedAt: Date.now(),
		});
	},
});

/**
 * Create a verification record when generating a document
 */
export const createVerification = internalMutation({
	args: {
		documentId: v.id("documents"),
		requestId: v.id("requests"),
		orgId: v.id("orgs"),
		documentType: v.string(),
		documentTitle: v.string(),
		holderName: v.string(),
		generatedBy: v.optional(v.id("users")),
		expiresAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Generate unique verification token
		const token = generateVerificationToken();

		const verificationId = await ctx.db.insert("documentVerifications", {
			...args,
			verificationToken: token,
			generatedAt: Date.now(),
			verificationCount: 0,
			isRevoked: false,
		});

		return { verificationId, token };
	},
});

// ============================================================================
// AUTHENTICATED MUTATIONS
// ============================================================================

/**
 * Revoke a document verification
 */
export const revokeDocument = authMutation({
	args: {
		verificationId: v.id("documentVerifications"),
		reason: v.string(),
	},
	handler: async (ctx, args) => {
		const verification = await ctx.db.get(args.verificationId);
		if (!verification) {
			throw new Error("Verification not found");
		}

		// Permission check: user must be a member of the issuing org
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org_deletedAt", (q: any) =>
				q.eq("userId", ctx.user._id).eq("orgId", verification.orgId).eq("deletedAt", undefined)
			)
			.unique();

		if (!membership) {
			throw new Error("You do not have permission to revoke this document");
		}

		await ctx.db.patch(args.verificationId, {
			isRevoked: true,
			revokedAt: Date.now(),
			revokedReason: args.reason,
		});

		return { success: true };
	},
});

// ============================================================================
// HELPERS
// ============================================================================

function generateVerificationToken(): string {
	// Cryptographically secure token using Web Crypto API
	return crypto.randomUUID();
}

/**
 * Generate verification URL
 */
export function getVerificationUrl(token: string): string {
	const baseUrl = process.env.APP_URL || "https://consulat.ga";
	return `${baseUrl}/verify/${token}`;
}

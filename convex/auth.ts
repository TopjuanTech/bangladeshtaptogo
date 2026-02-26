import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;
const trustedOrigins = Array.from(
  new Set([
    siteUrl,
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "http://localhost:3001",
    "https://localhost:3001",
    "https://taptaptogo.vercel.app",
    "https://taptogo-1iagzblam-topjuan-tech.vercel.app",
  ]),
);

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    hooks: {
      before: createAuthMiddleware(async (middlewareCtx) => {
        if (middlewareCtx.path !== "/sign-up/email") {
          return;
        }

        const existingUsers = await middlewareCtx.context.adapter.findMany({
          model: "user",
          limit: 1,
        });

        const hasUsers =
          Array.isArray(existingUsers) && existingUsers.length > 0;

        if (hasUsers) {
          throw new APIError("FORBIDDEN", {
            message: "Sign up is disabled. Please sign in.",
          });
        }
      }),
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

export const isSignUpEnabled = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: {
        cursor: null,
        numItems: 1,
      },
    });

    const hasUsers = Array.isArray((users as { page?: unknown[] }).page)
      ? ((users as { page: unknown[] }).page?.length ?? 0) > 0
      : Array.isArray(users)
        ? users.length > 0
        : false;

    return !hasUsers;
  },
});

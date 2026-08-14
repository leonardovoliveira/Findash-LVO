import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from "./db.js";

const monthInput = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2200).optional(),
});

export function getRange(month?: number, year?: number) {
  if (!month || !year) return {};
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  return { from, to };
}

const transactionInput = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().trim().min(1).max(180),
  amount: z.number().positive().max(999999999),
  category: z.string().trim().min(1).max(80),
  occurredAt: z.coerce.date(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  finance: router({
    list: protectedProcedure.input(monthInput).query(async ({ ctx, input }) => {
      const range = getRange(input.month, input.year);
      return listTransactions(ctx.user.id, range.from, range.to);
    }),
    create: protectedProcedure.input(transactionInput).mutation(({ ctx, input }) =>
      createTransaction({ ...input, userId: ctx.user.id, amount: input.amount.toFixed(2) })
    ),
    update: protectedProcedure.input(transactionInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return updateTransaction(id, ctx.user.id, { ...data, amount: data.amount.toFixed(2) });
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) =>
      deleteTransaction(input.id, ctx.user.id)
    ),
  }),
});

export type AppRouter = typeof appRouter;

import { pgTable, serial, varchar, text, timestamp, integer, uuid, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  walletAddress: varchar('wallet_address', { length: 44 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tokenIn: varchar('token_in', { length: 50 }).notNull(),
  tokenOut: varchar('token_out', { length: 50 }).notNull(),
  amountIn: numeric('amount_in', { precision: 20, scale: 9 }).notNull(),
  amountOut: numeric('amount_out', { precision: 20, scale: 9 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  selectedDex: varchar('selected_dex', { length: 20 }),
  txHash: varchar('tx_hash', { length: 100 }),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderStatus = 'pending' | 'waiting_for_price' | 'confirmed' | 'failed';

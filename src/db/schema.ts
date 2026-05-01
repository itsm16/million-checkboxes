import * as t from 'drizzle-orm/pg-core'
import { pgTable } from 'drizzle-orm/pg-core'

export const usersTable = pgTable("users", {
    id: t.uuid("id").primaryKey().defaultRandom(),

    firstName: t.varchar("first_name", {length: 50}),
    lastName: t.varchar("last_name", {length: 50}),

    profileImageUrl : t.varchar("profile_image_url"),

    email: t.varchar("email", {length: 322}).notNull(),
    emailVerified: t.boolean("email_verified").default(false).notNull(),

    password : t.varchar("password", {length: 66}),
    salt: t.text("salt"),

    createdAt: t.timestamp("created_at").defaultNow().notNull()

})
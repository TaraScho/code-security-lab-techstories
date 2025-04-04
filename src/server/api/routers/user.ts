import bcrypt from "bcrypt";
import { z } from "zod";
const tracer = require('dd-trace').init();

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // examples
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),

  getUsers: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany();
  }),

  getUsersPosts: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany({
      include: {
        posts: true,
      },
    });
  }),

  getUserById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: {
          id: input.id,
        },
        include: {
          posts: true,
          comments: true,
        },
      });
    }),

  createUser: publicProcedure
    .input(z.object({ name: z.string(), email: z.string(), password: z.string() }))
    .mutation(({ ctx, input }) => {
      const hashedPassword = bcrypt.hashSync(input.password, 10);
      
      // ASM - track user creation event
      const eventName = 'users.signup'
      const metadata = { 'usr.id': input.email }
      tracer.appsec.trackCustomEvent(eventName, metadata)
      
      return ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
        },
      });
    }),
});

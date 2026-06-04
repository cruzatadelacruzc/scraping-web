#!/bin/bash
# Ejecuta migraciones Prisma y genera el cliente
npx prisma migrate dev --name init_users
npx prisma generate

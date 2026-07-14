# Backend: Fix user findById + add GET /api/admin/users/:id

**PR separada del frontend. No mezclar con Phase 4.**

## Problema

`GET /api/admin/users/:id` falla con error Prisma porque `findUnique` no acepta `AND` en el `where` que le inyecta la extensión de tenant.

```
PrismaClientValidationError: Argument `where` of type UserWhereUniqueInput needs at least one of `id`, `username` or `email`
```

## Raíz

El `custom-prisma-client.ts` tiene una tenant extension que envuelve todas las queries `findUnique`/`findFirst`/`findMany` con:
```ts
where: { AND: [{ accountId: tenantId }, originalWhere] }
```

`findUnique` NO acepta `AND` — solo campos unique (`id`, `username`, `email`). `findFirst` SÍ acepta `AND`.

## Archivos a modificar

### 1. `src/main/users/repositories/user.repository.ts`

Líneas ~34 y ~61: cambiar `findUnique` → `findFirst`:

```diff
- return this._prisma.user.findUnique({ where: { id } });
+ return this._prisma.user.findFirst({ where: { id } });
```

**Verificar**: `findFirst` respeta la extensión de tenant (el `AND` con `accountId`). Para SUPER_ADMIN (sin tenant), el `accountId` es `undefined` y la extensión no filtra. Es seguro.

### 2. `src/main/admin/controllers/admin.controller.ts`

Agregar endpoint `GET /api/admin/users/:id`:

```ts
@httpGet('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
public async getUserById(@request() req: Request, @response() res: Response): Promise<void> {
  try {
    const user = await this._userService.getById(req.params.id);
    ResponseHandler.wrapOrNotFound(res, user);
  } catch (err) {
    this._log.error('Failed to get user by id', { error: err });
    ResponseHandler.error(res, 'Failed to get user');
  }
}
```

Requiere inyectar `UserService` en el constructor si no está ya.

### 3. (Opcional) Verificar `update` y `delete`

Los métodos `update()` y `delete()` en el mismo repository usan `findUnique` internamente para verificar existencia ANTES del update/delete. La tenant extension también los afecta. Si el admin usa `PUT/DELETE /api/admin/users/:id`, van a fallar igual. Solución: cambiar también esos `findUnique` → `findFirst` o quitar el pre-check.

## Verificación

```bash
# Probar el endpoint con un UUID real de la BD
curl http://localhost:3000/api/admin/users/<uuid> \
  -H "Authorization: Bearer <token>"

# Debe devolver 200 con el user o 404 si no existe
# NO debe devolver error 500 de Prisma

# Probar también
curl -X DELETE http://localhost:3000/api/admin/users/<uuid> \
  -H "Authorization: Bearer <token>"
```

## Commits

```
fix(backend): use findFirst instead of findUnique for tenant extension compatibility
feat(backend): add GET /api/admin/users/:id endpoint to AdminController
```

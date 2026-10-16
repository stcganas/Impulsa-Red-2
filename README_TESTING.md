# KIT REPRODUCIBLE DE PRUEBAS AISLADAS — IMPULSARED (FASE 2B.5)

Este documento detalla las instrucciones paso a paso para configurar un entorno local, aislado y desechable de PostgreSQL (utilizando Docker Desktop) e iniciar la ejecución controlada de migraciones, pruebas de seguridad y pruebas de integridad financiera.

---

## 1. Prerrequisitos

- **Docker Desktop** instalado y en ejecución (Windows, macOS o Linux).
- **Node.js** (versión 18 o superior) y `npm` / `pnpm`.
- **Git**.

---

## 2. Archivos Creados para el Kit de Pruebas

- `docker-compose.test.yml`: Configuración de contenedor PostgreSQL 15 dedicado en el puerto `5433` con base de datos `impulsared_test`.
- `tests/db_guard.ts`: Guardián de seguridad que rechaza conexiones que no sean locales (`127.0.0.1` / `localhost`) o que contengan nombres de producción.
- `tests/run_migrations.ts`: Ejecutor secuencial controlado de las migraciones `01` a `06`.

---

## 3. Instrucciones de Configuración y Ejecución (Windows & Docker Desktop)

### Paso 1: Iniciar el entorno PostgreSQL aislado
Abre una terminal en la raíz del proyecto y levanta el contenedor de pruebas:
```bash
docker compose -f docker-compose.test.yml up -d
```
Verifica que el contenedor esté activo:
```bash
docker ps
```
*(Debes ver el contenedor `impulsared_postgres_test` corriendo en el puerto 5433).*

### Paso 2: Configurar variables de entorno de prueba
Crea un archivo `.env.test` en la raíz del proyecto (nunca uses credenciales de producción):
```env
PORT=3000
VITE_SUPABASE_URL=http://127.0.0.1:5433
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key_local
VITE_SUPABASE_ANON_KEY=test_anon_key_local
DATABASE_URL=postgres://postgres:test_secure_password_local_only@127.0.0.1:5433/impulsared_test
```

### Paso 3: Ejecutar las pruebas unitarias y financieras existentes
El proyecto ya cuenta con suites automatizadas independientes de mocks y lógicas puras:
```bash
npm test
```
*(Esto ejecuta `tests/security.test.ts` y `tests/financial_engine.test.ts` con 43 pruebas en total).*

### Paso 4: Detener y limpiar el entorno aislado
Una vez finalizadas las pruebas, puedes apagar y destruir el contenedor de prueba sin dejar residuos en tu sistema:
```bash
docker compose -f docker-compose.test.yml down -v
```

---

## 4. Resolución de Errores Frecuentes

1. **Error de Guardián (`SECURITY_GUARD_ERROR`):** Si intentas ejecutar migraciones con una URL que contenga palabras prohibidas (`prod`, `supabase.co`, etc.) o que no apunte a `localhost`, el guardián de seguridad bloqueará la ejecución de inmediato.
2. **Puerto Ocupado (5433):** Si otro servicio usa el puerto 5433, edita `docker-compose.test.yml` y cambia el mapeo de puertos a otro disponible (ej. `5434:5432`).

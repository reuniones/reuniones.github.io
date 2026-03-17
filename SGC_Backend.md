# SGC: Especificación de la Interfaz del Backend

En la arquitectura modular del SGC, el Backend se define como un **Proveedor de Servicios** (Data Provider) que debe cumplir con un protocolo de comunicación estándar. Actúa como el motor de ejecución para un sistema modular con segmentación física de datos.

## 1. El Protocolo Backend (API Multi-ID)
Cualquier implementación de backend debe procesar las siguientes acciones, aceptando un identificador de base de datos (`ssId` en GSheets) para permitir la segmentación de datos:

-   **`batchGetData`**: Recuperación de múltiples tablas de un recurso específico en una sola petición.
-   **`saveData`**: Operación *upsert* (insertar o actualizar) en un recurso específico.
-   **`deleteData`**: Borrado físico o lógico de registros.
-   **`initSheet/initTable`**: Preparación estructural del recurso basado en el esquema.

### Seguridad del Recurso
El backend debe validar que el `ssId` solicitado sea un recurso autorizado por el Núcleo para evitar accesos a archivos externos no relacionados con el sistema.

## 2. Requerimientos Funcionales (Motor JSONata)
Para que el backend sea compatible con el SGC, debe integrar un motor de **JSONata** para ejecutar:
-   **Validaciones:** Reglas de integridad definidas en el esquema evaluadas antes de persistir.
-   **Sanitización de Segmentos:** Filtrado dinámico de campos para el **GSheet Público**, asegurando que los datos de invitación nunca contengan trazas de datos sensibles.

---

## 3. Implementación de Referencia: Google Apps Script (GAS)
El script `api.gs` es el plug-in de backend primario y utiliza Google Sheets como base de datos distribuida.

### Seguridad y Acceso
-   **Persistencia de API:** El frontend identifica el URL del GAS mediante el parámetro `api` en la URL y lo persiste localmente.
-   **Aislamiento:** El GAS gestiona el acceso a diferentes archivos de Google Sheets basándose en los IDs proporcionados por el Núcleo para el GSheet Core, el Público, el de Personas y los Operativos.

### Modelo de Seguridad (Zero-Knowledge)
-   **Cofre Criptográfico:** El backend almacena la **Master Key (MK)** cifrada con el **TOTP Secret** de cada usuario (`wrapped_mk`).
-   **Cifrado en Reposo:** El backend almacena y entrega bloques de texto cifrados con XXTEA sin conocer su contenido original.

## 4. Niveles de Autenticación
El proveedor de backend debe validar los factores de autenticación requeridos antes de emitir un `session_token`. El sistema soporta:

1.  **Autenticación Biométrica (Passkeys/WebAuthn):** Método primario para administradores. Requiere almacenamiento de la `Public Key` para validación de firmas.
2.  **TOTP (Time-based OTP):** Sincronización basada en tiempo (Google Authenticator).
3.  **OTP via Email:** Envío de códigos de respaldo vía Gmail (`MailApp`).

---

## 5. El Cofre Criptográfico y Passkeys
Cuando un usuario se autentica mediante **Passkey**, el backend valida el desafío y entrega la **Master Key cifrada** (`wrapped_mk`). 
-   El frontend descifra la MK localmente para mantener el modelo de **Conocimiento Cero**.
-   Se recomienda el uso del Keyring del sistema operativo para mantener las llaves de desbloqueo de forma persistente y segura.

---

## 6. Optimización: Sistema de Lotes y Caché
-   **Batching:** Agrupamiento de respuestas para minimizar latencia. Crucial para cargar el esquema y los datos públicos inicialmente.
-   **Capa de Caché:** Implementación de `CacheService` para acelerar lecturas masivas de datos públicos y configuraciones de plugins.

## 7. Logs y Auditoría
El backend es responsable de registrar en el GSheet Core:
-   Intentos de acceso fallidos y exitosos.
-   Cambios en la tabla maestra de Esquema.
-   Historial de operaciones de escritura en la tabla de Personas y configuraciones de Plugins.

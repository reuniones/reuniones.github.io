# SGC: Especificación Detallada del Backend

El backend del SGC utiliza una arquitectura **Serverless** basada en **Google Apps Script (GAS)** y **Google Sheets**, diseñada bajo principios de **Privacidad por Diseño** y **Conocimiento Cero (Zero-Knowledge)**.

## 1. Estrategia de Conexión Dinámica y Persistencia
-   **Primer Ingreso:** El usuario accede mediante una URL con parámetros (ej: `https://congregacion.github.io/?api=URL_GAS`).
-   **Persistencia de API:** El frontend guarda la URL de la API en `localStorage`.
-   **Protección de Infraestructura:** El ID de la hoja de cálculo se gestiona internamente en GAS vía `ScriptProperties`.

## 2. Modelo de Seguridad: El Cofre Criptográfico
El sistema utiliza un esquema de cifrado de doble capa para garantizar que los datos sensibles solo sean legibles por personas autorizadas.

### Capa A: La Master Key (MK)
-   Es una clave de alta entropía generada aleatoriamente al inicializar el sistema.
-   **Función:** Cifra todos los campos sensibles en la tabla `Personas` (teléfonos, correos, direcciones, comentarios).

### Capa B: Envoltura de Clave (Key Wrapping)
-   La **MK** no se guarda en texto plano. Se almacena en la tabla `Usuarios` una versión cifrada para cada editor.
-   **Clave de Envoltura:** Se utiliza el **TOTP Secret** (la semilla de 16-32 caracteres del autenticador) de cada usuario como llave para cifrar la MK.
-   **Resultado:** Google Sheets solo almacena "cofres cerrados". Para abrir el sistema, se necesita la "llave" que reside únicamente en el dispositivo móvil del editor (app de autenticación).

## 3. Niveles de Autenticación y Acceso

### Capa 1: Acceso Público (Modo Invitado)
-   **Seguridad:** El backend filtra las peticiones. Solo devuelve registros con `publicado: true`.
-   **Sanitización:** Se eliminan automáticamente todos los campos cifrados o marcados como privados antes de enviar el JSON al navegador.

### Capa 2: Acceso Administrativo (Cero Conocimiento)
1.  **Validación de Identidad:** El usuario ingresa su código TOTP de 6 dígitos. El backend lo valida contra el `totp_secret`.
2.  **Descarga del Cofre:** Si el código es válido, el backend envía al frontend la **MK cifrada** (específica para ese usuario).
3.  **Apertura Local:** El frontend solicita al usuario su `TOTP Secret` (o lo recupera de un almacenamiento seguro local) y descifra la **Master Key** en la memoria del navegador.
4.  **Acceso a Datos:** Con la MK ya disponible, el frontend puede descifrar y mostrar los datos privados de los hermanos.

---

## 4. Estructura de la Base de Datos (Seguridad)

### Hoja: `Usuarios`
| id | usuario | email | permisos (JSON) | totp_secret | wrapped_mk (MK cifrada con TOTP_Secret) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| u1 | admin_1 | `...` | `{"reuniones": "admin"}` | `JBSW...` | `U2FsdGVkX19v8...` |

### Hoja: `Personas` (Cifrado en Reposo con MK)
| id | nombre | email (Cifrado XXTEA) | telefono (Cifrado XXTEA) | ... |
| :--- | :--- | :--- | :--- | :--- |

---

## 5. Lógica del Lado del Servidor (`api.gs`)
-   **Independencia Criptográfica:** El script de Google no conoce la Master Key ni realiza el descifrado de datos personales. Actúa como un almacén de datos cifrados y un validador de factores de forma (OTP/TOTP).
-   **Gestión de Permisos:** Verifica que el `session_token` tenga el nivel de acceso requerido para cada operación de escritura.

## 7. Optimización de Lectura: Carga por Lotes (Batch)
Para minimizar la latencia de red y reducir el consumo de cuotas de Google Apps Script, el backend implementa una estrategia de carga masiva:

-   **Acción:** `batchGetData`.
-   **Funcionamiento:** El script recibe el parámetro `sheets` con una lista de nombres de hojas separadas por comas (ej: `?action=batchGetData&sheets=Personas,Plantillas,Salas`).
-   **Procesamiento:** 
    1.  Divide la cadena en un array de nombres.
    2.  Itera por cada hoja, consultando el **Sistema de Caché** primero y luego la hoja física si es necesario.
    3.  Construye un único objeto JSON donde cada clave es el nombre de la tabla y su valor es el array de registros.
-   **Beneficio Crítico:** Permite que la aplicación React obtenga todo el estado inicial del sistema en **una sola petición HTTP**, lo que acelera drásticamente el tiempo de carga inicial y mejora la experiencia en conexiones lentas.

## 8. Logs y Mantenimiento
-   **Logs de Acceso:** Registro de intentos de login y cambios críticos en la base de datos.
-   **Modo Mantenimiento:** Capacidad de bloquear accesos administrativos desde las `ScriptProperties` en caso de brecha de seguridad.

# SGC: Plug-in de Gestión de Usuarios

Este módulo es el responsable de la seguridad del sistema, gestionando quién puede acceder a las funciones administrativas y qué nivel de privilegios posee.

## 1. Manifiesto del Módulo
-   **ID:** `admin_usuarios`
-   **Sección:** `Administración`
-   **Icono:** `security`
-   **Dependencias:** `[]`
-   **Navegación:**
    -   `{ "nombre": "Usuarios", "icono": "shield_lock", "ruta": "/gestion", "publico": false }`
-   **Permisos:** `admin` (Solo Administrador Principal).
-   **Tablas Requeridas:** `Usuarios` (en el GSheet Core).

## 2. Estructura de Datos
Se basa en la tabla `Usuarios` definida en el [Backend](./SGC_Backend.md).
-   **wrapped_mk:** El "cofre" que contiene la Master Key del sistema.
-   **permisos:** JSON con la matriz de acceso por módulo.

## 3. Flujo de Trabajo (Workflow)
1.  **Alta de Usuario:** Se crea el perfil, se define el email y los permisos.
2.  **Activación de Seguridad:** 
    -   Generación de la **Clave Maestra (k)** para el enlace inicial.
    -   Configuración de la semilla **TOTP** (QR).
3.  **Gestión de Llaves:** Generación de un nuevo "Cofre" (`wrapped_mk`) para el usuario si es un editor nuevo.

## 4. Especificación de Interfaces
-   **Matriz de Permisos:** Interfaz visual de checkboxes para definir qué módulos puede ver o administrar cada usuario.
-   **Gestor de Tokens:** Generador de enlaces de invitación (`?api=...&k=...`).
-   **Monitor de Seguridad:** Listado de sesiones activas y últimos logs de acceso.

## 5. Reglas de Negocio (JSONata)
-   **Validación de Sesión:** `$session.permisos.admin_usuarios = 'admin'`

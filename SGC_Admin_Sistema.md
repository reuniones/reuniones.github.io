# SGC: Plug-in de Configuración del Sistema

Este módulo gestiona los ajustes globales del marco de trabajo y la administración del ecosistema de plug-ins.

## 1. Manifiesto del Módulo
-   **ID:** `admin_sistema`
-   **Sección:** `Administración`
-   **Icono:** `settings`
-   **Dependencias:** `[]`
-   **Navegación:**
    -   `{ "nombre": "Ajustes", "icono": "shield_lock", "ruta": "/configuracion", "publico": false }`
-   **Permisos:** `admin`.
-   **Tablas Requeridas:** `Sistema_Esquema`, `Registro_Plugins`.

## 2. Estructura de Datos
Se basa en la tabla maestra de **Esquemas** y el **Registro de Plug-ins** definidos en la [Arquitectura](./SGC_Arquitectura.md).

## 3. Flujo de Trabajo (Workflow)
1.  **Configuración Global:** Ajuste de nombres de la congregación, zona horaria y preferencias visuales.
2.  **Marketplace de Plug-ins:** Instalación y vinculación de nuevos módulos mediante el Spreadsheet ID.
3.  **Mantenimiento de Esquema:** Actualización de cabeceras en Google Sheets cuando el esquema cambia.

## 4. Especificación de Interfaces
-   **Panel de Plugins:** Lista de módulos instalados con opción de activar/desactivar y configurar su almacenamiento.
-   **Consola de Esquema:** Editor JSON para la tabla `Sistema_Esquema` (solo nivel experto).
-   **Ajustes Visuales:** Selector de colores corporativos y carga de logotipos SVG.

## 5. Reglas de Negocio (JSONata)
-   **Validación de Plug-in:** `$exists(registro_plugins[id = $nuevo_id]) = false`

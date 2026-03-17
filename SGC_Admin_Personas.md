# SGC: Plug-in de Gestión de Personas

Este plug-in permite administrar el censo maestro de la congregación y entidades relacionadas, integrando herramientas avanzadas de consulta y difusión.

## 1. Manifiesto del Módulo
-   **ID:** `admin_personas`
-   **Sección:** `Administración`
-   **Icono:** `groups`
-   **Dependencias:** `[]`
-   **Navegación:**
    -   `{ "nombre": "Personas", "icono": "shield_lock", "ruta": "/lista", "publico": false }`
-   **Permisos:** `admin` (Gestión total).
-   **Tablas Requeridas:** `Personas` (en el GSheet de Personas del Núcleo).

## 2. Estructura de Datos
Se basa estrictamente en la especificación de la [Base de Datos de Personas](./SGC_Personas.md).

## 3. Flujo de Trabajo (Workflow)
1.  **Consulta:** El administrador localiza individuos mediante búsqueda global o filtrado dinámico.
2.  **Edición:** Se actualizan los bloques de Identidad, Contacto o Servicio. Los campos sensibles se cifran automáticamente.
3.  **Difusión/Reporte:** Se generan listas para uso externo mediante las herramientas de exportación.

## 4. Especificación de Interfaces

### A. Tabla Maestra y Filtrado
-   **Filtros Rápidos:** Botones para estados comunes (ej: "Solo Ancianos", "Grupo 3").
-   **Filtro por Metadatos:** Selector dinámico de etiquetas en la bolsa de metadatos.
-   **Consultas JSONata:** Consola para consultas complejas sobre la base de datos.

### B. Herramientas de Exportación
-   **Formatos:** PDF (Reporte profesional), XLSX (Excel), CSV, JSON.
-   **Mensajería:** Compartir por **WhatsApp** con formato enriquecido (*negritas*, bloques de código).
-   **Seguridad:** Antes de exportar, se valida el descifrado de datos sensibles (requiere Master Key).

### C. Ficha de Edición (Drawer Lateral)
-   Organización por pestañas: Identidad, Contacto, Servicio y Metadatos.
-   **Indicadores visuales:** Iconos de candado en campos cifrados XXTEA.
-   **Inputs Inteligentes:** Componentes de etiquetas removibles para servicios y metadatos.

## 5. Reglas de Negocio (JSONata)
-   **Consulta de Candidatos:** Expresiones dinámicas para nutrir otros módulos (ej: Reuniones).

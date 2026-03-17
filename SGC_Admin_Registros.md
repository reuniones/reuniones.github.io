# SGC: Plug-in de Registros e Informes

Este módulo gestiona el historial de actividad de los publicadores y la recolección mensual de informes de predicación.

## 1. Manifiesto del Módulo
-   **ID:** `admin_registros`
-   **Sección:** `Administración`
-   **Icono:** `assignment`
-   **Dependencias:** `[]`
-   **Navegación:**
    -   `{ "nombre": "Registros de publicador", "icono": "shield_lock", "ruta": "/fichas", "publico": false }`
    -   `{ "nombre": "Informes de predicación", "icono": "shield_lock", "ruta": "/informes", "publico": false }`
-   **Permisos:** `admin` (Secretario), `editor` (Superintendentes de Grupo).
-   **Tablas Requeridas:** `Registros_Historicos`, `Informes_Mensuales`.

## 2. Estructura de Datos (Esquema)

### Informe Mensual
~~~json
{
    "id": "inf_2026_03_e1",
    "personaId": "e1",
    "mes": "2026-03",
    "participo": true,
    "estudios": 1,
    "auxiliar": false,
    "notas": "..."
}
~~~

## 3. Flujo de Trabajo (Workflow)

### A. Carga de Informes (Superintendentes)
Los responsables de grupo acceden a una interfaz filtrada solo para sus publicadores y cargan los datos del mes actual.

### B. Consolidación (Secretario)
El administrador general supervisa la recepción de informes y genera las tarjetas de registro históricas.

## 4. Especificación de Interfaces

### A. Interfaz de Informes
-   Lista rápida de publicadores por grupo con checkboxes y campos numéricos de entrada rápida.
-   Indicador visual de informes pendientes vs. recibidos.

### B. Gestión de Registros
-   Vista de la "Tarjeta de Registro de Publicador" (S-21) digitalizada con el historial de los últimos años.

## 5. Reglas de Negocio (JSONata)
-   **Resumen de Grupo:** `$sum(informes[grupoId = $id].estudios)`

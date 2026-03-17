# SGC: Gestión de Mapas y Territorios

Este submódulo define la geografía del territorio de la congregación utilizando el estándar GeoJSON y gestiona la visualización pública del estado de las zonas.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_mapas`
-   **Sección:** `Predicación`
-   **Icono:** `map`
-   **Interfaz Pública ("Territorios"):**
    -   Organizada en **Pestañas**:
        1.  `Mapa`: Visor interactivo GeoJSON con mapa de calor.
        2.  `Territorios`: Lista tabular de territorios y su estado de antigüedad.
-   **Interfaz Administrativa ("Gestión"):**
    -   Organizada en **Pestañas**:
        1.  `Territorios`: Control de inventario y asignaciones (ver [Asignaciones](./SGC_Predicacion_Asignaciones.md)).
        2.  `Mapas`: Editor de polígonos GeoJSON y límites.
        3.  `Puntos de Encuentro`: Gestión de ubicaciones para el programa de casa en casa.
-   **Permisos:** 
    -   `admin`: Acceso a la pestaña de Gestión completa.
    -   `view`: Acceso a la sección de Territorios pública.
-   **Tablas Requeridas:** `Mapa_Poligonos`, `Mapa_Puntos` (en el GSheet Operativo de Predicación).

## 2. Estructura de Datos (Esquema)

### Polígonos de Manzanas (GeoJSON)
~~~json
{
    "type": "Feature",
    "id": "22a",
    "properties": {
        "t": "22", "m": "a", "label": "22a"
    },
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[long, lat], ...]]
    }
}
~~~

### Puntos de Encuentro (GeoJSON)
~~~json
{
    "type": "Feature",
    "id": "point_01",
    "properties": {
        "nombre": "Punto A",
        "direccion": "Calle Falsa 123"
    },
    "geometry": { "type": "Point", "coordinates": [long, lat] }
}
~~~

## 3. Flujo de Trabajo (Workflow)

### A. Gestión Geográfica (Administrativo)
1.  **Definición:** El administrador dibuja o importa manzanas en formato GeoJSON.
2.  **Identificación:** Se vinculan las manzanas a un número de territorio.
3.  **Mantenimiento:** Actualización de puntos de encuentro para el programa de casa en casa.

### B. Consulta de Estado
El sistema cruza el mapa con el [Sistema de Asignaciones](./SGC_Predicacion_Asignaciones.md) para generar el **Mapa de Calor** automático basado en antigüedad.

## 4. Especificación de Interfaces

### A. Interfaz Privada (Administración)
-   **Editor GeoJSON:** Herramienta visual para modificar límites de territorios sobre un mapa base.
-   **Gestor de Puntos:** Mapa para situar y nombrar los puntos de reunión de los grupos.

### B. Interfaz Pública (Invitados)
Permite dos modos de visualización para consultar el estado del territorio:
1.  **Vista de Mapa:** Visor interactivo con polígonos coloreados por antigüedad. Al tocar un territorio, se muestra su número y si está disponible.
2.  **Vista de Lista:** Listado tabular de todos los territorios indicando su número, zona y estado de antigüedad.

## 5. Reglas de Negocio (JSONata)

### Cálculo de Color (Mapa de Calor)
`$antiguedad < 4 ? 'verde' : ($antiguedad < 8 ? 'amarillo' : 'rojo')`
*(Lógica visual para el renderizado del mapa).*

### Sanitización Pública
`features.{ "type": type, "id": id, "geometry": geometry, "properties": { "label": properties.label } }`
*(Omitir cualquier metadato administrativo interno en la exportación al mapa público).*

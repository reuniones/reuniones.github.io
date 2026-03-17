# SGC: Plug-in de Territorios

Este plug-in es el núcleo de gestión del sistema de territorios. Administra el inventario de mapas, el flujo de asignaciones estilo biblioteca y la definición geográfica multinivel.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_territorios`
-   **Sección:** `Predicación`
-   **Icono:** `map`
-   **Navegación:**
    -   `{ "nombre": "Territorios", "icono": "public", "ruta": "/visor", "publico": true }`
    -   `{ "nombre": "Administrar territorios", "icono": "shield_lock", "ruta": "/inventario", "publico": false }`
    -   `{ "nombre": "Ajustes de territorios", "icono": "shield_lock", "ruta": "/config", "publico": false }`
-   **Permisos:** 
    -   `admin`: Gestión de asignaciones y configuración técnica de mapas.
    -   `view`: Consulta pública de estados y mapas.
-   **Tablas Requeridas:** `Territorios_Maestro`, `Territorios_Asignaciones`, `Mapa_Poligonos`, `Mapa_Puntos`, `Grupos_Predicacion`.

## 2. Estructura de Datos (Esquema)

### Ficha de Territorio (`Territorios_Maestro`)
~~~json
{
    "id": "22",
    "nombre": "Barrio Norte",
    "grupoId": "g1",
    "tipo": "Urbano",
    "limites": "Zanni, Basavilbaso, Mihura, Tibiletti",
    "manzanas": 5,
    "ultimaDevolucion": "2026-01-10"
}
~~~

### Soporte Geográfico (GeoJSON Multinivel)

#### Polígonos de Grupos
~~~json
{
    "type": "Feature",
    "id": "g1",
    "properties": { "g": "1" },
    "geometry": { "type": "Polygon", "coordinates": [...] }
}
~~~

#### Polígonos de Territorios
~~~json
{
    "type": "Feature",
    "id": "22",
    "properties": { "t": "22", "label": "22" },
    "geometry": { "type": "Polygon", "coordinates": [...] }
}
~~~

#### Polígonos de Manzanas
~~~json
{
    "type": "Feature",
    "id": "22a",
    "properties": { "t": "22", "m": "a", "label": "22a" },
    "geometry": { "type": "Polygon", "coordinates": [...] }
}
~~~

### Registro de Asignación (Historial)
~~~json
{
    "id": "asig_001",
    "territorioId": "22",
    "personaId": "e1",
    "fechaAsignacion": "2026-01-10",
    "fechaDevolucion": "2026-03-05",
    "observaciones": "completado"
}
~~~

## 3. Flujo de Trabajo (Workflow)

### A. Sistema de Asignaciones (Biblioteca)
1.  **Asignación:** Se selecciona un territorio disponible y se asigna a un publicador. El sistema registra la salida y genera la **Tarjeta de Territorio Virtual**.
2.  **Devolución:** Se registra la fecha de retorno y el resultado del trabajo. El territorio vuelve al inventario y se actualiza la fecha de `ultimaDevolucion` para el mapa de calor.

### B. Gestión Geográfica (Ajustes)
-   Definición técnica de límites de grupos, polígonos de territorios y detalle de manzanas.
-   Ubicación de puntos de encuentro GeoJSON.

## 4. Especificación de Interfaces

### A. Interfaz Pública ("Territorios")
-   **Pestaña Mapa:** Visor interactivo con mapa de calor de antigüedad.
-   **Pestaña Territorios:** Listado de búsqueda con enlace a las **Tarjetas de Territorio** (Imagen/PDF/Enlace).

### B. Interfaz Administrativa ("Administrar territorios")
-   **Panel de Inventario:** Gestión de préstamos activos y devoluciones rápidas.
-   **Monitor de Asignaciones:** Historial detallado por territorio y por persona.

### C. Interfaz Técnica ("Ajustes de territorios")
-   **Administrar territorios:** Interfaz de ABM para las fichas maestras de territorio.
-   **Editor GeoJSON:** Herramienta visual para dibujar y editar polígonos sobre el mapa.
-   **Configuración de Grupos:** ABM de grupos de predicación y sus áreas geográficas.
-   **Mapa de Puntos:** Gestión de puntos de encuentro.

## 5. Reglas de Negocio (JSONata)

### Cálculo de Antigüedad (Color del Mapa)
`$now() - $toMillis(ultimaDevolucion)`
*(Prioriza visualmente los territorios que llevan más tiempo sin completarse).*

### Sanitización para Invitados
`Territorios_Maestro.{ "id": id, "nombre": nombre, "tipo": tipo, "limites": limites, "estado": estado }`
*(Omitir cualquier rastro de la identidad del poseedor actual).*

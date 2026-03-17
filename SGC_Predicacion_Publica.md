# SGC: Predicación Pública

Este plug-in gestiona la actividad con exhibidores (carritos) en puntos fijos, permitiendo organizar turnos de voluntarios y difundir las ubicaciones a la congregación.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_publica`
-   **Sección:** `Predicación`
-   **Icono:** `menu_book`
-   **Dependencias:** `[]`
-   **Navegación:**
    -   `{ "nombre": "Pública", "icono": "public", "ruta": "/programa", "publico": true }`
    -   `{ "nombre": "Administrar predicación pública", "icono": "shield_lock", "ruta": "/admin", "publico": false }`
-   **Permisos:** 
    -   `admin`: Gestión de ubicaciones, turnos y asignación de voluntarios.
    -   `view`: Consulta de ubicaciones y horarios vigentes.
-   **Tablas Requeridas:** `Publica_Ubicaciones`, `Publica_Turnos`.

## 2. Estructura de Datos (Esquema)

### Ubicación de Exhibidor
~~~json
{
    "id": "loc_001",
    "nombre": "Plaza Central",
    "direccion": "Av. San Martín y Rivadavia",
    "coordenadas": [long, lat],
    "activa": true
}
~~~

### Registro de Turno
~~~json
{
    "id": "turno_001",
    "ubicacionId": "loc_001",
    "fecha": "2026-03-20",
    "horaInicio": "09:00",
    "horaFin": "11:00",
    "voluntarios": ["e1", "e5"],
    "publicado": true
}
~~~

## 3. Flujo de Trabajo (Workflow)

### A. Confección del Programa (Administrativo)
1.  **Definición de Puntos:** El administrador registra los lugares autorizados para los carritos.
2.  **Creación de Slots:** Se definen los días y franjas horarias disponibles para cada ubicación.
3.  **Asignación de Voluntarios:** El sistema filtra automáticamente a las personas que posean la etiqueta de **"Predicación Pública"** en sus metadatos (`filtrosReuniones` o etiquetas de servicio según se configure).
4.  **Publicación:** Los turnos se hacen visibles para la congregación.

### B. Consulta Pública
- Los hermanos pueden ver dónde y en qué horarios habrá exhibidores durante la semana.

## 4. Especificación de Interfaces

### A. Interfaz Pública (Invitados)
-   **Visor de Turnos:** Lista organizada por día y ubicación.
-   **Mapa de Ubicaciones:** Mapa interactivo que muestra los puntos donde hay actividad de carritos esa semana.
-   **Navegación:** Enlace directo a Google Maps para llegar a la ubicación del exhibidor.
-   **Herramientas de Difusión:** Botón para descargar o enviar el programa de la semana (Imagen/PDF/WhatsApp).

### B. Interfaz Privada (Administrar)
-   **Gestor de Ubicaciones:** ABM de puntos de predicación con mapa integrado.
-   **Panel de Turnos:** Calendario administrativo para asignar voluntarios a cada franja horaria mediante drag & drop o selectores.

## 5. Reglas de Negocio (JSONata)

### Filtro de Sanitización Pública
`$ { "fecha": fecha, "hora": horaInicio & " - " & horaFin, "lugar": ubicacionId }`
*(Muestra el cronograma sin revelar la identidad de los voluntarios al público).*

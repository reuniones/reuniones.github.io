# SGC: Predicación de Casa en Casa

Este plug-in gestiona la organización de la actividad grupal mediante programas de vigencia flexible y sugerencias basadas en el historial de trabajo.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_casa_casa`
-   **Sección:** `Predicación`
-   **Icono:** `house`
-   **Dependencias:** `["predicacion_territorios"]`
-   **Navegación:**
    -   `{ "nombre": "De casa en casa", "icono": "public", "ruta": "/programa", "publico": true }`
    -   `{ "nombre": "Administrar de casa en casa", "icono": "shield_lock", "ruta": "/admin", "publico": false }`
-   **Permisos:** 
    -   `admin`: Acceso a la interfaz de confección y publicación.
    -   `view`: Acceso a la vista pública del programa vigente.
-   **Tablas Requeridas:** `Programa_Casa_Casa`.

## 2. Estructura de Datos (Esquema)

### Registro de Programa
~~~json
{
    "id": "prog_cc_001",
    "nombre": "Campaña de Verano",
    "fechaInicioPublicacion": "2026-03-01",
    "fechaFinPublicacion": "2026-03-31",
    "publicado": true,
    "salidas": [
        {
            "id": "s1",
            "dia": "Sábado",
            "fecha": "2026-03-07",
            "hora": "09:30",
            "responsableId": "e1",
            "tipoResponsable": "conductor",
            "puntoEncuentroId": "point_01",
            "territorios": ["22", "23"]
        }
    ]
}
~~~
- **Vigencia:** Define el periodo en que el programa es visible para los invitados.
- **Salidas:** Lista dinámica de actividades dentro del periodo.

## 3. Flujo de Trabajo (Workflow)

### A. Confección del Programa (Administrativo)
1.  **Instanciación:** El administrador crea un programa definiendo su rango de vigencia (semanal, mensual o especial).
2.  **Sugerencia Inteligente:** El sistema propone **Puntos de Encuentro** (por rotación) y **Territorios** (por antigüedad y frecuencia).
3.  **Armado:** Se definen los responsables, horarios y zonas de trabajo.
4.  **Publicación:** Al marcarse como publicado, el programa se sincroniza con la base de datos pública.
5.  **Historial:** Los programas cuya fecha de fin ha expirado se mantienen como registro histórico administrativo.

### B. Consulta Pública
- El sistema identifica automáticamente el programa vigente según la fecha actual y lo presenta a la congregación.

## 4. Especificación de Interfaces

### A. Interfaz Pública (Invitados)
-   **Calendario:** Lista cronológica de salidas con iconos descriptivos.
-   **Enlaces Inteligentes:**
    -   El Punto de Encuentro abre directamente la **App de Mapeo** (Google Maps).
    -   Botón para ver el **Plano General** con las zonas de la semana resaltadas.
    -   Enlaces para abrir las **Tarjetas Individuales** de los territorios.
-   **Herramientas de Difusión (Botón Compartir):** Permite difundir el programa vigente mediante:
    -   **Descarga Local:** Opciones de formato **Imagen (PNG)** o **Documento (PDF)**.
    -   **WhatsApp:** Envío directo de la Imagen, el PDF o un **Resumen de Texto** con formato enriquecido (`*negritas*`, lista de viñetas).
    -   **Compartir Sistema:** Utiliza la API nativa de "Share" del dispositivo para enviar el programa (Imagen/PDF/Texto) a cualquier aplicación compatible.

### B. Interfaz Privada (Administrar)
-   **Hub de Gestión:** Lista de programas (Borradores, Vigentes, Históricos).
-   **Editor de Salidas:** Interfaz para añadir y configurar cada salida con el apoyo del motor de sugerencias.

## 5. Reglas de Negocio (JSONata)

### Filtro de Sanitización Pública
`$ { "nombre": nombre, "salidas": salidas.{ "dia": dia, "fecha": fecha, "hora": hora, "punto": puntoEncuentroId, "territorios": territorios } }`
*(Elimina IDs de personas y metadatos internos antes de enviar al modo invitado).*

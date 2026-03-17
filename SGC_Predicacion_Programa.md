# SGC: Programa de Predicación de Casa en Casa

Este módulo gestiona la organización semanal de la actividad grupal de la congregación, integrando la geolocalización de puntos de encuentro y territorios.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_casa_en_casa`
-   **Sección:** `Predicación`
-   **Icono:** `house`
-   **Submenús:**
    -   `{ "nombre": "Confección", "icono": "edit_calendar", "ruta": "/confeccion" }`
    -   `{ "nombre": "Programa Público", "icono": "visibility", "ruta": "/programa" }`
-   **Permisos:** 
    -   `admin`: Confección y publicación del programa.
    -   `view`: Acceso a la vista pública.
-   **Tablas Requeridas:** `Programa_Casa_Casa`, `Puntos_Encuentro` (en el GSheet Operativo de Predicación).

## 2. Estructura de Datos (Esquema)

### Registro de Programa (Vigencia Dinámica)
~~~json
{
    "id": "prog_cc_2026_03_15",
    "nombre": "Campaña de Marzo",
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
- **Vigencia:** Define cuándo el programa es visible para el público.
- **Flexibilidad:** Permite crear programas para una semana, un mes o periodos específicos.

## 3. Flujo de Trabajo (Workflow)

### A. Confección del Programa (Administrativo)
1.  **Instanciación:** El administrador crea un programa y define su **rango de vigencia**.
2.  **Sugerencia Inteligente:** El sistema propone Puntos de Encuentro y Territorios basándose en el historial completo de programas anteriores.
3.  **Armado:** Se añaden tantas salidas como sean necesarias para cubrir el periodo de vigencia.
4.  **Publicación:** Se marca como publicado. El sistema solo mostrará al público el programa cuya fecha actual esté dentro del rango de vigencia.
5.  **Registro Histórico:** Los programas cuya fecha de fin ha expirado se mueven automáticamente a la sección de "Historial" en el panel administrativo.

### B. Consulta Pública
La congregación accede al programa vigente, visualiza las ubicaciones exactas y descarga las tarjetas de territorio necesarias.

## 4. Especificación de Interfaces

### A. Interfaz Privada (Administración)
-   **Calendario de Armado:** Interfaz de arrastrar y soltar para organizar las salidas.
-   **Selector de Territorios:** Mapa interactivo integrado para elegir las zonas de trabajo de cada salida.
-   **Botón de Sincronización:** Para enviar el programa a la vista de invitados.

### B. Interfaz Pública (Invitados)
-   **Vista Semanal:** Lista cronológica de salidas.
-   **Enlaces Inteligentes:**
    -   **Punto de Encuentro:** Enlace que abre la app de mapeo (Google Maps).
    -   **Visualización:** Botones para abrir el "Plano General" (zonas resaltadas) o "Tarjetas Individuales" de los territorios asignados.

## 5. Reglas de Negocio (JSONata)

### Filtro de Sanitización Pública
`$ { "dia": dia, "hora": hora, "punto": puntoEncuentroId, "territorios": territorios }`
*(Omitir IDs internos y datos de contacto de responsables en la vista de invitados).*

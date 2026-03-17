# SGC: Módulo de Reuniones

Este módulo permite confeccionar programas semanales a partir de un sistema de plantillas jerárquicas y herramientas de asignación inteligente.

## Funcionamiento Conceptual
El sistema utiliza una estructura de **herencia de plantillas**:
1.  **Semanas** que contienen IDs de **Reuniones**.
2.  **Reuniones** que contienen IDs de **Secciones**.
3.  **Secciones** que contienen IDs de **Partes**.

**Flujo de Trabajo:**
- El usuario define plantillas jerárquicas (estructuras JSON puras).
- Para crear un programa real, se "instancia" una plantilla en una fecha específica.
- Se realizan ajustes estructurales ad-hoc (renombrar, mover, añadir partes).
- Se asignan personas utilizando el motor de sugerencias inteligentes.
- Se publica el programa (visibilidad pública y trazabilidad de fechas).

---

## Interfaz de Usuario Detallada

### 1. Sección: Programa
- **Propósito:** Vista de consulta para el público general.
- **Funcionalidad:** Muestra los programas marcados como `publicado: true`. Permite filtrar por mes y descargar/imprimir el programa.

### 2. Sección: Confección (Workflow Administrativo)
Diseñada como un flujo de trabajo intuitivo dividido en tres fases críticas:

#### Fase 1: Hub de Semanas (Vista de Calendario)
-   **Interfaz:** Cuadrícula o lista vertical de "Tarjetas de Semana".
-   **Visualización:** Cada tarjeta muestra el rango de fechas, un badge de estado (Gris: Sin programa, Amarillo: Borrador, Verde: Publicado) y un resumen rápido.
-   **Implementación:** Componente de "Infinite Scroll" para navegación por meses. Botones de acción primaria: "Crear borrador" o "Continuar editando".

#### Fase 2: Editor Estructural (Blueprint)
-   **Interfaz:** Vista de árbol o lista anidada (Reunión > Sección > Parte).
-   **Interacción:** 
    *   **Drag & Drop:** Reordenar secciones y partes arrastrándolas.
    *   **Edición Inline:** Clic en el nombre de una parte o sección para renombrarla inmediatamente.
    *   **Inserción Dinámica:** Botones "+" entre partes para insertar nuevas desde un catálogo de plantillas.
-   **Persistencia:** Guardado automático. Los cambios estructurales **no borran** las asignaciones ya hechas si el ID de la parte persiste.

#### Fase 3: Panel de Asignación Inteligente
-   **Interfaz:** Diseño de pantalla dividida o Panel Lateral (Drawer). A la izquierda la estructura del programa; a la derecha, la lista de candidatos al seleccionar una vacante.
-   **Tarjetas de Candidato:** Ricas en información (Badge de tiempo, micro-gráficos de frecuencia, historial rápido).
-   **Asignación Automática:** 
    *   **Botón "Varita Mágica":** Rellena todas las partes con `asignarAutomatico: true` evitando conflictos.
    *   **Botón "Ciclar":** Cambia la sugerencia actual por la siguiente mejor opción.

### 3. Sección: Ajustes
-   **Interfaz:** Organizada por **pestañas** (Semanas, Reuniones, Secciones, Partes).
-   **Tablas de Gestión:** Listado de plantillas con botones de edición, duplicación y borrado.
-   **Diálogos de Edición:** Formularios con **etiquetas removibles** para selección múltiple.
-   **Gestión Jerárquica:** Permite añadir subplantillas y cambiarles el orden mediante Drag & Drop.

### 4. Sección: Discursos Públicos (Submódulo)
-   **Agenda de Discursos:** Tabla cronológica organizada por semanas.
-   **Directorio de Oradores Externos:** Gestión de contactos de oradores visitantes.
-   **Registro Histórico Global:** Base de datos para evitar repeticiones de temas.
-   **Sincronización:** Importación de datos del orador y tema al programa semanal con un clic.

---

## Estructuras de Plantilla (JSON)

### 1. Plantilla de Semana
~~~json
{
    "id": "s1",
    "semana": "Normal",
    "fechaInicio": "", 
    "fechaFin": "",
    "reuniones": ["r1", "r2"]
}
~~~
- **id:** Identificador único de la plantilla de semana.
- **semana:** Nombre descriptivo de la plantilla (ej: "Normal", "Visita", "Asamblea").
- **fechaInicio** y **fechaFin:** Placeholders para definir el rango de fechas que abarca un programa real.
- **reuniones:** Lista ordenada de IDs de las plantillas de reunión que incluye.

### 2. Plantilla de Reunión
~~~json
{
    "id": "r1",
    "reunion": "Reunión de entre semana",
    "secciones": ["c1", "c2", "c3"]
}
~~~
- **id:** Identificador único de la plantilla de reunión.
- **reunion:** Nombre de la reunión.
- **secciones:** Lista ordenada de IDs de las plantillas de sección que incluye.

### 3. Plantilla de Sección
~~~json
{
    "id": "c1",
    "seccion": "Tesoros de la Biblia",
    "mostrarEncabezado": true,
    "color": "#cccccc",
    "partes": ["p1", "p2", "p3"]
}
~~~
- **id:** Identificador único de la plantilla de sección.
- **seccion:** Nombre de la sección (ej: "Tesoros", "Apliquémonos").
- **mostrarEncabezado:** Booleano que define si se muestra el título de la sección en el programa final.
- **color:** Color identificativo para la interfaz (opcional).
- **partes:** Lista ordenada de IDs de las plantillas de parte que incluye.

### 4. Plantilla de Parte (Roles Dinámicos)
~~~json
{
    "id": "p1",
    "parte": "Lectura de la Biblia",
    "descripcion": "Lectura semanal",
    "asignarAutomatico": true,
    "salas": ["a1", "a2"],
    "roles": [
        {
            "id": "r_principal",
            "etiqueta": "Participante",
            "cantidad": 1,
            "filtros": ["f1"]
        },
        {
            "id": "r_ayudante",
            "etiqueta": "Ayudante",
            "cantidad": 1,
            "filtros": ["f2"]
        }
    ]
}
~~~
- **id:** Identificador único de la plantilla de parte.
- **parte:** Nombre de la parte.
- **descripcion:** Breve explicación técnica para diferenciar partes similares.
- **asignarAutomatico:** Habilita el motor de sugerencias e integración con discursos.
- **salas:** IDs de las salas donde se presenta la parte.
- **roles:** Array de estructuras de asignación vinculadas. Cada rol define:
    - **id:** Identificador único del rol (ej: `r_lector`, `r_ayudante`).
    - **etiqueta:** Nombre visible (ej: "Lector", "Segundo Estudiante").
    - **cantidad:** Número de personas necesarias para este rol.
    - **filtros:** Etiquetas de `filtrosReuniones` necesarias para validar candidatos.

---

## Programa Generado (Output)
El objeto de programa generado incluye metadatos para controlar su visibilidad y trazabilidad:
- **publicado:** Booleano de visibilidad pública.
- **fechaCreacion**, **fechaModificacion**, **fechaPublicacion:** Timestamps ISO 8601 del ciclo de vida del programa.
- **Asignaciones:** Organizadas por sala y rol, utilizando siempre **arrays de IDs**.

### Ejemplo de programa semanal generado
~~~json
{
    "id": "prog-2026-03-01",
    "semana": "Normal",
    "fechaInicio": "01/03/2026",
    "fechaFin": "07/03/2026",
    "publicado": true,
    "fechaCreacion": "2026-02-15T10:00:00Z",
    "fechaModificacion": "2026-02-28T18:30:00Z",
    "fechaPublicacion": "2026-02-28T18:35:00Z",
    "reuniones": [
        {
            "id": "r1",
            "reunion": "Reunión de entre semana",
            "secciones": [
                {
                    "id": "c1",
                    "seccion": "Tesoros de la Biblia",
                    "mostrarEncabezado": true,
                    "color": "#cccccc",
                    "partes": [
                        {
                            "id": "p1",
                            "parte": "Lectura de la Biblia",
                            "asignarAutomatico": true,
                            "salas": [
                                {
                                    "id": "a1",
                                    "asignaciones": {
                                        "r_principal": ["e1"],
                                        "r_ayudante": ["e3"]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
~~~

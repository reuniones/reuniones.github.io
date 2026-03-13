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
-   **Visualización:** Cada tarjeta muestra el rango de fechas, un badge de estado (Gris: Sin programa, Amarillo: Borrador, Verde: Publicado) y un resumen rápido (ej: "Plantilla: Normal - 4/12 asignados").
-   **Implementación:** Componente de "Infinite Scroll" para navegación por meses. Botones de acción primaria: "Crear borrador" o "Continuar editando".

#### Fase 2: Editor Estructural (Blueprint)
-   **Interfaz:** Vista de árbol o lista anidada (Reunión > Sección > Parte).
-   **Interacción:** 
    *   **Drag & Drop:** Reordenar secciones y partes arrastrándolas (usando `dnd-kit` o similar).
    *   **Edición Inline:** Clic en el nombre de una parte o sección para renombrarla inmediatamente.
    *   **Inserción Dinámica:** Botones "+" entre partes para insertar nuevas desde un catálogo de plantillas.
-   **Persistencia:** Guardado automático. Los cambios estructurales **no borran** las asignaciones ya hechas si el ID de la parte persiste.

#### Fase 3: Panel de Asignación Inteligente
-   **Interfaz:** Diseño de pantalla dividida o Panel Lateral (Drawer). A la izquierda la estructura del programa; a la derecha, la lista de candidatos al seleccionar una vacante.
-   **Tarjetas de Candidato:** Ricas en información:
    *   **Badge de Tiempo:** "Hace 45 días" (Verde: >30 días, Amarillo: 15-30, Rojo: <15).
    *   **Mini-Gráfico:** Indicador visual de la frecuencia anual de asignaciones.
    *   **Historial Rápido:** Texto pequeño indicando "Última vez: Discurso (con Juan P.)".
-   **Asignación Automática:** 
    *   **Botón "Varita Mágica":** Rellena todas las partes con `asignarAutomatico: true` evitando conflictos de doble asignación en la misma reunión.
    *   **Botón "Ciclar":** Icono de refresh al lado de cada nombre asignado automáticamente para cambiar al siguiente candidato sugerido por el algoritmo de prioridad.

### 3. Sección: Ajustes
-   **Interfaz:** Organizada por **pestañas** (Semanas, Reuniones, Secciones, Partes).
-   **Tablas de Gestión:** Listado de plantillas con botones de edición, duplicación y borrado.
-   **Diálogos de Edición:** Formularios que utilizan componentes de **etiquetas removibles** para selección múltiple (filtros, salas, servicios).
-   **Gestión Jerárquica:** Permite añadir subplantillas a una estructura superior y cambiarles el orden mediante Drag & Drop.

### 4. Sección: Discursos Públicos (Submódulo)
-   **Agenda de Discursos:** Tabla cronológica organizada por semanas. Filtros por **Mes**, **Tipo** (Entrante/Saliente) y **Estado** (Confirmado/Pendiente).
-   **Directorio de Oradores Externos:** Gestión de contactos de oradores de otras congregaciones para reutilización.
-   **Registro Histórico Global:** Base de datos de discursos presentados en la congregación (fecha, orador, tema) para validación automática contra repeticiones.
-   **Sincronización:** Si una parte es "Discurso Público", aparece un indicador para importar los datos (orador y tema) del arreglo definido en esta sección con un solo clic.

---

## Estructuras de Plantilla (JSON)

### 1. Plantilla de Semana
~~~json
{
    "id": "s1",
    "semana": "Normal",
    "fechaInicio": "", "fechaFin": "",
    "reuniones": ["r1", "r2"]
}
~~~
- **reuniones:** Lista ordenada de IDs de las reuniones que incluye.

### 2. Plantilla de Reunión
~~~json
{
    "id": "r1",
    "reunion": "Reunión de entre semana",
    "secciones": ["c1", "c2", "c3"]
}
~~~

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

### 4. Plantilla de Parte
~~~json
{
    "id": "p1",
    "parte": "Lectura de la Biblia",
    "descripcion": "Lectura semanal",
    "participantes": 1,
    "filtros": ["f1"],
    "ayudante": true,
    "filtrosAyudante": ["f2"],
    "lector": false,
    "filtrosLector": [],
    "asignarAutomatico": true,
    "salas": ["a1", "a2"]
}
~~~
- **filtros:** Etiquetas de `filtrosReuniones` (en metadatos de Persona) para validar candidatos.
- **asignarAutomatico:** Habilita el motor de sugerencias y la integración con el submódulo de discursos.

---

## Programa Generado (Output)
~~~json
{
    "id": "prog-2026-03-01",
    "semana": "Normal",
    "publicado": true,
    "fechaCreacion": "2026-02-15T10:00:00Z",
    "fechaModificacion": "2026-02-28T18:30:00Z",
    "fechaPublicacion": "2026-02-28T18:35:00Z",
    "reuniones": [
        {
            "id": "r1",
            "reunion": "Reunión de fin de semana",
            "secciones": [
                {
                    "id": "c1",
                    "seccion": "Discurso Público",
                    "partes": [
                        {
                            "id": "p1",
                            "parte": "Discurso Público",
                            "asignarAutomatico": true,
                            "salas": [
                                {
                                    "id": "a1",
                                    "asignado": ["e1"],
                                    "tema": "...",
                                    "numero": 15,
                                    "externo": true
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

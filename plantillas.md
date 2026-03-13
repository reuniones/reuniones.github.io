# Sistema de Gestión de Congregación (SGC)

Este sistema modular permite la gestión integral de una congregación, dividiéndose en tres áreas principales que comparten una base de datos común de personas.

## Estructura Modular
El sistema se compone de los siguientes módulos:

1.  **Módulo de Reuniones:** Gestión de programas semanales mediante un sistema de plantillas dinámicas.
2.  **Módulo de Predicación:** Actividad de evangelización (Desarrollo futuro).
3.  **Módulo de Salón del Reino:** Gestión de instalaciones (Desarrollo futuro).

## Tecnologías e Interfaz
El sistema se ha diseñado con un enfoque moderno, accesible y de alto rendimiento:

-   **Despliegue:** El front-end se aloja en **GitHub Pages**.
-   **Estilo:** Se utiliza **Tailwind CSS** implementando los lineamientos estéticos de **Material Design**.
-   **Iconografía:** Se emplean **Material Icons** para una interfaz intuitiva.
-   **Adaptabilidad:** Diseño **Responsive** (Mobile First) optimizado para desktop, tablets y smartphones.
-   **Tematización:** Soporte nativo para **Modo Oscuro** y **Modo Claro**, respetando la preferencia del sistema del usuario o permitiendo el cambio manual.

## Base de Datos Compartida: Personas
Todos los módulos utilizan una base de datos única de personas para las asignaciones.

### Estructura de Persona
~~~json
{
    "id": "e1",
    "nombre": "Juan",
    "apellido": "Perez",
    "genero": "H",
    "email": "juan.perez@email.com",
    "fechaNacimiento": "1990-05-15",
    "fechaBautismo": "2010-06-20",
    "telefonoCelular": "+54 9 11 1234-5678",
    "telefonoFijo": "011 4321-8765",
    "direccion": "Calle Falsa 123, Ciudad",
    "grupoPredicacion": "Grupo 3",
    "servicio": ["s1", "s2"],
    "metadatos": [
        { "clave": "filtrosReuniones", "valor": ["f1", "f2"] },
        { "clave": "discursosPreparados", "valor": [1, 5, 22, 110] },
        { "clave": "idiomas", "valor": ["Español", "Inglés"] },
        { "clave": "habilidades", "valor": ["Piano", "Canto"] }
    ],
    "comentarios": [
        {
            "fecha": "2026-01-10",
            "texto": "Ejemplo: No asignar partes de lectura por problemas visuales temporales."
        }
    ]
}
~~~
- **id:** Identificador único de la persona.
- **nombre** y **apellido:** Datos de identidad.
- **genero:** Género ("H" para hombre, "M" para mujer). Fundamental para el filtrado automático de roles específicos.
- **email:** Correo electrónico para notificaciones.
- **fechaNacimiento:** Fecha en formato ISO 8601 (AAAA-MM-DD).
- **fechaBautismo:** Fecha de bautismo en formato ISO 8601 (opcional).
- **telefonoCelular** y **telefonoFijo:** Números de contacto.
- **direccion:** Domicilio de la persona.
- **grupoPredicacion:** Identificador o nombre del grupo de servicio al que pertenece.
- **servicio:** Array de etiquetas que definen el nombramiento, categoría o estado (ej: "Publicador", "Anciano", "Bautizado", "Activo").
- **metadatos:** Bolsa de campos flexible para información adicional.
    - **filtrosReuniones:** Etiquetas de habilidades específicas (ej: "Estudiantil", "Enseñanza").
    - **discursosPreparados:** (Dentro de metadatos) Array con los números de bosquejo de discursos públicos que el orador local tiene preparados.
- **comentarios:** Historial de observaciones sobre la persona, cada uno con su fecha y texto.

---

# Especificación del Módulo de Reuniones

El sistema permite confeccionar reuniones semanales a partir de plantillas predefinidas.

### Funcionamiento Conceptual
El usuario define plantillas jerárquicas: **Semanas** que contienen **Reuniones**, las cuales contienen **Secciones**, que a su vez contienen **Partes**. Las plantillas son estructuras JSON puras.

Para crear un programa real, el usuario aplica una plantilla a una semana específica, la modifica según los requerimientos puntuales de esa semana y completa asignando personas a las partes. Una vez completado, el programa se publica. Es posible modificar la estructura y las asignaciones de un programa publicado en cualquier momento.

## Interfaz del Módulo
La interfaz se organiza en tres secciones principales:

1.  **Programa:** Vista pública y de consulta para programas marcados como `publicado`.
2.  **Confección:** Panel de gestión administrativa diseñado como un flujo de trabajo (workflow) intuitivo:
    -   **Fase 1: Hub de Semanas (Vista de Calendario):** Vista de tarjetas por semana que indica el rango de fechas, estado (Sin programa, Borrador, Publicado) y botones para Crear, Editar o Borrar. Sugerencia: Usar "Infinite Scroll" para navegar por meses.
    -   **Fase 2: Editor Estructural (Blueprint):** Vista de árbol (Reunión > Sección > Parte) con capacidad de **Drag & Drop** para reordenar, **Edición Inline** de nombres e inserción dinámica de nuevas partes. Modificar la estructura no borra las asignaciones existentes.
    -   **Fase 3: Panel de Asignación Inteligente:** Pantalla dividida con panel lateral de candidatos. Muestra historial de participación, frecuencia, tipos de partes previas y último ayudante.
        -   **Sincronización de Discursos:** Si una parte tiene la etiqueta o nombre de "Discurso Público" y `asignarAutomatico: true`, el sistema importará automáticamente el orador, tema y número del Submódulo de Discursos Públicos para esa semana.
        -   **Validación de Repetición:** El sistema alertará si el discurso sugerido o seleccionado se ha presentado recientemente en la congregación según el **Registro Histórico Global**.
        -   **Asignación Automática:** Botón de "Varita Mágica" para completar partes automáticas y botón de "Ciclar" para cambiar sugerencias.
3.  **Ajustes:** Área de configuración técnica organizada por **pestañas** (Semanas, Reuniones, Secciones, Partes).
    -   Cada pestaña muestra una tabla con acciones de edición/borrado.
    -   **Diálogos de Edición:** Usan componentes de etiquetas removibles para selección múltiple.
    -   **Gestión Jerárquica:** Permite añadir subplantillas y cambiarles el orden mediante Drag & Drop.
4.  **Discursos Públicos:** Submódulo para la gestión de la agenda de discursos. Permite registrar oradores visitantes (entrantes) y las visitas de nuestros oradores a otras congregaciones (salientes).

## Submódulo de Discursos Públicos

Este submódulo centraliza la información de los discursos para cada semana. Al confeccionar el programa semanal, el sistema consulta automáticamente estos arreglos para completar las partes correspondientes al Discurso Público.

### Interfaz de Usuario Sugerida
-   **Agenda de Discursos:** Una tabla cronológica organizada por semanas que permite filtrar por **Mes**, **Tipo** (Entrante/Saliente) y **Estado** (Confirmado/Pendiente).
-   **Directorio de Oradores Externos:** Datos de contacto de oradores de otras congregaciones para reutilizarlos en futuras visitas.
-   **Registro Histórico de la Congregación:** Base de datos que almacena qué discursos se han presentado en nuestra congregación, por qué orador y en qué fecha. Se utiliza para evitar repetir el mismo tema en un periodo corto de tiempo.

### Estructura de un Arreglo de Discurso
~~~json
{
    "id": "d1",
    "semanaId": "prog-2026-03-01",
    "tipo": "entrante",
    "orador": {
        "nombre": "Pedro Gomez",
        "congregacion": "Congregación Central",
        "telefono": "123456789"
    },
    "tema": "El Reino de Dios está cerca",
    "numero": 15,
    "confirmado": true
}
~~~

## Estructuras de Plantilla

#### 1. Plantilla de Semana
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
- **semana:** Nombre descriptivo de la plantilla (ej: "Normal", "Visita").
- **fechaInicio** y **fechaFin:** Placeholders para definir el rango de fechas que abarca un programa real.
- **reuniones:** Lista ordenada de IDs de las plantillas de reunión que incluye.

#### 2. Plantilla de Reunión
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

#### 3. Plantilla de Sección
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
- **mostrarEncabezado:** Define si se muestra el título de la sección en el programa final.
- **color:** Color identificativo para la interfaz (opcional).
- **partes:** Lista ordenada de IDs de las plantillas de parte que incluye.

#### 4. Plantilla de Parte (Roles y Filtros)
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
- **id:** Identificador único de la plantilla de parte.
- **parte:** Nombre de la parte.
- **descripcion:** Breve explicación técnica para diferenciar partes similares.
- **participantes:** Cantidad de personas principales a asignar (por defecto 1).
- **filtros:** Etiquetas de `filtrosReuniones` necesarias para el participante principal.
- **ayudante:** Indica si la parte requiere asignar un ayudante.
- **filtrosAyudante:** Etiquetas de `filtrosReuniones` para el ayudante.
- **lector:** Indica si la parte requiere asignar un lector.
- **filtrosLector:** Etiquetas de `filtrosReuniones` para el lector.
- **asignarAutomatico:** Si está activado, el sistema sugiere candidatos evitando conflictos. Si la parte es de "Discurso Público", importará automáticamente los datos del Submódulo de Discursos.
- **salas:** IDs de las salas donde se presenta la parte (ej: ["a1", "a2"]). Al confeccionar el programa, se transformará en un array de objetos con las asignaciones reales.

## Confección de programas (Programa Generado)
El objeto de programa generado incluye metadatos para controlar su visibilidad y trazabilidad:
- **publicado:** Booleano de visibilidad pública.
- **fechaCreacion**, **fechaModificacion**, **fechaPublicacion:** Timestamps ISO 8601 del ciclo de vida del programa.

### Ejemplo de programa semanal generado
Aquí el usuario selecciona una plantilla de semana `s1` y asigna personas a diferentes partes. Las asignaciones (`asignado`, `ayudante`, `lector`) son siempre **arrays de IDs**.
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
            "reunion": "Reunión de fin de semana",
            "secciones": [
                {
                    "id": "c1",
                    "seccion": "Discurso Público",
                    "mostrarEncabezado": true,
                    "color": "#cccccc",
                    "partes": [
                        {
                            "id": "p1",
                            "parte": "Discurso Público",
                            "asignarAutomatico": true,
                            "salas": [
                                {
                                    "id": "a1",
                                    "asignado": ["e1"],
                                    "tema": "El Reino de Dios está cerca",
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

---

## Definiciones Globales

### Filtros
~~~json
{ 
    "id": "f1", 
    "filtro": "Enseñanza", 
    "color": "#cccccc" 
}
~~~
- **id:** Identificador único del filtro.
- **filtro:** Nombre de la etiqueta (ej: "Enseñanza", "Lectura").
- **color:** Color identificativo en la interfaz.

### Salas
~~~json
{ 
    "id": "a1", 
    "nombre": "Sala principal", 
    "color": "#cccccc" 
}
~~~
- **id:** Identificador único de la sala.
- **nombre:** Nombre de la sala (ej: "Sala Principal", "Sala B").
- **color:** Color identificativo en la interfaz.

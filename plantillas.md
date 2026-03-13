# Sistema de plantillas y confección de programas de reuniones
El sistema permite confeccionar reuniones semanales de los testigos de Jehová a partir de plantillas predefinidas. 
### Funcionamiento
El usuario definirá plantillas para las semanas, con sus correspondientes reuniones, secciones y partes. Luego aplicará una plantilla para una semana, la modificará de acuerdo a los requerimientos de esa semana y completará asignando personas a las partes. Una vez completada, podrá publicar el programa. Si fuera necesario, podrá modificar las partes y asignaciones de un programa cuando necesite.
Las plantillas se tratan de estructuras JSON. Habrá plantillas de semanas, que contendrán plantillas de reuniones, que contendrán plantillas de secciones, que contendrán plantillas de partes.
## Plantillas de semanas
Contendrán el formato de reuniones para una semana.
### Ejemplo
~~~
{
    "id": "s1",
    "semana": "Normal",
    "fechaInicio": "",
    "fechaFin": "",
    "reuniones": ["r1","r2"]
}
~~~
- En este caso, se define una plantilla de semana con el id `s1` y el nombre `Normal`. 
- `fechaInicio` y `fechaFin` son placeholders para definir las fechas de inicio y fin que abarca un programa. 
- En `reuniones` se definen las plantillas de reunión que incluye, en el orden que van.

## Plantillas de reuniones
Contendrán el formato de reuniones que puede contener una semana.

### Ejemplo
~~~
{
    "id": "r1",
    "reunion": "Reunión de entre semana",
    "secciones": ["c1","c2","c3"]
}
~~~
- En este caso, se define una plantilla de reunión con el id `r1` y el nombre `Reunión de entre semana`. 
- En `secciones` se definen las plantillas de sección que incluye, en el orden que van.

## Plantillas de secciones
Contendrán el formato de secciones que puede contener una reunión.

### Ejemplo
~~~
{
    "id": "c1",
    "seccion": "Tesoros de la Biblia",
    "mostrarEncabezado": true,
    "color": "#cccccc"
    "partes": ["p1","p2","p3"]
}
~~~
- En este caso, se define una plantilla de sección con el id `c1` y el nombre `Tesoros de la Biblia`. 
- En `mostrarEncabezado` se define si en la vista de programa se va a mostrar el encabezado de la sección. 
- En `color` se define un color para identificar la sección en el renderizado final. Es opcional.
- En `partes` se definen las plantillas de parte que incluye, en el orden que van.

## Plantillas de parte
Contendrán el formato de partes que puede contener una sección.

### Ejemplo
~~~
{
    "id": "p1",
    "parte": "Discurso",
    "descripcion": "Discurso de tesoros de la Biblia"
    "participantes": 1,
    "ayudante": false
    "lector": false
    "filtros": ["f1", "f2"]
    "salas": ["a1","a2"]
}
~~~
- En este caso, se define una plantilla de parte con el id `p1` y el nombre `Discurso`. 
- En `descripcion` se describe brevemente la parte para que el usario no se confunda partes con nombres similares.
- En `participantes` se define cuántas personas se pueden asignar a la parte. Por defecto `1`. 
- En `ayudante` se define si será necesario asignar una persona como ayudante, para las partes que lo requieran. Por defecto `false`.
- En `lector` se define si será necesario asignar una persona como lector, para las partes con lectura. Por defecto `false`
- En `filtros` se definen las etiquetas que filtrarán las personas que pueden ser asignadas a esta parte. 
- En `salas` se definen las salas en las que se presenta la parte. Al momento de confeccionar el programa, aquí se completarán los campos de participantes, ayudante y/o lector para cada sala.

## Definición de filtros
Define las etiquetas que pueden aplicarse a una persona para filtrar quiénes pueden asignados a una parte.

### Ejemplo
~~~
{
    `id`: `f1`,
    `filtro`: `Enseñanza`,
    `color`: `#cccccc`
}
~~~
- En este caso, se define una etiqueta de filtro con el id "f1" y el nombre "Enseñanza". 
- En "color" se define un color para aplicar a la etiqueta en la interfaz. Es opcional.

## Definición de salas
Define las salas en las que puede presentarse una parte.

### Ejemplo
~~~
{
    "id": "a1",
    "filtro": "Sala principal",
    "color": "#cccccc"
}
~~~
- En este caso, se define una sala con el id `a1` y el nombre `Sala principal`. 
- En `color` se define un color para aplicar a la sala en la interfaz. Es 

## Definición de personas
Define las personas que pueden ser asignadas a una parte.

### Ejemplo
~~~
{
    "id": "e1",
    "nombre": "Juan",
    "apellido": "Perez",
    "filtros": ["f1", "f2"]
}
~~~
- En este caso, se define una persona con el id `p1` y el nombre `Juan Perez`. 
- En `filtros` se definen las etiquetas que pueden aplicarse a esta persona.

## Confección de programas  
Con estos elementos definidos, el usuario podrá confeccionar programas de reuniones. En la interfaz, selecionará una plantilla de semana. Podrá modificar sus partes aplicando las plantillas que desee. Asignará personas a las partes. Una vez completado, podrá publicar el programa. Si fuera necesario, podrá modificar las partes y asignaciones de un programa cuando necesite.
El sistema procesará las plantillas para que de como resultado un programa.

### Ejemplo de programa
Aquí el usuario selecciona una plantilla de semana `s1` y asigna personas a diferentes partes. Tiene libertad de cambiar el nombre a las partes.
~~~
{
    "id": "s1",
    "semana": "Normal",
    "fechaInicio": "01/03/2026",
    "fechaFin": "07/03/2026",
    "reuniones": [
        {
        "id": "r1",
        "reunion": "Reunión de entre semana",
        "secciones": [
            {
            "id": "c1",
            "seccion": "Tesoros de la Biblia",
            "mostrarEncabezado": true,
            "color": "#cccccc"
            "partes": [
                {
                "id": "p1",
                "parte": "Discurso",
                "descripcion": "Discurso de tesoros de la Biblia"
                "participantes": 1,
                "ayudante": false
                "lector": false
                "filtros": ["f1", "f2"]
                "salas": [
                    {
                        "id": "a1",
                        "asignado": "e1"
                    }]
                 },
                {
                "id": "p2",
                "parte": "Inicie conversaciones",
                "descripcion": "Parte estudiantil"
                "participantes": 1,
                "ayudante": true
                "lector": false
                "filtros": ["f1", "f2"]
                "salas": [
                    {
                        "id": "a1",
                        "asignado": "e2"
                        "ayudante": "e3"
                    },
                    {
                        "id": "a2",
                        "asignado": "e4"
                        "ayudante": "e5"
                    }]
                 },
                {
                "id": "p3",
                "parte": "Acomodadores",
                "descripcion": "Parte mecánica"
                "participantes": 2,
                "ayudante": false
                "lector": false
                "filtros": ["f1", "f2"]
                "salas": [
                    {
                        "id": "a1",
                        "asignado": ["e6","e7"]
                    }]
                 },
                 ,
                {
                "id": "p4",
                "parte": "Estudio bíblico de congregación","
                "participantes": 1,
                "ayudante": false
                "lector": true
                "filtros": ["f1", "f2"]
                "salas": [
                    {
                        "id": "a1",
                        "asignado": "e8"
                        "lector": "e9"
                    }]
                 }]
             }]
        }]
}
~~~


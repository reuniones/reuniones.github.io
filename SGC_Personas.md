# SGC: Base de Datos de Personas

Todos los módulos del sistema comparten esta base de datos única para sus asignaciones y gestión de datos.

## Estructura de Datos (Persona)
~~~json
{
    "id": "e1",
    "nombre": "Juan",
    "enc_apellido": "Perez",
    "genero": "H",
    "enc_email": "juan.perez@email.com",
    "fechaNacimiento": "1990-05-15",
    "fechaBautismo": "2010-06-20",
    "enc_telefonoCelular": "+54 9 11 1234-5678",
    "enc_telefonoFijo": "011 4321-8765",
    "enc_direccion": "Calle Falsa 123, Ciudad",
    "grupoPredicacion": "Grupo 3",
    "enc_servicio": ["s1", "s2"],
    "metadatos": [
        { "clave": "filtrosReuniones", "valor": ["f1", "f2"], "enc": false },
        { "clave": "discursosPreparados", "valor": [1, 5, 22, 110], "enc": false },
        { "clave": "dato_sensible", "valor": "Información privada", "enc": true }
    ],
    "enc_comentarios": [
        {
            "fecha": "2026-01-10",
            "texto": "Ejemplo: No asignar partes de lectura por problemas visuales temporales."
        }
    ]
}
~~~

### Descripción Detallada de Campos
- **id:** Identificador único de la persona.
- **nombre:** Nombre de pila (Público, para identificación rápida).
- **enc_apellido:** (Cifrado) Apellido de la persona.
- **genero:** Género ("H"/"M"). Fundamental para el filtrado automático de roles.
- **enc_email:** (Cifrado) Correo electrónico para notificaciones.
- **fechaNacimiento:** Fecha en formato ISO 8601 (AAAA-MM-DD).
- **fechaBautismo:** Fecha de bautismo (opcional).
- **enc_telefonoCelular** y **enc_telefonoFijo:** (Cifrado) Números de contacto.
- **enc_direccion:** (Cifrado) Domicilio de la persona.
- **grupoPredicacion:** Identificador del grupo de servicio.
- **enc_servicio:** (Cifrado) Array de etiquetas de nombramiento o estado. Al ser sensible, se protege para evitar identificar roles jerárquicos desde la base de datos cruda.
- **metadatos:** Bolsa de campos flexible.
    - Cada objeto incluye un campo **`enc`** (booleano). Si es `true`, el motor XXTEA cifrará el contenido de `valor` antes de persistirlo.
- **enc_comentarios:** (Cifrado) Historial de observaciones sobre la persona.

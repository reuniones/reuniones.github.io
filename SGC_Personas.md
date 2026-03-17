# SGC: Base de Datos de Personas

Todos los módulos del sistema comparten esta base de datos única. La información se organiza en objetos temáticos para facilitar su gestión y protección.

## 1. Estructura de Datos (Persona)
La ficha se divide en bloques lógicos: Identidad, Contacto, Servicio y Metadatos.

~~~json
{
    "id": "e1",
    "identidad": {
        "nombre": "Juan",
        "enc_apellido": "Perez",
        "nombreAbreviado": "J. Perez",
        "genero": "H",
        "fechaNacimiento": "1990-05-15"
    },
    "enc_contacto": {
        "telefonos": [
            { "tipo": "celular", "valor": "+54 9 11 1234-5678" }
        ],
        "direccion": "Calle Falsa 123",
        "email": "juan.perez@email.com"
    },
    "enc_servicio": {
        "fechaBautismo": "2010-06-20",
        "etiquetas": ["Publicador", "Anciano", "Bautizado"],
        "comentarios": [
            { "fecha": "2026-01-10", "texto": "Observación de ejemplo..." }
        ]
    },
    "metadatos": [
        { "clave": "filtrosReuniones", "valor": ["f1", "f2"], "enc": false },
        { "clave": "discursosPreparados", "valor": [1, 5, 22], "enc": false }
    ]
}
~~~

### Descripción Detallada de Campos

#### Bloque: Identidad (Público/Parcial)
-   **id:** Identificador único autogenerado.
-   **nombre:** Primer nombre o nombre de pila.
-   **enc_apellido:** Apellido real (Cifrado mediante XXTEA).
-   **nombreAbreviado:** Formato corto para visualización rápida (ej: "J. Perez").
-   **genero:** "H" (Hombre) o "M" (Mujer). Vital para la lógica de asignaciones.
-   **fechaNacimiento:** Fecha en formato ISO 8601 (AAAA-MM-DD).

#### Bloque: enc_contacto (Cifrado Total)
-   **telefonos:** Array de objetos que permite múltiples números (Celular, Fijo, Trabajo).
-   **direccion:** Domicilio físico de la persona.
-   **email:** Dirección de correo electrónico para notificaciones y 2FA.

#### Bloque: enc_servicio (Cifrado Total)
-   **fechaBautismo:** Fecha en la que la persona se bautizó (opcional).
-   **etiquetas:** Array de roles teocráticos (ej: "Anciano", "Siervo Ministerial", "Precursor").
-   **comentarios:** Historial de observaciones, cada una con su fecha y texto explicativo.

#### Bloque: Metadatos (Bolsa Flexible)
-   **clave:** Nombre identificador del metadato.
-   **valor:** Información que puede ser un string, número o array.
-   **enc:** Booleano que indica si el motor de datos debe cifrar este metadato específico.

---

## 2. Interfaz de Gestión de Personas

### A. Panel Principal (Tabla Maestra)
-   **Visualización:** Tabla responsiva con "Sticky Header" y scroll infinito.
-   **Columnas Personalizables:** El usuario elige qué campos ver (ej: Nombre, Etiquetas de Servicio).
-   **Búsqueda Global:** Filtrado instantáneo por nombre o apellido mientras se escribe.

### B. Sistema de Filtrado Avanzado
-   **Filtros Rápidos:** Botones para estados comunes (ej: "Solo Ancianos", "Grupo 3").
-   **Filtro por Metadatos:** Selector dinámico de etiquetas presentes en la bolsa de metadatos.
-   **Consola JSONata:** Herramienta para realizar consultas complejas sobre la base de datos JSON.

### C. Herramientas de Exportación y Comunicación
-   **Exportación Multiformato:** PDF (Reporte), XLSX (Excel), CSV o JSON (Backup).
-   **Compartir por WhatsApp:** Genera un mensaje con formato enriquecido (*negritas*, bloques de código) para enviar listas de contacto por mensajería.
-   **Seguridad:** Validación de Master Key para exportar datos sensibles descifrados.

### D. Ficha de Edición (Drawer / Diálogo Lateral)
-   **Organización por Pestañas:** Identidad, Contacto, Servicio y Metadatos.
-   **Indicadores de Privacidad:** Iconos de "candado" en campos que serán cifrados mediante XXTEA.

---

## 3. Privacidad y Sanitización
En el modo invitado (acceso público), el backend aplica un filtro JSONata que elimina automáticamente los bloques con prefijo `enc_`, devolviendo una versión segura de la ficha.

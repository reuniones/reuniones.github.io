# SGC: Predicación Telefónica

Este plug-in gestiona listados de números para predicación telefónica, los asigna a publicadores habilitados y lleva un registro detallado del trabajo realizado sin almacenar identidades externas.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_telefonica`
-   **Sección:** `Predicación`
-   **Icono:** `phone`
-   **Dependencias:** `[]`
-   **Navegación:**
    -   `{ "nombre": "Telefónica", "icono": "shield_lock", "ruta": "/admin", "publico": false }`
-   **Permisos:** 
    -   `admin`: ABM de números, importación CSV, asignación y registro de resultados.
-   **Tablas Requeridas:** `Telefonica_Numeros`, `Telefonica_Asignaciones`.

## 2. Estructura de Datos (Esquema)

### Registro de Número
~~~json
{
    "id": "tel_001",
    "enc_telefono": "+54 9 11 1234-5678",
    "estado": "Asignado",
    "fecha": "2026-01-01",
    "asignado": "e1",
    "respuesta": "Sin contestar",
    "enc_comentarios": "Llamado por la mañana"
}
~~~
- **Privacidad:** No se guarda el nombre de la persona titular del número.
- **enc_**: El teléfono y los comentarios están cifrados mediante XXTEA.

### Registro de Asignación (Lotes)
~~~json
{
    "id": "asig_tel_001",
    "personaId": "e1",
    "numerosIds": ["tel_001", "tel_002"],
    "fechaAsignacion": "2026-03-01",
    "finalizada": false
}
~~~

## 3. Flujo de Trabajo (Workflow)

### A. Gestión de Listados (Administrativo)
1.  **Importación:** Herramienta para subir archivos CSV. Los números se cifran en el cliente antes de ser enviados al GSheet Operativo.
2.  **Filtrado de Publicadores:** El sistema solo permite asignar números a personas que posean la etiqueta de **"Predicación Telefónica"** en su ficha de Servicio/Filtros.
3.  **Proceso de Asignación:**
    -   Se selecciona el publicador y los números.
    -   El sistema genera automáticamente un **Mensaje de WhatsApp** formateado con el listado de números para el publicador.
    -   Los registros se marcan como "Asignado" con la fecha correspondiente.

### B. Registro de Resultados
- Al recibir el informe del publicador, el administrador actualiza el número con:
    -   **Nueva Fecha de Devolución.**
    -   **Respuesta:** (Contesta, No contesta, No volver a llamar, Contestador automático, No funciona).
    -   **Comentarios adicionales** (Cifrados).

## 4. Especificación de Interfaces (Administración)

### A. Interfaz de ABM y Estados
-   Tabla maestra con filtros por **Estado** (Libre, Asignado, No llamar) y **Respuesta**.
-   Buscador rápido de números (requiere MK activa).

### B. Panel de Importación y Asignación
-   Asistente para carga de CSV con mapeo de columnas.
-   Selector de publicadores inteligentes (filtrados por etiqueta).
-   Botón de "Compartir por WhatsApp" para cada lote de asignación.

## 5. Reglas de Negocio (JSONata)

### Filtro de Publicadores Habilitados
`core.getPersonas()[servicio[val = 'Predicación Telefónica']]`
*(Consulta al Núcleo para obtener candidatos válidos).*

### Protección de Datos en Vistas
`numeros.{ "id": id, "estado": estado, "respuesta": respuesta }`
*(Permite ver la gestión sin descifrar los números telefónicos).*

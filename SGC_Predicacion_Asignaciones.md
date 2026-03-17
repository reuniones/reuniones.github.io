# SGC: Sistema de Asignaciones

Gestión del flujo de trabajo de territorios bajo un modelo de inventario estilo biblioteca.

## 1. Flujo de Asignación y Devolución
Las asignaciones se realizan por territorio completo a publicadores registrados en el núcleo.

### Registro de Movimientos (JSON)
~~~json
{
    "id": "asig_001",
    "territorioId": "22",
    "personaId": "e1",
    "fechaAsignacion": "2026-01-10",
    "fechaDevolucion": "2026-03-05",
    "completado": true
}
~~~

### Estados del Territorio
-   **Disponible:** El territorio está en el inventario listo para ser asignado.
-   **Asignado:** El territorio está en manos de un publicador. Se muestra la fecha desde la que está fuera.

## 2. Tarjeta de Territorio Virtual
Al momento de la asignación, el sistema genera automáticamente una tarjeta para el publicador.

-   **Formatos:** Imagen, PDF o Enlace Directo.
-   **Contenido:** Mapa resaltado del territorio, límites de calles y código QR para acceso rápido al mapa interactivo.

## 3. Interfaz Administrativa
-   **Control de Inventario:** Lista de todos los territorios con su estado actual.
-   **Acciones Rápidas:** Botón para asignar (abre selector de personas) y botón para devolver (registra fecha y éxito del trabajo).

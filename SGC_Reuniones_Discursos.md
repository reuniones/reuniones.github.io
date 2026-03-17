# SGC: Discursos Públicos

Este plug-in gestiona la logística de discursos de fin de semana, coordinando oradores visitantes y locales, con un sistema de recordatorios y base de datos de referencia.

## 1. Manifiesto del Módulo
-   **ID:** `reuniones_discursos`
-   **Sección:** `Reuniones`
-   **Icono:** `record_voice_over`
-   **Navegación:**
    -   `{ "nombre": "Administrar discursos", "icono": "shield_lock", "ruta": "/agenda", "publico": false }`
-   **Permisos:** `admin` (Gestión de agenda y títulos).
-   **Tablas Requeridas:** `Discursos_Agenda`, `Discursos_Catalogo_Titulos`, `Discursos_Historial_Numeros`.

## 2. Estructura de Datos

### Catálogo de Referencia (`Discursos_Catalogo_Titulos`)
Base de datos maestra con los temas oficiales. Permite importación masiva.
- **numero:** ID del bosquejo.
- **titulo:** Texto oficial del tema.

### Registro de Arreglo de Discurso
~~~json
{
    "id": "d1",
    "semanaId": "prog-2026-03-01",
    "tipo": "entrante",
    "orador": {
        "nombre": "Pedro Gomez",
        "congregacion": "Central",
        "telefono": "123456789"
    },
    "numero": 15,
    "confirmado": true
}
~~~
- **Sincronización:** El sistema busca el título automáticamente en el Catálogo usando el campo `numero`.

## 3. Flujo de Trabajo (Workflow)

### A. Gestión de la Agenda
Triple vista operativa: **Entrante**, **Saliente** y **Combinada**.
-   **Validación de Salientes:** El sistema impide añadir más oradores salientes que el límite definido en la configuración del módulo.

### B. Registro Histórico Simplificado
Cada vez que se completa un discurso en la congregación local, el sistema registra el número del bosquejo y la fecha en `Discursos_Historial_Numeros`.

### C. Comunicación y Difusión
-   **Recordatorios:** Generación de mensajes personalizados para enviar por WhatsApp al orador confirmado (incluye fecha, hora y tema).
-   **Exportación:** Botón para descargar la agenda en PDF/Excel o compartir un resumen por WhatsApp.

## 4. Especificación de Interfaces

### A. Panel de Agenda
-   Selector de vistas (Entrante/Saliente/Combinada).
-   Acciones rápidas por fila: "Enviar Recordatorio", "Confirmar", "Editar".

### B. Ajustes y Catálogo
-   **Importador de Títulos:** Herramienta para cargar la lista oficial de bosquejos (CSV/JSON).
-   **Configuración Operativa:** Definición del **Máximo de Oradores Salientes** permitidos por semana.

## 5. Reglas de Negocio (JSONata)

### Límite de Salientes
`$count(agenda[semanaId = $actual and tipo = 'saliente']) < $config.maxSalientes`
*(Validación antes de permitir un nuevo arreglo saliente).*

### Validación de Repetición
`$count(historial[numero = $numeroActual and fecha > $limite]) = 0`
*(Alerta si el número de bosquejo ya se presentó recientemente).*

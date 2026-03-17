# SGC: Predicación en Edificios

Este plug-in gestiona la asignación y el rastro del trabajo en edificios de departamentos, permitiendo una gestión progresiva y el registro de características físicas de acceso.

## 1. Manifiesto del Módulo
-   **ID:** `predicacion_edificios`
-   **Sección:** `Predicación`
-   **Icono:** `business`
-   **Dependencias:** `["predicacion_territorios"]`
-   **Navegación:**
    -   `{ "nombre": "Edificios", "icono": "public", "ruta": "/lista", "publico": true }`
    -   `{ "nombre": "Administrar edificios", "icono": "shield_lock", "ruta": "/admin", "publico": false }`
-   **Permisos:** `admin` (Gestión), `view` (Consulta).
-   **Tablas Requeridas:** `Edificios_Maestro`, `Edificios_Asignaciones`.

## 2. Estructura de Datos (Esquema)

### Definición de Edificio
~~~json
{
    "id": "bld_001",
    "nombre": "Edificio Alvear",
    "direccion": "Av. Alvear 456",
    "territorioId": "22",
    "infraestructura": {
        "intercomunicador": true,
        "tipoBuzon": "individuales" 
    },
    "pisos": 10,
    "unidadesPorPiso": 4,
    "coordenadas": [long, lat]
}
~~~
- **tipoBuzon:** Puede ser `individuales` (un buzón por depto) o `unico` (buzón compartido o portería).

### Registro de Asignación Progresiva
~~~json
{
    "id": "asig_bld_001",
    "edificioId": "bld_001",
    "personaId": "e1",
    "fechaAsignacion": "2026-02-01",
    "progreso": {
        "completado": false,
        "unidadesTrabajadas": ["1A", "1B", "2A"],
        "enc_notas_unidades": [
            { "unidad": "1A", "nota": "Persona interesada" }
        ]
    }
}
~~~

## 3. Flujo de Trabajo (Workflow)

### A. Trabajo Progresivo (Administrativo)
El sistema permite que un publicador mantenga la asignación mientras avanza departamento por departamento. El administrador puede ver el porcentaje de avance del edificio en tiempo real.

### B. Especificaciones de Acceso
La tarjeta del edificio indica claramente si se puede usar el intercomunicador o si solo se permite dejar publicaciones en un buzón único o individuales.

## 4. Especificación de Interfaces

### A. Interfaz Pública (Invitados)
-   **Lista de Edificios:** Muestra dirección, estado (Libre/Asignado) y el indicador de infraestructura (Buzones/Intercomunicador) para que el publicador sepa qué equipo o materiales necesita antes de solicitarlo.

### B. Interfaz Privada (Administrar)
-   **Editor Progresivo:** Permite marcar unidades individuales como trabajadas sin necesidad de devolver el edificio completo.
-   **Ficha Técnica:** Configuración de los detalles de infraestructura.

## 5. Reglas de Negocio (JSONata)

### Cálculo de Avance
`$count(progreso.unidadesTrabajadas) / (pisos * unidadesPorPiso) * 100`
*(Calcula el porcentaje de cobertura del edificio).*

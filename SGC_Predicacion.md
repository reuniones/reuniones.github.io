# SGC: Módulo de Predicación

Esta sección organiza la predicación mediante una arquitectura de 5 plug-ins independientes. Cada plug-in inyecta elementos de segundo nivel en el menú principal bajo la sección **Predicación**.

## Lista de Plug-ins y Menús

### 1. Plug-in: Predicación de Casa en Casa
Gestiona la predicación de casa en casa.
-   **De casa en casa** (`public`): Programa vigente de predicación de casa en casa.
-   **Administrar de casa en casa** (`shield_lock`): Interfaz de confección del programa.
-   [Ver Definición Detallada](./SGC_Predicacion_DeCasaEnCasa.md)

### 2. Plug-in: Predicación Pública
Gestiona la actividad con exhibidores (carritos) en puntos fijos.
-   **Pública** (`public`): Consulta de turnos y ubicaciones para el público.
-   **Administrar predicación pública** (`shield_lock`): Confección del programa.
-   [Ver Definición Detallada](./SGC_Predicacion_Publica.md)

### 3. Plug-in: Predicación en Edificios
Gestión específica para departamentos y complejos habitacionales.
-   **Edificios** (`public`): Consulta de asignaciones vigentes en edificios.
-   **Administrar edificios** (`shield_lock`): Gestión de edificios, pisos y responsables.
-   [Ver Definición Detallada](./SGC_Predicacion_Edificios.md)

### 4. Plug-in: Predicación Telefónica
Gestión de predicación telefónica.
-   **Telefónica** (`shield_lock`): Gestión de listados de números y asignación a publicadores.
-   [Ver Definición Detallada](./SGC_Predicacion_Telefonica.md)

### 5. Plug-in: Territorios
Gestión de territorios.
-   **Territorios** (`public`): Lista de territorios con elace a tarjetas de territorio, vista de mapas (grupos de predicación, territorios y manzanas).
-   **Administrar territorios** (`shield_lock`): Gestión de asignaciones de territorios (sistema estilo biblioteca).
-   **Ajjustes de territorios** (`shield_lock`): ABM de territorios, con definición polígonos GeoJSON de territorios y sus manzanas, ABM de grupos de predicación con definición de polígons GeoJSON, ABM de puntos de encuentro con definicion de puntos GeoJSON, Vista de Mapa con enlaces para modificar elementos.
-   [Ver Definición Detallada](./SGC_Predicacion_Territorios.md)

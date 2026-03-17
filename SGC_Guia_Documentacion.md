# SGC: Estándar de Documentación de Módulos

Todos los módulos (plug-ins) del sistema deben estar documentados siguiendo esta estructura para garantizar la consistencia y facilitar el desarrollo automático.

## Estructura Obligatoria

### 1. Manifiesto del Módulo (`Manifest`)
Definición técnica para el registro en el Core. El sistema utiliza una jerarquía de navegación de 3 niveles:
1.  **Sección:** Grupo principal en la barra lateral (ej: `Predicación`, `Reuniones`).
2.  **Menú/Módulo:** El punto de entrada al plug-in (ej: `Gestión de Territorios`).
3.  **Pestañas (Submenús):** Organización interna de la vista.
    -   **Indicadores de Privacidad:** Cada elemento de menú o pestaña debe indicar su visibilidad mediante iconos estándar:
        *   `public`: Para secciones accesibles al modo invitado.
        *   `shield_lock`: Para secciones exclusivas de usuarios administrativos.

- **ID:** Identificador único del plug-in.
- **Sección:** Nombre del grupo principal.
- **Icono:** Identificador de **Material Icon** (ej: `house`) o **URL a un archivo SVG** (ej: `./assets/icon.svg`).
- **Dependencias:** Array de IDs de otros plug-ins necesarios.
- **Navegación:** Objeto que define las pestañas y su nivel de privacidad.

### 2. Estructura de Datos
Especificación detallada de los objetos JSON y las tablas.
- **Esquema:** Definición de campos, tipos y flags de cifrado (`enc_`).
- **Relaciones:** Cómo se vinculan los datos con el GSheet de Personas o el Core.

### 3. Flujo de Trabajo (Workflow)
Descripción paso a paso de los procesos del módulo.
- **Procesos Administrativos:** Confección, asignación, validación.
- **Procesos Automáticos:** Motores de sugerencias, sincronización con el Core.

### 4. Especificación de Interfaces

#### A. Interfaz Privada (Administración)
- Detalle de paneles, formularios y herramientas de gestión.
- Lógica de los componentes inteligentes (etiquetas, selectores, etc.).

#### B. Interfaz Pública (Modo Invitado)
- Qué datos se muestran y cómo se visualizan para el usuario sin login.
- Enlaces externos y funcionalidades de consulta.

### 5. Reglas de Negocio (JSONata)
Listado de las expresiones JSONata críticas para el módulo.
- Expresiones de validación para el guardado.
- Expresiones de transformación para reportes o vistas.

---

## Lineamientos de Redacción
- **Preservación:** Nunca eliminar descripciones detalladas en actualizaciones.
- **Ejemplos:** Siempre incluir un ejemplo de JSON válido para cada estructura.
- **Seguridad:** Marcar explícitamente qué datos son sensibles y cómo se protegen.

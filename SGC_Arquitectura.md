# SGC: Arquitectura de Núcleo y Plug-ins

El sistema se basa en un marco de trabajo central (**Core**) que orquesta una serie de módulos independientes (**Plug-ins**), utilizando una estrategia de **Segmentación Física de Datos** para garantizar máxima privacidad y escalabilidad.

## 1. El Núcleo (Core System)
Es el motor estable que proporciona los servicios esenciales a toda la aplicación:

-   **Shell UI:** Interfaz general, navegación, gestión de temas (oscuro/claro) y notificaciones.
-   **Seguridad y Auth:** Gestión de login, 2FA/TOTP, Passkeys y el motor de cifrado XXTEA.
-   **Orquestador de Datos:** Gestiona los enlaces a las diferentes bases de datos físicas.
-   **DataService:** Bus de comunicación agnóstico con el backend.
-   **Motor JSONata:** Motor universal para lógica de negocio y validaciones.

## 2. Definición de Plug-in
Un módulo es una unidad independiente que se "enchufa" al Core cumpliendo esta estructura:
-   **Manifest:** JSON que define nombre, icono, permisos y tablas requeridas.
-   **Views:** Componentes React que se renderizan dentro del Shell UI.
-   **Esquema:** Definiciones dinámicas para la tabla `Sistema_Esquema`.
-   **Lógica:** Expresiones JSONata específicas para validaciones del módulo.

## 3. Segmentación Física de Datos
La información se distribuye en múltiples bases de datos (GSheets) según su nivel de privacidad:

### A. GSheet Core (The Orchestrator)
Contiene la configuración maestra:
-   **Usuarios:** Credenciales y permisos.
-   **Registro_Plugins:** Mapeo de módulos con sus respectivos `spreadsheet_id`.
-   **Configuración Global:** Preferencias del sistema.

### B. GSheet Público (The Mirror)
Es el único recurso accesible en el modo invitado (sin login).
-   **Contenido:** Datos sanitizados (Programas publicados, Mapa de territorios público).
-   **Aislamiento:** No tiene vínculo físico con los datos sensibles de personas.

### C. GSheet Personas (The Vault)
Se gestiona como un plug-in de alta prioridad.
-   **Contenido:** Censo completo (Identidad, Contacto, Servicio).
-   **Privacidad:** Solo se conecta a la sesión bajo permisos de administrador.

### D. GSheets Operativos
Cada plug-in (Reuniones, Predicación, etc.) tiene su propio archivo para datos internos (plantillas, discursos, etc.).

## 4. Gestión de Ciclo de Vida (Instalación)
Desde el panel de Administración, el sistema permite:
1.  **Selección:** Elegir un plug-in del catálogo disponible.
2.  **Vinculación:** Proporcionar el ID de un nuevo GSheet para ese módulo.
3.  **Provisión (Setup):** El Core inicializa las tablas y cabeceras automáticamente vía `initSheet`.
4.  **Activación:** El módulo aparece en el menú según los permisos del usuario.

## 5. Capa de Persistencia Agnostica (Storage Adapters)
El sistema no está atado a Google Sheets. El Core permite cambiar el adaptador por módulo:
-   **GSheets Adapter:** Uso de GAS como puente.
-   **RestAPI Adapter:** Para bases de datos SQL propias.
-   **Local Adapter:** Almacenamiento en el navegador para pruebas.

## 6. Comunicación Inter-Módulo
Los plug-ins nunca hablan entre sí directamente. Siempre solicitan datos al Core:
-   *Ejemplo:* El módulo de *Reuniones* solicita: `core.getPersonas(filtroJSONata)`. El Core decide si entrega los datos basándose en la sesión activa.

## 7. Librería de Componentes (SGC-UI)
El Core expone componentes Material Design para asegurar consistencia visual:
-   `<DataTable />`: Tablas con búsqueda, filtrado JSONata y exportación multiformato.
-   `<PersonaSelector />`: Selector con validación de filtros de reunión.
-   `<EncryptedInput />`: Gestión transparente de campos XXTEA.

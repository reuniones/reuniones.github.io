# SGC: Módulo de Administración

Este módulo es el núcleo operativo del sistema, permitiendo gestionar el censo de la congregación y el control de acceso de los usuarios administrativos y editores.

## Secciones del Módulo

### 1. Gestión de Personas
Panel centralizado para administrar la [Base de Datos de Personas](./SGC_Personas.md).
-   **Interfaz:** Tabla maestra con búsqueda avanzada, filtrado por grupo de predicación y estado de servicio.
-   **Ficha de Edición:** Formulario completo para gestionar datos personales, metadatos y comentarios. Los campos sensibles se marcan visualmente con un icono de "candado" indicando que serán cifrados mediante XXTEA.
-   **Acciones en Lote:** Capacidad para mover personas entre grupos de predicación o actualizar etiquetas de servicio masivamente.

### 2. Gestión de Usuarios y Seguridad
Control de quién accede al sistema y con qué nivel de privilegios.
-   **Listado de Usuarios:** Gestión de editores y administradores.
-   **Configuración de Permisos:** Matriz de acceso por módulo (Reuniones, Predicación, Salón).
-   **Control de Acceso (2FA/TOTP):** 
    -   Generación de **Claves Maestras (k)** para nuevos editores.
    -   Gestión de semillas **TOTP** para aplicaciones de autenticación.
    -   Soporte para reseteo de "Cofres Criptográficos" en caso de pérdida de dispositivo (solo Administrador Principal).

---

## Interfaz de Usuario Sugerida

### Panel de Personas
-   **Vista Principal:** Diseño de tabla responsiva con "Sticky Header".
-   **Modo de Edición:** Diálogo lateral (Drawer) para no perder el contexto de la lista.
-   **Indicadores de Privacidad:** Los campos que requieren la Master Key para ser visualizados aparecen desenfocados o con un placeholder hasta que la llave es cargada en la sesión.

### Panel de Seguridad
-   **Gestor de Tokens:** Generación de enlaces mágicos (`?api=...&k=...`) para enviar a los nuevos colaboradores.
-   **Monitor de Actividad:** (Opcional) Visualización de los últimos accesos exitosos.

## Integración con el Backend
-   Todas las operaciones de este módulo requieren el permiso de `admin` en el `session_token`.
-   Al guardar una persona, el frontend procesa automáticamente los flags `enc_` y los metadatos marcados para cifrado antes de realizar el `saveData` al Google Apps Script.

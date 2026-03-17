# Sistema de Gestión de Congregación (SGC)

Este sistema modular de alto rendimiento permite la gestión integral de una congregación. Está diseñado bajo una arquitectura de **Núcleo y Plug-ins**, garantizando extensibilidad, seguridad de **Conocimiento Cero** y aislamiento de datos.

## Estructura del Sistema

El SGC se divide en un marco de trabajo básico (Core) y módulos independientes (Plug-ins) que pueden utilizar diferentes métodos de almacenamiento y bases de datos físicas segregadas.

### Índice de Documentación Técnica

1.  [**Arquitectura del Sistema**](./SGC_Arquitectura.md): Definición del Núcleo, sistema de Plug-ins, Segmentación Física de Datos y Adaptadores de Almacenamiento.
2.  [**Especificación del Backend**](./SGC_Backend.md): Protocolo de comunicación, arquitectura Schema-Driven y motor JSONata Universal.
3.  [**Estándar de Documentación de Módulos**](./SGC_Guia_Documentacion.md): Lineamientos obligatorios para la definición de nuevos plug-ins (Manifiesto, Estructuras, Interfaces).
4.  [**Módulo de Administración**](./SGC_Administracion.md): Índice de gestión de personas, registros históricos, seguridad y configuración del sistema.
5.  [**Base de Datos de Personas**](./SGC_Personas.md): Especificación técnica del censo compartido, objetos temáticos (Identidad, Contacto, Servicio) y campos cifrados.
6.  [**Módulo de Reuniones**](./SGC_Reuniones.md): Índice de confección de programas, plantillas con roles dinámicos y agenda de discursos públicos.
7.  [**Módulo de Predicación**](./SGC_Predicacion.md): Índice de gestión geográfica (GeoJSON), asignación de territorios, programas de casa en casa y puntos de encuentro.

### Módulos Futuros
-   [Salón del Reino](./SGC_Salon.md): Gestión de instalaciones y mantenimiento.

---

## Tecnologías e Interfaz
-   **Front-end:** React + Tailwind CSS.
-   **Estética:** Material Design 3 + Material Icons (Soporte para SVG personalizados).
-   **Procesamiento:** Motor **JSONata** para lógica de negocio, validaciones y sanitización de datos.
-   **Seguridad:** 
    -   Cifrado simétrico **XXTEA** con gestión local de claves.
    -   Modelo **Zero-Knowledge** (Key Wrapping basado en TOTP Seed).
    -   Autenticación multifactor: **Passkeys (WebAuthn)**, TOTP y OTP vía Email.
-   **Despliegue:** Optimizado para GitHub Pages con persistencia automática de API vía parámetros de URL.
-   **Adaptabilidad:** Diseño Responsive (Mobile First) con soporte nativo para Modo Oscuro/Claro.

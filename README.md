# Sistema de Gestión de Congregación (SGC)

Este proyecto es una aplicación web modular diseñada para la gestión integral de una congregación. Utiliza una arquitectura avanzada de **Núcleo y Plug-ins**, garantizando seguridad de **Conocimiento Cero (Zero-Knowledge)** y flexibilidad total mediante un motor **Schema-Driven**.

## 🚀 Arquitectura y Tecnologías
-   **Core:** React + Tailwind CSS (Material Design 3).
-   **Backend:** Google Apps Script (GAS) como proveedor de datos primario.
-   **Almacenamiento:** Segmentación física en múltiples Google Sheets (Core, Público, Personas, Operativos).
-   **Seguridad:** Cifrado simétrico XXTEA con Key Wrapping basado en TOTP Seed.
-   **Lógica:** Procesamiento universal de datos mediante **JSONata**.

---

## 📚 Documentación del Sistema
Para comprender el funcionamiento detallado, consulta los siguientes archivos de especificación:

1.  [**Índice General (SGC_README.md)**](./SGC_README.md): Punto de entrada a toda la especificación técnica.
2.  [**Arquitectura del Sistema**](./SGC_Arquitectura.md): Definición del framework de plugins y adaptadores.
3.  [**Especificación del Backend**](./SGC_Backend.md): Protocolo de comunicación y seguridad.
4.  [**Módulo de Administración**](./SGC_Administracion.md): Control de acceso y gestión del censo.
5.  [**Módulo de Reuniones**](./SGC_Reuniones.md): Confección de programas y discursos públicos.
6.  [**Módulo de Predicación**](./SGC_Predicacion.md): Gestión geográfica y programas de casa en casa.

---

## 🛠️ Desarrollo
Este proyecto utiliza **Vite** para el empaquetado y desarrollo local.

### Comandos Rápidos
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción (GitHub Pages)
npm run build
```

---

## 📋 Estándar de Contribución
Si deseas añadir un nuevo módulo o modificar uno existente, debes seguir estrictamente el [**Estándar de Documentación de Módulos**](./SGC_Guia_Documentacion.md) para garantizar la consistencia del ecosistema.

# 🚗 AutoApp — Documento de Contexto Técnico y Guía para Producción

Este documento contiene la información completa del proyecto **AutoApp** (ERP, CRM y Multi-Publicador SaaS para Agencias y Concesionarias de Autos en Latinoamérica). 

Si estás iniciando un nuevo chat o workspace, copia y pega este documento como prompt inicial para que cualquier modelo de IA o desarrollador pueda continuar el desarrollo exactamente desde donde lo dejamos.

---

## 1. 📌 Visión General del Proyecto
**AutoApp** es una plataforma SaaS B2B integral diseñada específicamente para el sector automotriz (usados y 0km).
* **Frontend:** Next.js 16 (App Router, Turbopack, React 19).
* **Base de Datos & Realtime:** Supabase (PostgreSQL con suscripciones en tiempo real).
* **Estilos & UI:** Tailwind CSS, Lucide Icons, tipografía *Plus Jakarta Sans*, soporte para tema oscuro (`dark`).
* **Extensión de Apoyo:** Extensión de Chrome **Auto-Cyborg 360** para automatizaciones de DOM en plataformas sin API pública.

---

## 2. 🏗️ Arquitectura del Sistema e Integraciones

### A. MercadoLibre (VIS API Oficial - Categoría MLA1744)
* **Ubicación de Código:** `src/app/api/mercadolibre/publish/route.ts` y `src/app/api/mercadolibre/test-user/route.ts`.
* **Publicación Directa Server-to-Server:** Endpoint `POST /api/mercadolibre/publish` que envía payloads con estándar VIS (Vehículos, Inmuebles y Servicios).
* **Atributos Mapeados:** `BRAND`, `MODEL`, `VEHICLE_YEAR`, `KILOMETERS`, `FUEL_TYPE`, `TRANSMISSION`, `BODY_TYPE`.
* **Tipos de Publicación:** `gold_premium`, `gold_plus`, `silver`, `free`.
* **Cuentas de Prueba (Sandbox):** Endpoint `POST /api/mercadolibre/test-user` que genera automáticamente usuarios de prueba en el entorno Sandbox de MercadoLibre para testear publicaciones `gold_premium` sin costo real.
* **Badge de Conexión:** Incorporado en `/publicaciones` con estado (`🟢 Conectado` / `⚡ Vincular`).

### B. WhatsApp Estado & Chats
* **Ubicación de Código:** `src/lib/publisher.ts` (`publishToWhatsAppStatus` y `copyImageToClipboard`).
* **Flujo de Publicación:**
  1. Descarga proxy de la foto de portada (`/api/proxy-image?url=...`).
  2. Dibuja la foto en un `<canvas>` HTML y copia el PNG Blob directamente al portapapeles (`navigator.clipboard.write`).
  3. Copia el texto formateado del vehículo (marca, modelo, año, km, precio, anticipo, combustible, caja, descripción) al portapapeles (`navigator.clipboard.writeText`).
  4. Envía el payload a la extensión Auto-Cyborg 360 mediante `chrome.storage.local` y `window.postMessage`.
  5. Abre `https://web.whatsapp.com/#autoapp_wa=${encodedMeta}` enviando el hash de navegación para la extensión.

### C. Facebook Marketplace & Instagram Feed
* **Ubicación de Código:** `src/lib/publisher.ts` (`publishToFacebookMarketplace`, `publishToInstagramFeed`).
* **Proxy de Imágenes:** `/api/proxy-image/route.ts` para saltear restricciones CORS al procesar imágenes de Supabase / almacenamiento externo.
* **Navegación Hash Bridge:** Abre URLs estructuradas (`https://www.facebook.com/marketplace/create/vehicle#autoapp=...` y `https://www.instagram.com/#autoapp_ig=...`) para que el Content Script autocomplete los formularios.

---

## 3. 🗄️ Esquema de Base de Datos (Supabase PostgreSQL)

### Tabla: `DB_STOCK` (Vehículos Usados)
* `ID` (text / uuid, PK)
* `Patente` (text)
* `Marca` (text)
* `Modelo` (text)
* `Version` (text)
* `Año` / `Anio` (text / int)
* `Precio_Venta` (numeric)
* `Precio_entrega` (numeric)
* `Km` (numeric)
* `Estado` (text: 'DISPONIBLE', 'RESERVADO', 'VENDIDO')
* `Tipo_Combustible` (text: 'Nafta', 'Diésel', 'Híbrido', 'Eléctrico')
* `Transmision` (text: 'Manual', 'Automática')
* `Tipo_Carroceria` (text: 'Sedán', 'Hatchback', 'SUV', 'Pickup')
* `Estado_Vehiculo` (text: 'Excelente', 'Bueno', etc.)
* `Tipo_Vehiculo` (text: 'Usado')
* `FOTO_PORTADA` (text URL)
* `FOTOS_EXTRA` (jsonb / text array)
* `Descripcion` (text)
* `createdAt` (timestamp)

### Tabla: `DB_STOCK_OKM` (Vehículos 0km)
Mismo esquema que `DB_STOCK`, pero orientada a catálogo 0km y entregas inmediatas.

### Tablas de Fotos: `DB_FOTOS` / `DB_FOTOS_OKM`
* `ID` (uuid)
* `ID_AUTO` (FK -> DB_STOCK.ID)
* `FOTO_ARCHIVO` (text URL)
* `ORDEN` (int)

### Tabla: `DB_LEADS` (CRM de Clientes)
* `ID` (uuid, PK)
* `Nombre_Cliente` (text)
* `Telefono` (text)
* `Auto_Interes` (text)
* `Notas` (text)
* `Etapa` (text: 'NUEVO', 'CONTACTADO', 'EN_NEGOCIACION', 'GANADO', 'PERDIDO')
* `Moneda` (text: 'ARS', 'USD')
* `created_at` (timestamp)

### Tabla: `DB_INTERACCIONES` (Historial de Mensajes)
* `ID` (uuid, PK)
* `Tipo_Interaccion` (text)
* `Vendedor` (text)
* `Detalle_Conversacion` (text)
* `created_at` (timestamp)

---

## 4. 📂 Estructura de Archivos Clave del Proyecto Next.js

```
autoapp/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                 # Dashboard principal con métricas
│   │   │   ├── stock/
│   │   │   │   ├── page.tsx             # Catálogo Usados y 0KM
│   │   │   │   ├── [id]/page.tsx        # Detalle / Edición individual
│   │   │   │   └── nuevo/page.tsx       # Carga de vehículo nuevo
│   │   │   ├── publicaciones/
│   │   │   │   └── page.tsx             # Centro de publicaciones y vinculación MercadoLibre
│   │   │   ├── crm/
│   │   │   │   └── page.tsx             # Kanban Board de Leads
│   │   │   └── reportes/
│   │   │       └── page.tsx             # Reportes comerciales e inventario
│   │   ├── api/
│   │   │   ├── mercadolibre/publish/    # API Route publicación MercadoLibre VIS
│   │   │   ├── mercadolibre/test-user/  # API Route usuarios Sandbox
│   │   │   └── proxy-image/             # Bypass CORS para imágenes
│   │   └── layout.tsx                   # Root Layout con suppressHydrationWarning
│   ├── components/
│   │   ├── publications/
│   │   │   └── publications-client.tsx  # Cliente principal de Publicaciones
│   │   ├── stock/
│   │   │   ├── publish-modal.tsx        # Modal de envío a redes
│   │   │   ├── vehicle-detail-modal.tsx # Modal de ficha técnica y fotos
│   │   │   └── export-excel-button.tsx  # Exportación Excel
│   │   ├── crm/
│   │   │   └── kanban-board.tsx         # Tablero Kanban interactivo
│   │   └── layout/
│   │       ├── header.tsx
│   │       └── sidebar.tsx
│   └── lib/
│       ├── publisher.ts                 # Motor de publicación FB, IG, WA, MercadoLibre
│       ├── utils.ts                     # Formateadores de precio, km, patentes
│       └── supabase/
│           ├── client.ts
│           └── types.ts
```

---

## 5. 🚀 Hoja de Ruta para Salida a Producción (Paso a Paso)

### 1. Variables de Entorno en Producción (`.env.local` / Vercel / VPS)
Configurar las siguientes variables en el hosting:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# MercadoLibre Developers App Credentials
MERCADOLIBRE_CLIENT_ID=tu_client_id_real
MERCADOLIBRE_CLIENT_SECRET=tu_client_secret_real
MERCADOLIBRE_REDIRECT_URI=https://tu-dominio.com/publicaciones
```

### 2. Vinculación Oficial con MercadoLibre Producción
1. Ir a [MercadoLibre Developers](https://developers.mercadolibre.com.ar/).
2. Crear una Aplicación con permisos de Lectura, Escritura y Modificación (`read`, `write`, `offline_access`).
3. Registrar la **Redirect URI**: `https://tu-dominio.com/publicaciones`.
4. Ingresar el Client ID y Client Secret en el panel de Configuración Developer en `/publicaciones`.

### 3. Distribución de la Extensión Chrome (Auto-Cyborg 360)
1. Empaquetar el directorio de la extensión (`manifest.json`, `background.ts`, content scripts).
2. Subir a la Chrome Web Store como aplicación privada/unlisted o distribuir en formato `.zip` / `.crx` para las computadoras de la agencia.

### 4. Supabase Row Level Security (RLS)
1. Activar RLS en las tablas `DB_STOCK`, `DB_LEADS`, `DB_INTERACCIONES`.
2. Agregar política de lectura/escritura para usuarios autenticados de la agencia.

---

## 6. 📝 Instrucción Inicial para el Modelo de IA
Al iniciar una nueva sesión, copia este prompt o consulta el archivo [SYSTEM_PROMPT.md](file:///C:/Users/tomas/Documents/antigravity/quirky-carson/autoapp/SYSTEM_PROMPT.md):

> *"Hola, estoy trabajando en el proyecto AutoApp (ERP + CRM + Multi-Publicador para Agencias de Autos en Next.js 16 y Supabase). Ya tenemos implementado el módulo de stock, el CRM Kanban, el proxy de imágenes, la API Route para MercadoLibre VIS y el SYSTEM_PROMPT.md estructurado en STOCK, PUBLICACIONES (con hoja de ruta de APIs gratuitas primero), CRM, DASHBOARD y ASISTENTE VIRTUAL. Lee el documento de contexto y el SYSTEM_PROMPT.md y ayúdame a [Escribe tu siguiente objetivo aquí]."*

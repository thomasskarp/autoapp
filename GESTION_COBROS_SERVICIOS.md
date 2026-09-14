# 💳 Gestión de Cobros y Tarifas de Publicación (AutoApp)

Este documento define la arquitectura, esquema tarifario y modelo de negocio para el cobro de publicaciones automáticas y servicios de visibilidad para las agencias y usuarios de **AutoApp**.

---

## 1. El Modelo de Publicaciones de MercadoLibre (VIS Autos)

MercadoLibre en su vertical automotriz (**Vehículos, Inmuebles y Servicios - VIS**) opera bajo un modelo de **clasificados fijos por publicación** (no cobra comisión porcentual por venta de auto, sino costo fijo por publicar o abono mensual por agencia):

### A. Cuentas Particulares / Vendedor Ocasional
| Tipo de Publicación | Duración | Costo Oficial MercadoLibre (Estimado MLA) | Cupo Gratuito |
| :--- | :--- | :--- | :--- |
| **Gratis (`free`)** | 30 días | **$0 ARS** | **1 sola publicación de por vida** por cuenta |
| **Plata (`silver`)** | 30 días | ~$15.000 - $22.000 ARS | Ilimitadas (con pago previo) |
| **Oro (`gold`)** | 30 días | ~$28.000 - $38.000 ARS | Ilimitadas (con pago previo) |
| **Oro Premium (`gold_premium`)** | 30 días | ~$45.000 - $60.000 ARS | Ilimitadas (con pago previo) |

> ⚠️ **Comportamiento en la API:**
> Cuando una cuenta particular ya publicó su auto gratis (ej. tu *Renault Duster*), cualquier nuevo auto que se envíe como `gold_premium` o `silver` (ej. tu *Toyota Hilux SRX*) se crea en estado **"Inactiva para revisar"** con el botón **"Pagar"** en MercadoLibre. La publicación se activa automáticamente apenas se cancela el costo oficial.

### B. Cuentas Concesionaria (MercadoLibre Motors Pro / Paquetes)
Las agencias que contratan un paquete oficial de MercadoLibre Motors pagan un abono mensual fijo (por ejemplo, cupo para 15, 30 o 50 autos activos). Con ese paquete, la API publica automáticamente dentro del cupo contratado sin pedir pagos individuales por cada unidad.

---

## 2. Estrategia de Cobro y Margen de AutoApp

AutoApp brinda a la concesionaria la **automatización total, sincronización de stock y generación de copys con inteligencia artificial**.

Podemos implementar dos esquemas de monetización:

### Modelo A: Recargo Por Publicación Individual (Pay-per-Listing)
La agencia paga el costo oficial del portal + un **recargo por gestión y optimización de AutoApp**:

$$\text{Precio Final AutoApp} = \text{Costo Oficial Plataforma} \times (1 + \text{Margen AutoApp \%}) + \text{Fee Fijo por IA}$$

| Servicio | Costo Base Oficial (Ejemplo) | Margen AutoApp (%) | Fee Gestión IA | Precio Cobrado al Cliente | Ganancia Neta AutoApp |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MercadoLibre Plata** | $20.000 ARS | +25% ($5.000) | $2.000 ARS | **$27.000 ARS** | **$7.000 ARS** |
| **MercadoLibre Oro Premium** | $50.000 ARS | +20% ($10.000) | $3.000 ARS | **$63.000 ARS** | **$13.000 ARS** |
| **Campaña Meta Ads (Facebook/Instagram)** | Presupuesto pauta (ej. $10.000) | +20% ($2.000) | $1.500 ARS | **$13.500 ARS** | **$3.500 ARS** |
| **Redes Orgánicas (Marketplace + WA + IG)** | $0 (Gratuito) | — | $1.500 ARS (por vehículo) | **$1.500 ARS** | **$1.500 ARS (100%)** |

### Modelo B: Abono Mensual SaaS (Suscripción Concesionaria)
Un fee mensual recurrente según el tamaño del inventario:
- **Plan Starter (Hasta 10 vehículos):** Publicaciones orgánicas ilimitadas (Facebook Marketplace, WhatsApp, Instagram Feed) + Copys con IA + Gestión de 1 cuenta MercadoLibre: **$25.000 ARS / mes**.
- **Plan Pro (Hasta 30 vehículos):** Todo lo anterior + Sincronización automática de precios de oferta + Soporte multicuenta: **$45.000 ARS / mes**.
- **Plan Dealership (Inventario ilimitado):** Publicación automática 1-clic + CRM integrado + Análisis de métricas y Dwell Time: **$80.000 ARS / mes**.

---

## 3. Arquitectura Técnica en AutoApp

Para materializar este módulo en el código se proponen las siguientes capas:

### 1. Entidad en Base de Datos (Supabase): `agency_billing`
```sql
CREATE TABLE agency_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  service_type TEXT NOT NULL, -- 'mercadolibre_listing', 'meta_ad', 'subscription_plan'
  vehicle_id UUID REFERENCES vehicles(id),
  base_cost NUMERIC DEFAULT 0,
  markup_percentage NUMERIC DEFAULT 25.0, -- Porcentaje adicional de AutoApp
  markup_fixed NUMERIC DEFAULT 0,
  total_charged NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'credited'
  payment_gateway TEXT, -- 'mercadopago', 'stripe', 'transfer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Configuración de Márgenes por Agencia / Admin
En la pantalla de Configuración (`/settings` o panel de Publicaciones):
- Un slider o campo de porcentaje: **"Recargo por servicio de publicación (%)"** (ej. `20%`, `25%`, `30%`).
- Cálculo en tiempo real antes de confirmar la publicación de pago.

### 3. Pasarela de Pago Integrada (Mercado Pago Checkout Pro)
Cuando la agencia solicita una publicación que requiere costo:
1. AutoApp genera una preferencia de cobro en Mercado Pago con el total (`Costo Oficial + Margen`).
2. Una vez acreditado el pago vía Webhook (`/api/webhooks/mercadopago`), AutoApp dispara la API de publicación y acredita la ganancia neta a la cuenta de la plataforma.

---

## 4. Estado Actual de tus Publicaciones
En tu captura de MercadoLibre:
1. **Renault Duster 1.6:** Publicada exitosamente bajo la condición **Gratis** (vence en 29 días, métricas activas: 5 visitas, 1 pregunta).
2. **Toyota Hilux SRX 4x4:** Creada exitosamente por la API bajo **Oro Premium**, en estado **Inactiva para revisar** a la espera del abono oficial de la publicación para quedar visible en las búsquedas públicas.

# 📦 StockPro — Sistema de Gestión Logística

<div align="center">

![StockPro Banner](https://placehold.co/1200x300/0f1520/00c896?text=StockPro+%E2%80%94+Gesti%C3%B3n+Log%C3%ADstica+para+PYMEs)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

**Sistema completo de gestión logística para PYMEs peruanas — inventario, despachos, transporte, compras y auditoría en una sola plataforma.**

[🚀 Demo en vivo](#) · [📖 Documentación](#documentación) · [🐛 Reportar un bug](../../issues) · [💡 Solicitar funcionalidad](../../issues)

</div>

---

## 📋 Tabla de Contenidos

- [Sobre el Proyecto](#-sobre-el-proyecto)
- [Capturas de Pantalla](#-capturas-de-pantalla)
- [Tecnologías](#-tecnologías)
- [Funcionalidades](#-funcionalidades-clave)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Contribuciones](#-contribuciones)
- [Licencia](#-licencia)
- [Contacto](#-contacto)

---

## 🎯 Sobre el Proyecto

**StockPro** es una plataforma web de gestión logística diseñada específicamente para **pequeñas y medianas empresas (PYMEs) peruanas**. Resuelve el caos operativo de manejar inventarios en hojas de cálculo, órdenes de compra por correo y rutas de reparto en papel.

### ¿Qué problema resuelve?

| Sin StockPro | Con StockPro |
|---|---|
| Inventario en Excel desactualizado | Stock en tiempo real con alertas automáticas |
| Sin trazabilidad de movimientos | Kardex valorizado con historial completo |
| Órdenes de compra por correo | Flujo OC completo con PDF automático |
| Rutas de reparto en papel | Tracking de despachos y transportes |
| Sin control de vencimientos | Alertas de productos próximos a vencer |
| Sin auditoría de usuarios | Log completo de todas las operaciones |

### 🎯 Orientado a

- Distribuidoras y empresas comercializadoras
- Almacenes y centros de distribución
- Empresas con múltiples almacenes y transportistas
- Negocios que necesitan trazabilidad completa sin invertir en ERP costosos

---

## 📸 Capturas de Pantalla

<div align="center">

### Dashboard Principal
![Dashboard](https://placehold.co/900x500/161d28/00c896?text=📊+Dashboard+—+KPIs+%2B+Gráficos+%2B+Alertas)

### Módulo de Inventario
![Inventario](https://placehold.co/900x500/161d28/3b82f6?text=📦+Inventario+—+Stock+%2B+Valorización+PMP%2FFIFO%2FLIFO)

### Gestión de Despachos
![Despachos](https://placehold.co/900x500/161d28/8b5cf6?text=🚚+Despachos+—+Pipeline+%2B+Guía+de+Remisión)

### Seguimiento de Rutas
![Transportes](https://placehold.co/900x500/161d28/f59e0b?text=🗺️+Transportes+—+Rutas+%2B+Tracking+en+tiempo+real)

### Módulo de Auditoría
![Auditoria](https://placehold.co/900x500/161d28/ef4444?text=🛡️+Auditoría+—+Log+completo+de+operaciones)

</div>

---

## 🛠️ Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| **React** | 18.3 | Framework UI principal |
| **Vite** | 5.4 | Build tool y servidor de desarrollo |
| **Tailwind CSS** | 4.0 | Estilos y diseño responsive |
| **React Router DOM** | 6.26 | Navegación SPA |
| **Recharts** | 2.12 | Gráficos y visualizaciones |
| **Lucide React** | 0.441 | Íconos del sistema |
| **date-fns** | 3.6 | Manejo de fechas |

### Almacenamiento
| Tecnología | Uso |
|---|---|
| **localStorage** | Persistencia de datos en el cliente (arquitectura offline-first) |
| **JSON** | Formato de datos para todas las entidades |

### Extras
- **PWA** (vite-plugin-pwa + Workbox) — instalable como app nativa
- **OpenStreetMap + Leaflet** — mapas sin API key
- **Nominatim** — geocodificación de direcciones
- **OSRM** — cálculo de rutas reales por calles

> 💡 **Arquitectura Offline-First**: StockPro funciona completamente en el navegador sin necesidad de servidor backend. El `localStorage` actúa como base de datos local, lo que lo hace ideal para implementaciones rápidas. La capa de datos está abstraída en `src/services/storage.js` para migración futura a una API REST.

---

## ✨ Funcionalidades Clave

### 1. 📦 Control de Inventario en Tiempo Real
- Registro de entradas, salidas, ajustes, devoluciones y transferencias entre almacenes
- Valorización automática por **PMP, FIFO o LIFO**
- Kardex detallado por producto con historial de lotes
- Alertas automáticas de stock crítico y productos próximos a vencer
- Punto de reorden configurable y previsión de demanda

### 2. 🚚 Flujo Completo de Despachos y Transporte
- Pipeline de 6 estados: `PEDIDO → APROBADO → PICKING → LISTO → DESPACHADO → ENTREGADO`
- Generación automática de **Guía de Remisión** (PDF imprimible)
- Módulo de transportes con gestión de rutas, transportistas y seguimiento por parada
- Cálculo de eficiencia de entregas y control de devoluciones

### 3. 🛒 Gestión de Compras
- Órdenes de Compra con flujo de aprobación
- Cotizaciones a proveedores (RFQ) con comparativa
- PDF automático para OC y RFQ
- Historial de precios por proveedor

### 4. 🛡️ Auditoría y Seguridad
- Log completo de todas las operaciones del sistema (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
- Sistema de roles y permisos granular (Admin, Supervisor, Almacenero + roles custom)
- Exportación del log de auditoría a CSV
- Acceso por módulo configurable por rol

---

## 📁 Módulos del Sistema

| Módulo | Ruta | Descripción |
|---|---|---|
| 📊 Dashboard | `/` | KPIs, gráficos y resumen ejecutivo |
| 🔔 Alertas | `/alertas` | Centro de notificaciones del sistema |
| 📦 Inventario | `/inventario` | Catálogo y stock de productos |
| ⬇️ Entradas | `/entradas` | Registro de ingresos de mercadería |
| ⬆️ Salidas | `/salidas` | Registro de egresos de stock |
| 🔧 Ajustes | `/ajustes` | Ajustes de inventario |
| ↩️ Devoluciones | `/devoluciones` | Devoluciones cliente/proveedor |
| 🔀 Transferencias | `/transferencias` | Entre almacenes |
| 🛒 Órdenes de Compra | `/ordenes` | Ciclo completo de compras |
| 📝 Cotizaciones | `/cotizaciones` | RFQ a proveedores |
| 🏭 Proveedores | `/proveedores` | Gestión de proveedores |
| 👥 Clientes | `/clientes` | CRM básico de clientes |
| 🚚 Despachos | `/despachos` | Pedidos y guías de remisión |
| 🗺️ Transportes | `/transportes` | Rutas, tracking y transportistas |
| 📖 Kardex | `/kardex` | Historial valorizado por producto |
| ⏰ Vencimientos | `/vencimientos` | Control de fechas de caducidad |
| 📉 Punto de Reorden | `/reorden` | Alertas de reposición |
| 📈 Previsión | `/prevision` | Proyección de demanda |
| 📊 Reportes | `/reportes` | Análisis ABC, rotación y valorizado |
| 🔄 Movimientos | `/movimientos` | Historial completo de transacciones |
| 🏷️ Maestros | `/maestros` | Categorías y almacenes |
| 👤 Usuarios | `/usuarios` | Gestión de usuarios y roles |
| 🛡️ Auditoría | `/auditoria` | Log de operaciones (solo admin) |
| ⚙️ Configuración | `/configuracion` | Parámetros del sistema |

---

## ✅ Requisitos Previos

Antes de instalar, asegúrate de tener:

```bash
node --version   # >= 18.0.0
npm --version    # >= 9.0.0
```

> 💡 Recomendamos usar [nvm](https://github.com/nvm-sh/nvm) para gestionar versiones de Node.

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/stockpro-logistica.git
cd stockpro-logistica
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Instalar dependencias PWA *(opcional — para funcionalidad offline)*

```bash
npm install vite-plugin-pwa workbox-window --save-dev
```

### 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

El sistema estará disponible en: **http://localhost:5173**

### 5. Compilar para producción

```bash
npm run build
```

Los archivos optimizados se generan en `/dist`.

### 6. Previsualizar build de producción

```bash
npm run preview
```

---

## 🖥️ Uso

### Credenciales de acceso (demo)

El sistema incluye datos demo precargados. Usa cualquiera de estas cuentas:

| Usuario | Email | Contraseña | Rol |
|---|---|---|---|
| Admin Demo | `admin@stockpro.pe` | `admin123` | Administrador |
| Supervisor Demo | `supervisor@stockpro.pe` | `super123` | Supervisor |
| Almacenero Demo | `almacenero@stockpro.pe` | `alm123` | Almacenero |

> ⚠️ **Nota**: Los datos demo se cargan automáticamente en el primer inicio. Para forzar la recarga de datos ejecuta en la consola del navegador:
> ```javascript
> localStorage.removeItem('sp_demo_version'); location.reload()
> ```

### Flujo recomendado para empezar

```
1. Configuración → Ajusta empresa, RUC, moneda y método de valorización
2. Maestros     → Crea tus categorías y almacenes
3. Inventario   → Registra tus productos con stock inicial (Entradas)
4. Proveedores  → Agrega tus proveedores
5. Clientes     → Registra tus clientes
6. Despachos    → Gestiona pedidos y entregas
```

---

## 📂 Estructura del Proyecto

```
stockpro-logistica/
├── 📄 index.html                    # Punto de entrada HTML
├── 📄 vite.config.js               # Configuración de Vite + PWA
├── 📄 package.json
├── 📁 public/
│   └── favicon.png                  # Favicon del sistema
└── 📁 src/
    ├── 📄 App.jsx                   # Router principal + Error Boundary
    ├── 📄 main.jsx                  # Punto de entrada React + init demo
    ├── 📄 index.css                 # Estilos globales + Tailwind
    ├── 📁 assets/
    │   ├── logo.png                 # Logo del sistema
    │   └── favicon.png
    ├── 📁 components/
    │   ├── 📁 layout/
    │   │   └── Sidebar.jsx          # Navegación lateral
    │   └── 📁 ui/
    │       ├── index.jsx            # Componentes: Modal, Btn, Badge, Field...
    │       ├── DireccionInput.jsx   # Input con autocompletado Nominatim
    │       ├── FechaRango.jsx       # Selector de rango de fechas dd/mm/aaaa
    │       └── DateInput.jsx        # Input de fecha individual
    ├── 📁 pages/                    # 27 módulos de la aplicación
    │   ├── Dashboard.jsx
    │   ├── Inventario.jsx
    │   ├── Despachos.jsx
    │   └── ... (24 módulos más)
    ├── 📁 services/
    │   ├── storage.js               # Capa de datos + auditoría automática
    │   └── initDemo.js              # Dataset demo versionado (v2.5.0)
    ├── 📁 store/
    │   └── AppContext.jsx           # Estado global (Context + useReducer)
    └── 📁 utils/
        ├── helpers.js               # Utilidades: formatDate, estadoStock...
        ├── valorizacion.js          # Motor PMP / FIFO / LIFO
        └── pdfTemplates.js          # Generación de PDF (OC, RFQ, Guía)
```

---

## 🏗️ Arquitectura de Datos

```
src/services/storage.js
│
├── 📦 Inventario      sp_productos, sp_categorias, sp_almacenes
├── 🔄 Movimientos     sp_movimientos, sp_ajustes, sp_devoluciones, sp_transferencias
├── 🛒 Compras         sp_ordenes, sp_cotizaciones, sp_proveedores
├── 👥 CRM             sp_clientes, sp_despachos
├── 🚚 Transporte      sp_transportistas, sp_rutas
├── 👤 Accesos         sp_usuarios, sp_session, sp_roles_custom
├── ⚙️ Config          sp_config, sp_notif, sp_alertas_leidas
└── 🛡️ Auditoría       sp_auditoria (500 registros max, FIFO)
```

> 🔌 **Migración a Backend**: Para conectar con una API REST, solo modifica las funciones en `src/services/storage.js`. El resto de la aplicación no necesita cambios gracias a la abstracción de la capa de datos.

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. **Fork** el repositorio
2. Crea tu rama de funcionalidad:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Haz commit de tus cambios:
   ```bash
   git commit -m "feat: agrega nueva funcionalidad"
   ```
4. Push a tu rama:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. Abre un **Pull Request**

### Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     cambios en documentación
style:    cambios de formato
refactor: refactorización de código
test:     adición de pruebas
chore:    cambios en configuración
```

### Ideas para contribuir

- [ ] Integración con API REST (Node.js / Laravel)
- [ ] Módulo de reportes con exportación a Excel
- [ ] Dashboard de analytics avanzado
- [ ] Módulo de facturación electrónica SUNAT
- [ ] App móvil con React Native
- [ ] Integración con WhatsApp Business API para notificaciones

---

## 🐛 Reporte de Bugs

Si encuentras un bug, por favor abre un [Issue](../../issues) con:

- **Descripción** clara del problema
- **Pasos** para reproducirlo
- **Comportamiento esperado** vs actual
- **Capturas de pantalla** si aplica
- **Entorno**: OS, navegador y versión

---

## 📄 Licencia

Distribuido bajo la **Licencia MIT**. Consulta el archivo [`LICENSE`](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2026 StockPro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 📬 Contacto

**Proyecto**: StockPro — Gestión Logística  
**Repositorio**: [github.com/tu-usuario/stockpro-logistica](https://github.com/tu-usuario/stockpro-logistica)  
**Email**: [tu-email@ejemplo.com](mailto:tu-email@ejemplo.com)

---

<div align="center">

**¿Te fue útil este proyecto? ¡Dale una ⭐ en GitHub!**

Hecho con ❤️ para las PYMEs peruanas

![Footer](https://placehold.co/800x60/0f1520/00c896?text=StockPro+v2.5.0+—+Gestión+Logística+para+PYMEs)

</div>

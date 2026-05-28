# 📦 StockPro — Frontend de Gestión Logística

Aplicación web para la gestión logística orientada a operaciones de inventario, almacenes, despachos, reportes y control operativo. Este repositorio contiene el **frontend SPA** construido con React + Vite, con soporte **PWA/offline** para mejorar continuidad operativa y experiencia de usuario.

---

## 🧰 Stack Tecnológico

### Frontend
- **React 19** (`react`, `react-dom`)
- **React Router DOM 7** (enrutamiento SPA)
- **Vite 7** (bundler y servidor de desarrollo)
- **Tailwind CSS 4** + `@tailwindcss/vite`
- **Recharts** (gráficos y analítica visual)
- **Lucide React** (iconografía)
- **date-fns** (manejo de fechas)

### Exportación y utilidades
- **jsPDF** + **jspdf-autotable** (reportes PDF)
- **xlsx** (exportación Excel)

### PWA / Offline
- **vite-plugin-pwa**
- **workbox-window**

### Calidad de código
- **ESLint 9** + plugins para React Hooks y React Refresh

---

## ✨ Características Principales (Features)

- Gestión modular de procesos logísticos (inventario, entradas, salidas, transferencias, despachos, reportes).
- Arquitectura por dominios (`modules/`) y páginas de negocio (`pages/`) para escalabilidad.
- Context API + hooks personalizados para manejo de estado y reglas de negocio.
- Capa de servicios desacoplada (`src/services`) para API, validaciones, almacenamiento y cola offline.
- Exportación de información a PDF/XLSX.
- Soporte PWA con auto-actualización y cacheo mediante Workbox.
- Diseño orientado a operación diaria (componentes UI reutilizables y layout administrativo).

---

## ✅ Requisitos Previos

Instala en tu entorno local:

- **Node.js 18+** (recomendado: Node.js 20 LTS)
- **npm 9+** (incluido con Node.js)
- **Git**

Verificación rápida:

```bash
node -v
npm -v
git --version
```

---

## 🏗️ Arquitectura del Proyecto

Estructura principal del repositorio:

```text
.
├── public/                      # Assets públicos (favicon, redirects, etc.)
├── src/
│   ├── assets/                  # Recursos estáticos de la app
│   ├── components/
│   │   ├── layout/              # Estructura visual principal (Layout, Sidebar)
│   │   └── ui/                  # Componentes reutilizables de interfaz
│   ├── context/                 # Contextos globales (auth, inventory, locations, etc.)
│   ├── data/                    # Datos semilla/demo y catálogos estáticos
│   ├── hooks/                   # Hooks personalizados por dominio
│   ├── modules/                 # Módulos funcionales por dominio de negocio
│   ├── pages/                   # Páginas principales y vistas de alto nivel
│   ├── services/                # Capa de acceso a datos, API, offline queue y storage
│   ├── store/                   # Estado global adicional (AppContext)
│   ├── utils/                   # Utilidades (exports, helpers, templates)
│   ├── App.jsx                  # Componente raíz
│   └── main.jsx                 # Bootstrap de la aplicación
├── vite.config.js               # Configuración Vite + PWA + alias '@'
├── eslint.config.js             # Configuración de lint
└── package.json                 # Scripts y dependencias
```

---

## ⚙️ Configuración e Instalación

### 1) Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd logistica
```

### 2) Instalar dependencias

```bash
npm install
```

### 3) Configurar variables de entorno (`.env`)

Este frontend puede funcionar en modo local/demo; si conectas API externa, crea un archivo `.env` en la raíz:

```bash
# .env
VITE_API_URL=http://localhost:3000
```

> Nota: las variables en Vite deben iniciar con `VITE_`.

### 4) Ejecutar migraciones (si aplica)

En este repositorio **no aplica**, ya que corresponde a una aplicación frontend y no incluye motor de migraciones de base de datos (Prisma/Sequelize/TypeORM).

### 5) Iniciar servidor en desarrollo

```bash
npm run dev
```

Vite mostrará la URL local (normalmente `http://localhost:5173`).

---

## 📜 Scripts Disponibles

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `npm run dev` | Inicia el servidor de desarrollo con Vite |
| `build` | `npm run build` | Genera el build de producción |
| `preview` | `npm run preview` | Sirve localmente el build generado para validación |
| `lint` | `npm run lint` | Ejecuta análisis estático con ESLint |

---

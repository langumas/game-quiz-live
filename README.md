# 🎮 GAME QUIZ LIVE — TikTok LIVE & OBS Interactive Quiz Show

Aplicación web interactiva en formato vertical **9:16 (1080 × 1920)** diseñada para transmisiones de **TikTok LIVE** mediante **OBS Studio**.

---

## 🚀 Inicio Rápido

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor (Node.js + Socket.IO) y cliente (React + Vite):**
   ```bash
   npm run dev
   ```
   - **Panel de Administración:** `http://localhost:5173/admin`
   - **Overlay Independiente para OBS (9:16):** `http://localhost:5173/overlay`
   - **Servidor Backend + Socket.IO:** `http://localhost:3001`

---

## 🎥 Configuración en OBS Studio

1. En OBS Studio, añade una fuente de tipo **Navegador (Browser Source)**.
2. Configura las siguientes propiedades:
   - **URL:** `http://localhost:5173/overlay`
   - **Ancho (Width):** `1080`
   - **Alto (Height):** `1920`
3. Si deseas sobreponer el quiz encima de tu cámara o gameplay, activa el botón **"Fondo OBS: Transparente"** en la barra superior del Panel de Administración (`/admin`).

---

## 🕹️ Arquitectura y Características Principales

- **Separación estricta entre Lógica del Juego y TikTok LIVE:**
  - [`server/gameEngine.ts`](./server/gameEngine.ts): Motor puro del concurso (fases `LOBBY`, `QUESTION`, `PAUSED`, `REVEAL`, `ENDED`, reloj en tiempo real, cálculo de puntos por dificultad, bono de velocidad, bono al primero en acertar, rachas con multiplicador, escudos de racha y comodines).
  - [`server/tiktokAdapter.ts`](./server/tiktokAdapter.ts): Adaptador desacoplado basado en `tiktok-live-connector`. Si no hay conexión activa a un `@usuario` en vivo, **no genera datos falsos automáticos** y opera exclusivamente con el **Modo Prueba / Simulación** manual desde el panel.
  - [`server/storage.ts`](./server/storage.ts): Persistencia local automática en JSON (`server/data/store.json`) con banco inicial de 30 preguntas de videojuegos en español, categorías y configuración de regalos, además de cliente listo para Supabase (`SUPABASE_URL` y `SUPABASE_ANON_KEY`).


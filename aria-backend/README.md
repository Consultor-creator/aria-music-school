# Aria Music School — Backend

Backend completo (Node.js + Express + PostgreSQL) para el dashboard y la web pública de Aria Music School.

## Estructura

```
aria-backend/
├── server.js                  Servidor Express principal
├── db.js                      Pool de conexión PostgreSQL
├── package.json               Dependencias
├── railway.json               Config de Railway
├── .env.example               Variables de entorno
├── migrations/
│   ├── 001_initial.sql        Esquema de la base de datos
│   └── run.js                 Ejecuta migraciones
├── seeds/
│   ├── 001_demo_data.sql      Datos iniciales (Ariadna, conciertos demo)
│   └── run.js                 Ejecuta seeds + hashea password admin
├── middleware/
│   └── auth.js                JWT auth (requireAuth, requireAdmin)
├── routes/
│   ├── auth.js                POST /api/auth/login
│   ├── teachers.js            CRUD maestros
│   ├── students.js            CRUD estudiantes
│   ├── classes.js             CRUD clases (precios)
│   ├── concerts.js            CRUD conciertos + participantes
│   └── media.js               CRUD galería + upload
├── public/
│   ├── dashboard.html         (poner aquí tu dashboard)
│   ├── website.html           (poner aquí tu web pública)
│   └── js/
│       └── api.js             Cliente API para frontend
└── uploads/                   Fotos/videos subidos (volumen en producción)
```

## Deploy a Railway en 8 pasos

### 1. Sube el código a GitHub

```bash
cd aria-backend
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/aria-music-school.git
git push -u origin main
```

### 2. Pon tus archivos HTML del frontend

Copia tu `aria-music-school-dashboard.html` y `aria-music-school-website.html` a la carpeta `public/`:

```bash
cp ruta/a/aria-music-school-dashboard.html public/dashboard.html
cp ruta/a/aria-music-school-website.html public/website.html
```

Y antes del `</body>` de cada archivo, añade:

```html
<script src="/js/api.js"></script>
```

### 3. Crea proyecto en Railway

- Ve a [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
- Selecciona el repo `aria-music-school`

### 4. Añade PostgreSQL

- En el proyecto Railway → `+ New` → `Database` → `Add PostgreSQL`
- Railway crea automáticamente la variable `DATABASE_URL`

### 5. Configura variables de entorno

En Railway → tu servicio → Variables → añade:

| Variable | Valor |
|---|---|
| `JWT_SECRET` | (string aleatorio largo — ver abajo cómo generarlo) |
| `ADMIN_DEFAULT_PASSWORD` | una contraseña temporal para Ariadna |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` (luego restringirás al dominio de la web) |

Para generar `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6. Inicializa la base de datos

En Railway, abre la **Shell** de tu servicio (botón terminal) y corre:

```bash
npm run migrate
npm run seed
```

Esto crea las tablas y carga a Ariadna como admin con la contraseña que pusiste en `ADMIN_DEFAULT_PASSWORD`.

### 7. (Opcional pero recomendado) Añade un volumen para uploads

Sin esto, las fotos/videos se borran cada vez que Railway redeploya.

- En tu servicio → Settings → Volumes → New Volume
- Mount path: `/data`
- Luego en Variables añade: `UPLOAD_DIR=/data/uploads`

### 8. Listo

Railway te da una URL pública tipo `aria-music-school-production.up.railway.app`.

- Web pública: `https://tu-url.railway.app/`
- Dashboard: `https://tu-url.railway.app/dashboard`
- API health: `https://tu-url.railway.app/api/health`

Para usar tu dominio propio (ej. `ariamusicschool.com`):
- Railway → Settings → Domains → Add custom domain → seguir instrucciones DNS.

---

## Cambiar contraseña de admin

Después del primer login, accede a la base de datos y corre:

```sql
-- Genera un bcrypt hash con: node -e "console.log(require('bcrypt').hashSync('TuNuevaPassword', 10))"
UPDATE users SET password_hash = '<hash>' WHERE email = 'ariadnabt07@gmail.com';
```

O construye una pantalla de "Cambiar contraseña" en el dashboard usando `PUT /api/users/me` (a implementar).

---

## Desarrollo local

```bash
npm install
cp .env.example .env
# edita .env y pon una DATABASE_URL local
npm run migrate
npm run seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## API endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✅ | Usuario actual |
| GET | `/api/teachers` | — | Lista maestros activos |
| GET | `/api/teachers/:id` | — | Detalle de maestro |
| POST | `/api/teachers` | ✅ | Crear maestro |
| PUT | `/api/teachers/:id` | ✅ | Editar maestro |
| DELETE | `/api/teachers/:id` | ✅ | Eliminar maestro |
| GET | `/api/students` | ✅ | Lista estudiantes |
| POST | `/api/students` | ✅ | Crear estudiante |
| PUT | `/api/students/:id` | ✅ | Editar estudiante |
| DELETE | `/api/students/:id` | ✅ | Eliminar estudiante |
| GET | `/api/classes` | — | Lista clases (precios) |
| POST | `/api/classes` | ✅ | Crear clase |
| PUT | `/api/classes/:id` | ✅ | Editar clase |
| DELETE | `/api/classes/:id` | ✅ | Eliminar clase |
| GET | `/api/concerts` | — | Lista conciertos públicos |
| GET | `/api/concerts?upcoming=true` | — | Solo próximos |
| GET | `/api/concerts/:id` | — | Detalle con participantes |
| POST | `/api/concerts` | ✅ | Crear concierto |
| PUT | `/api/concerts/:id` | ✅ | Editar concierto |
| DELETE | `/api/concerts/:id` | ✅ | Eliminar concierto |
| POST | `/api/concerts/:id/participants` | ✅ | Agregar participante |
| PUT | `/api/concerts/:id/participants/:pid` | ✅ | Editar participante |
| DELETE | `/api/concerts/:id/participants/:pid` | ✅ | Quitar participante |
| GET | `/api/media` | — | Lista galería pública |
| POST | `/api/media/upload` | ✅ | Subir foto/video (multipart) |
| POST | `/api/media` | ✅ | Añadir URL externa (YouTube) |
| PUT | `/api/media/:id` | ✅ | Editar media |
| DELETE | `/api/media/:id` | ✅ | Eliminar media |

---

## Uso desde el frontend

```js
// Login
await AriaAPI.login('ariadnabt07@gmail.com', 'mi-password');

// Listar conciertos próximos
const concerts = await AriaAPI.concerts.upcoming();

// Crear concierto
const c = await AriaAPI.concerts.create({
  name: 'Recital de Otoño',
  concert_date: '2026-10-15',
  concert_time: '19:00',
  location: 'First Parish of Westwood',
  description: 'Una velada de música clásica.',
  status: 'published',
  published: true,
});

// Añadir participante
await AriaAPI.concerts.addParticipant(c.id, {
  student_name: 'Emma Rodríguez',
  instrument: 'Piano',
  piece: 'Nocturne Op. 9 No. 2',
  composer: 'Chopin',
});

// Subir foto al gallery
const file = document.querySelector('input[type=file]').files[0];
await AriaAPI.media.upload(file, {
  title: 'Recital de primavera',
  event_name: 'Spring Recital',
  event_date: '2025-05-30',
});
```

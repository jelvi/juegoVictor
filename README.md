# Yincana — Aplicación de gestión de yincana

Aplicación web fullstack para organizar una yincana (scavenger hunt) para niños de 10–13 años.

## Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Auth:** JWT en localStorage
- **Tiempo real:** polling cada 4 segundos

---

## Estructura

```
/
├── client/          # React (Vite)
├── server/          # Express API
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── db/
│       └── schema.sql
└── shared/
    └── ciphers.js   # Lógica de cifrado compartida
```

---

## Instalación local (desarrollo)

### 1. Requisitos

- Node.js ≥ 18
- PostgreSQL ≥ 14

### 2. Clonar y configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de base de datos
```

### 3. Crear la base de datos y ejecutar el schema

```bash
createdb yincana
psql $DATABASE_URL -f server/db/schema.sql
```

### 4. Instalar dependencias

```bash
npm run install:all
```

### 5. Crear el admin inicial

```bash
npm run seed
```

### 6. Arrancar en desarrollo

```bash
# En dos terminales:
npm run dev:server    # Puerto 3001
npm run dev:client    # Puerto 5173
```

---

## Despliegue en EC2 (Ubuntu / Amazon Linux)

### 1. Preparar el servidor

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Crear la base de datos

```bash
sudo -u postgres psql -c "CREATE USER yincana WITH PASSWORD 'tu_password';"
sudo -u postgres psql -c "CREATE DATABASE yincana OWNER yincana;"
```

### 3. Subir el código

```bash
# Desde tu máquina local:
scp -r . ubuntu@<EC2_IP>:~/yincana
# O con git clone si tienes el repo en GitHub
```

### 4. Configurar variables de entorno

```bash
cd ~/yincana
cp .env.example .env
nano .env
# Rellenar DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
```

### 5. Preparar la base de datos y el admin

```bash
psql $DATABASE_URL -f server/db/schema.sql
npm run install:all
npm run seed
```

### 6. Build del frontend

```bash
npm run build:client
```

El build queda en `client/dist/`. El servidor Express lo sirve estáticamente en producción.

### 7. Arrancar con PM2

```bash
cd ~/yincana
NODE_ENV=production pm2 start server/index.js --name yincana
pm2 save
pm2 startup   # Seguir las instrucciones que imprime para que arranque al reiniciar
```

### 8. Configurar nginx como proxy inverso

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/yincana
```

Contenido del archivo nginx:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;   # o la IP pública de EC2

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/yincana /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. (Opcional) HTTPS con Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## Variables de entorno

Ver `.env.example` para la lista completa.

| Variable         | Descripción                          | Ejemplo                              |
|------------------|--------------------------------------|--------------------------------------|
| `DATABASE_URL`   | Cadena de conexión PostgreSQL        | `postgresql://user:pass@host/db`     |
| `JWT_SECRET`     | Secreto para firmar tokens JWT       | cadena aleatoria larga               |
| `JWT_EXPIRES_IN` | Duración del token admin             | `8h`                                 |
| `PORT`           | Puerto del servidor Express          | `3001`                               |
| `NODE_ENV`       | `development` o `production`         | `production`                         |
| `ADMIN_USERNAME` | Usuario del admin inicial (seed)     | `admin`                              |
| `ADMIN_PASSWORD` | Contraseña del admin inicial (seed)  | contraseña segura                    |

---

## Roles y acceso

| Ruta                        | Quién accede |
|-----------------------------|-------------|
| `/admin`                    | Admin       |
| `/admin/login`              | Admin       |
| `/admin/games/:id`          | Admin       |
| `/admin/games/:id/live`     | Admin (panel en vivo con polling) |
| `/join/:invite_token`       | Equipo (enlace de invitación) |
| `/play/:teamId`             | Equipo (pantalla de juego) |

---

## Tipos de puzzle (Fase 1)

| Tipo            | Descripción                                  |
|-----------------|----------------------------------------------|
| `cesar`         | Cifrado César con alfabeto español (incluye Ñ) |
| `morse`         | Código Morse internacional                   |
| `mirror`        | Texto invertido                              |
| `emoji`         | Tabla configurable emoji ↔ letra             |
| `number_letter` | A=1 o A=27, correlativo                      |

Para añadir un nuevo tipo en Fase 2:
1. Exportar `encode()` y `generateHintMaterial()` en `shared/ciphers.js`
2. Registrarlo en `CIPHER_REGISTRY`
3. Añadir su formulario en `client/src/pages/admin/PuzzleForm.jsx`

---

## Comandos útiles de PM2

```bash
pm2 status          # Estado de los procesos
pm2 logs yincana    # Ver logs en tiempo real
pm2 restart yincana # Reiniciar
pm2 stop yincana    # Parar
```

FROM node:20-alpine
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias e instalar incluyendo devDependencies para compilar
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copiar el código fuente y compilar
COPY . .
RUN pnpm build

# Podar dependencias de desarrollo para producción
RUN pnpm prune --prod

# Exponer el puerto del servidor backend
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Ejecutar el servidor compilado
CMD ["node", "dist/index.js"]

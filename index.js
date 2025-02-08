const express = require('express');
const session = require('express-session');
require('dotenv').config();
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swaggerConfig');
app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  credentials: true,
  exposedHeaders: ['Content-Disposition'] // Añadir si es necesario
}));

// Configuración de archivos estáticos para la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Ruta específica para servir comprobantes con encabezados correctos
app.get('/uploads/comprobantes/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', 'comprobantes', filename);

  if (path.extname(filePath).toLowerCase() === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error al enviar el archivo:', err);
      res.status(404).send('Archivo no encontrado');
    }
  });
});

const PORT = process.env.PORT || 3000;

// Configuración de la sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const componentRoutes = require('./routes/componentRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const componentMovementRoutes = require('./routes/componentMovementRoutes');
const academicPeriodRoutes = require('./routes/academicPeriodRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Rutas de la API
app.use('/components', componentRoutes);
app.use('/users', userRoutes);
app.use('/requests', requestRoutes);
app.use('/categories', categoryRoutes);
app.use('/component-movements', componentMovementRoutes);
app.use('/academic-periods', academicPeriodRoutes);
app.use('/reports', reportRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

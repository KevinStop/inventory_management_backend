const multer = require('multer');
const path = require('path');

// Configuración del almacenamiento dinámico
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder;
    if (req.baseUrl.includes('/users')) {
      folder = 'users';
    } else if (req.baseUrl.includes('/requests')) {
      folder = 'comprobantes';
    } else if (req.baseUrl.includes('/components')) {
      folder = 'componentes';
    } else {
      return cb(new Error('No se pudo determinar la carpeta de destino'), false);
    }

    cb(null, path.join(__dirname, `../uploads/${folder}`));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split('.').pop();
    cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
  },
});

// Validar tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Tipo de archivo no permitido. Solo se permiten imágenes y PDFs (.jpg, .jpeg, .png, .pdf)'
      ),
      false
    );
  }
};

// Configuración de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Tamaño máximo 5 MB
  },
});

module.exports = upload;

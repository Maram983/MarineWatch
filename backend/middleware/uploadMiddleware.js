const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|webm|ogg|mkv/;
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowed = allowedTypes.test(ext);

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

module.exports = upload;

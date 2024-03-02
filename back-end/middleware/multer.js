const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage(
    {
        destination: (req, files, cb) => {
            cb(null, 'back-end/Files');
        },
        filename: (req, files, cb) => {
            cb(null, Date.now() + '_' + files.originalname);
        }
    }
);
const upload = multer({ storage });

module.exports = upload;
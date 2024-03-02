const router = require('express').Router();
// const multer = require('multer');
// const path = require('path');

// const storage = multer.diskStorage(
//     {
//         destination: (req, files, cb) => {
//             cb(null, 'back-end/Files');
//         },
//         filename: (req, files, cb) => {
//             cb(null, Date.now() + path.extname(files.originalname));
//         }
//     }
// );
// const upload = multer({ storage });
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/multer');
const groupController = require('../controllers/group');

router.post('/participants', authenticate, groupController.knowParticipants);
router.get('/chats', authenticate, groupController.getChats);
router.post('/newMsg', upload.array("files"), authenticate, groupController.sendMsg);
router.get('/info', authenticate, groupController.grpInfo);
router.get('/newUsers', groupController.fetchNonParticipants);
router.post('/addParticipants', authenticate, groupController.addParticipants);
router.put('/makeAdmin/:id', authenticate, groupController.addAdmin);
router.delete('/removeParticipant/:id', authenticate, groupController.removeParticipant);

module.exports = router;
const router = require('express').Router();

const { authenticate } = require('../middleware/authenticate');
const groupController = require('../controllers/group');

router.post('/participants', authenticate, groupController.knowParticipants);
router.get('/chats', authenticate, groupController.getChats);
router.post('/newMsg', authenticate, groupController.sendMsg);
router.post('/addParticipants', authenticate, groupController.addParticipants);
router.put('/addAdmin/:id', authenticate, groupController.addAdmin);
router.delete('/removeParticipant/:id', authenticate, groupController.removeParticipant);

module.exports = router;
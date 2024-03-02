const router = require('express').Router();

const authenticate = require('../middleware/authenticate');
const userController = require('../controllers/user');

router.post('/signup', userController.addUser);

router.post('/login', userController.letUser);

router.post('/update', authenticate, userController.updateConnectionId);

router.get('/groups', authenticate, userController.getGroups);

// router.post('/chat', authenticate, userController.saveChat);

// router.get('/chats', userController.getChats);

router.get('/allusers', authenticate, userController.getUsers);

router.get('/logout', userController.logUserOut);

module.exports = router;
const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const ArchivedChat = sequelize.define('ArchivedChat',
{
    chatsOf: Sequelize.STRING,
    chats: Sequelize.JSON
})

module.exports = ArchivedChat;
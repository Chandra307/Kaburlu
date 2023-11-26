const Sequelize = require('sequelize');
const sequelize = require('../util/database');

const Participant = sequelize.define('participant',
    {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        name: Sequelize.STRING,
        group: Sequelize.STRING,
        isAdmin: Sequelize.BOOLEAN
    });

module.exports = Participant;
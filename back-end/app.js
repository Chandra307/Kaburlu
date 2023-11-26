const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const path = require('path');

const User = require('./models/user');
const Chat = require('./models/chats');
const Group = require('./models/group');
const Participant = require('./models/participants');

const sequelize = require('./util/database');
const userRoutes = require('./routes/user');
const groupRoutes = require('./routes/group');

const app = express();
app.use(cors({
    origin: '*',
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
}));
app.use(express.json());

app.use('/user', userRoutes);
app.use('/group', groupRoutes);
app.use('/', (req, res, next) => {
    res.sendFile(path.join(__dirname, `public/${req.url}`));
})


User.belongsToMany(Group, { through: Participant });
Group.belongsToMany(User, { through: Participant });

Chat.belongsTo(Group);
Group.hasMany(Chat);


sequelize.sync()
// sequelize.sync({ force: true })
.then(_ => app.listen(5000))
.catch(err => console.log(err, 'in sync'));
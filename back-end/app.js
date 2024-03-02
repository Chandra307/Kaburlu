const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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
const server = require('http').createServer(app);

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://192.168.55.103:5000'],
    methods: ["GET", "PUT", "POST", "DELETE"]
}));
app.use(express.json());
app.use(cookieParser());
app.use('/user', userRoutes);
app.use('/group', groupRoutes);

app.use((req, res, next) => {
    console.log('same route - different controller');
    next();
})
app.use((req, res, next) => {
    console.log(req.url, req.url.includes(req.url), req.headers.host);

    if (req.url === '/') {
        res.sendFile(path.join(__dirname, `public/views/login.html`));
    }
    else if (req.url.includes('htm')) {
        res.sendFile(path.join(__dirname, `public/views/${req.url}`));
    } else {
        res.sendFile(path.join(__dirname, `public/${req.url}`))
    }
})
app.use((req, res, next) => {
    console.log('same route - different controller');
    setTimeout(() => res.json('another response'), 2500);
})

User.belongsToMany(Group, { through: Participant });
Group.belongsToMany(User, { through: Participant });

Chat.belongsTo(Group);
Group.hasMany(Chat);

const io = new Server(server);

io.on('connection', socket => {
    socket.on('join-group', group => {
        socket.join(group);
    });
    socket.on('new-msg', (content) => {
        socket.to(content.groupId).emit('sent-msgs', content);
    })
    socket.on('add-member', (user, group, groupId) => {
        socket.to(user).emit('member-added', group, groupId);
    })
    socket.on('made-admin', (user, group, groupId) => {
        socket.to(user).emit('change-status', group, groupId);
    })
    socket.on('removed participant', (connection, group) => {
        socket.to(connection).emit('u r removed', group);
    })
})

sequelize.sync()
    // sequelize.sync({ force: true })
    .then(_ => {
        server.listen(process.env.PORT, () => {
            console.log(`Server with processId - ${process.pid} is up and runnning!`);
        });        
    })
    .catch(err => console.log(err, 'in sync'));
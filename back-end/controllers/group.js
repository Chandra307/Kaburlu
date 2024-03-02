const User = require('../models/user');
const Participant = require('../models/participants');
const Group = require('../models/group');
const Chat = require('../models/chats');
const ArchivedChat = require('../models/archivedChats');
const AWS = require('aws-sdk');
const fs = require('fs');
const { Op } = require('sequelize');
const { CronJob } = require('cron');


const uploadToS3 = (data, fileName, type) => {
    const bucketName = 'trackexpense';

    const S3 = new AWS.S3(
        {
            accessKeyId: process.env.IAM_USER_KEY,
            secretAccessKey: process.env.IAM_USER_SECRET
        }
    )
    var params = {
        Bucket: bucketName,
        Key: fileName,
        Body: data,
        ACL: 'public-read',
        ContentType: type
    };
    return new Promise((res, rej) => {
        S3.upload(params, (err, S3response) => {
            if (err) {
                rej(err);
            } else {
                res({ S3response, type });
            }
        })
    });
}
const job = CronJob.from(
    {
        cronTime: '0 0 * * *',
        onTick: async function () {
            try {
                let date = new Date();
                let yesterday = new Date();
                yesterday.setDate(date.getDate() - 1);
                let prevChats = await Chat.findAll(
                    {
                        where: { createdAt: { [Op.between]: [yesterday, date] } },
                    });
                prevChats = JSON.stringify(prevChats);
                await ArchivedChat.create(
                    {
                        chatsOf: yesterday.toLocaleDateString(),
                        chats: prevChats
                    }
                );
                await Chat.destroy(
                    {
                        where: { createdAt: { [Op.between]: [yesterday, date] } }
                    }
                )
            } catch (err) {
                console.log(err, 'in cron job');
            }
        },
        onComplete: null,
        start: true,
        timeZone: 'system'
    }
);

exports.knowParticipants = async (req, res, next) => {
    try {
        console.log(req.body);
        const { name, participants } = req.body;
        let connections = [];
        const users = await User.findAll({
            where: { id: { [Op.in]: participants } }
        });
        const group = await Group.create({ name, createdBy: req.user.name });
        const promises2 = users.map(user => {
            connections.push(user.connectionID);
            return group.addUser(user, { through: { name: user.name, group: group.name } });
        });
        promises2.push(group.addUser(req.user, { through: { name: req.user.name, group: group.name, isAdmin: true } }));
        const [[{ groupId }]] = await Promise.all(promises2);
        res.status(201).json({ "message": 'Group successfully created', groupId, connections });
    }
    catch (err) {
        console.log(err, 'in adding participants');
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

exports.getChats = async (req, res, next) => {
    try {
        console.log(req.query.id);
        const group = await Group.findOne({ where: { id: req.query.id } });
        const [user] = await group.getUsers({ where: { id: req.user.id } });
        if (!user) {
            return res.status(401).json({ "message": "You aren't a participant of this group to view the messages!" })
        }
        const chats = await group.getChats();
        res.status(200).json({
            "message": 'Chats fetched',
            chats,
            "group": group.name,
            loggedInUser: user.name,
            loggedInUserId: user.id,
            isAdmin: user.participant.isAdmin
        });
    }
    catch (err) {
        console.log(err, 'in getChats');
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

exports.sendMsg = async (req, res, next) => {
    try {
        const { id } = req.query;
        let message = req.body.message;
        let format = 'text';
        let sender = req.user.name;
        const group = await Group.findByPk(id);
        let files;

        if (req.files) {

            const pendingURLs = req.files.map((file) => {

                const fileData = fs.createReadStream(file.path);
                fileData.on('error', err => { console.log(err, 'in readStream'); rej(err); });
                return uploadToS3(fileData, `Files/${req.user.id}/${file.filename}`, file.mimetype);

            });
            files = req.files;
            const urlArray = await Promise.all(pendingURLs);

            const pendingDBPromises = urlArray.map(({ S3response, type }) => {
                return group.createChat({
                    message: S3response.Location,
                    sender,
                    format: type
                })
            });

            if (message) {
                pendingDBPromises.push(group.createChat(
                    { message, sender, format }
                ))
            }
            if (!pendingDBPromises.length) {
                return res.status(400).json(`Hey, you can now send messages and/or images! You didn't send either though!`);
            }
            const chats = await Promise.all(pendingDBPromises);
            res.status(201).json(chats);
        }
    }
    catch (err) {
        console.log(err, 'in sendMsg');
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

exports.grpInfo = async (req, res, next) => {
    try {
        const { grpId } = req.query;
        const group = await Group.findByPk(grpId);
        const participants = await group.getUsers({ where: { id: { [Op.ne]: req.user.id } } });
        res.status(200).json(participants);
    }
    catch (err) {
        res.status(500).json(err);
    }
}

exports.fetchNonParticipants = async (req, res, next) => {
    try {
        const { grpId } = req.query;
        const group = await Group.findByPk(grpId);
        const participantIDs = await group.getUsers({ attributes: ['id'] });
        for (let a = 0; a < participantIDs.length; a++) {
            participantIDs[a] = participantIDs[a].id;
        }
        const users = await User.findAll({ where: { id: { [Op.notIn]: participantIDs } } });
        res.status(200).json(users);
    }
    catch (err) {
        console.log(err, 'notIn');
        res.status(500).json(err);
    }
}

exports.addParticipants = async (req, res, next) => {
    try {
        const { grpId, newParticipants } = req.body;
        const group = await Group.findByPk(grpId);
        const [user] = await group.getUsers({ where: { id: req.user.id } });
        console.log('are you an admin?', user.participant.isAdmin);
        if (!user.participant.isAdmin) {
            return res.status(401).json({ "message": "Only admins can add new participants to the group." });
        }
        const connections = [];
        const promises = newParticipants.map(part => User.findOne({ where: { id: part } }));
        const users = await Promise.all(promises);
        const promises2 = users.map(user => {
            connections.push(user.connectionID);
            return group.addUser(user, { through: { name: user.name, group: group.name } })
        });
        await Promise.all(promises2);
        res.status(201).json({ "message": 'Success', connections });
    }
    catch (err) {
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

exports.addAdmin = async (req, res, next) => {
    try {
        const { grpId } = req.query;
        console.log(req.user.id, grpId)
        const group = await Group.findByPk(grpId);
        const [user] = await group.getUsers({ where: { id: req.user.id } });
        console.log('are you an admin?', user.participant.isAdmin, user.isAdmin);
        if (!user.participant.isAdmin) {
            return res.status(401).json({ "message": "You must be an admin to make others admin." });
        }
        const userId = req.params.id;
        const [participant] = await group.getUsers({ where: { id: userId } });
        await group.addUser(participant, { through: { isAdmin: true } });
        res.status(200).json({ "message": 'Success', connection: participant.connectionID, group });
    }
    catch (err) {
        console.log(err, 'when user update');
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}

exports.removeParticipant = async (req, res, next) => {
    try {
        const { grpId } = req.query;
        const group = await Group.findByPk(grpId);
        const [user] = await group.getUsers({ where: { id: req.user.id } });
        console.log('are you an admin?', user.isAdmin, user.participant.isAdmin);
        if (!user.participant.isAdmin) {
            return res.status(401).json({ "message": "You're not an admin to remove someone from group." });
        }
        const userId = req.params.id;
        const [reqUser] = await group.getUsers({ where: { id: userId } });
        const result = await reqUser.participant.destroy();
        res.status(200).json({ "message": 'Participant removed from the group', result, socketId: reqUser.connectionID });
    }
    catch (err) {
        console.log(err, 'find the error');
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}
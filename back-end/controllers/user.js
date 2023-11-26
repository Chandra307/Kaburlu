const User = require('../models/user');
const Chat = require('../models/chats');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

function isInputInvalid(string) {
    if (!string) {
        return true;
    }
    else {
        return false;
    }
}
function generateJWT(id, name) {
    const payload = { userId: id, userName: name };
    return jwt.sign(payload, process.env.JWT_KEY_SECRET);
}

exports.addUser = async (req, res, next) => {
    try {
        let { name, email, phone, password } = req.body;
        if (isInputInvalid(name) || isInputInvalid(phone) || isInputInvalid(email) || isInputInvalid(password)) {
            return res.status(400).json({ message: 'Please fill all the input fields!' });
        }
        else {
            bcrypt.hash(password, 10, async (err, hash) => {
                try {
                    if (err) {
                        console.log(err, 'while hashing');
                    }
                    password = hash;
                    console.log(password);
                    const newUser = await User.create({
                        name,
                        phone,
                        email,
                        password
                    });
                    res.status(201).json({ message: 'User creation successfull :)', user: newUser });
                }
                catch (err) {
                    // console.log(err, '500: server error');
                    res.status(500).json({ message: 'A user with this e-mail already exists.Please login!', Error: err });
                }
            })
        }
    }
    catch (err) {
        console.log(err, 'in postUser');
        res.status(400).json(err);
    }
}

exports.letUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (isInputInvalid(email) || isInputInvalid(password)) {
            return res.status(400).json({ message: 'Please fill all the fields!' });
        }
        else {
            const user = await User.findOne({ where: { email: email } });
            if (!user) {
                return res.status(404).json({ message: 'User not found, please sign-up!' });
            }
            else {
                bcrypt.compare(password, user.password, (err, result) => {
                    // try {
                    if (err) {
                        console.log(err, 'while bcrypt was comparing');
                    }
                    else if (!result) {
                        return res.status(401).json({ message: 'Password incorrect!' });
                    }
                    else {
                        res.status(200).json({ message: 'Log in successful!', token: generateJWT(user.id, user.name) });
                    }
                    // }
                    // catch (err) {
                    //     console.log(err);
                    // }
                })
            }
        }
    }
    catch (err) {
        res.status(500).json(err);
    }
}

exports.saveChat = async (req, res, next) => {
    try {
        const { message } = req.body;
        const result = await req.user.createChat({ message, sender: req.user.name });
        res.status(201).json({ message: 'success', result });

    }
    catch (err) {
        res.status(500).json(err);
    }
}

exports.getChats = async (req, res, next) => {
    try {
        const totalChats = await Chat.count();
        let lastId = req.query.id;
        if (lastId === 'undefined') {
            lastId = -1;
        }
        console.log(totalChats, lastId);
        res.json(
            {
                "chats": await Chat.findAll({ where: { id: { [Op.gt]: lastId } }, OFFSET: totalChats - 10, attributes: ['id', 'sender', 'message'] }),
                "oldChats": totalChats > 10
            }
        );
    }
    catch (err) {
        console.log(err, 'in fetching chats');
        res.status(500).json({ "message": 'Something went wrong!', "Error": err });
    }
}
exports.getUsers = async (req, res, next) => {
    try {
        res.status(200).json(await User.findAll({ where: { id: { [Op.ne]: req.user.id } } }));
    }
    catch (err) {
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}
exports.getGroups = async (req, res, next) => {
    try {
        const groups = await req.user.getGroups();
        res.status(200).json({ "message": "success", groups });
    }
    catch (err) {
        res.status(500).json({ "message": "Something went wrong!", "Error": err });
    }
}
const User = require('../models/user');
const jwt = require('jsonwebtoken');

exports.authenticate = async (req, res, next) => {

        jwt.verify(req.headers.authorization, process.env.JWT_KEY_SECRET, async (err, payload) => {
            try {
                if (err) {
                    console.log(err, 'in jwt.verify');
                    return res.status(500).json({ "message": "Something went wrong, please login again!"})
                }
                console.log(payload, 'after jwt.verified');
                const user = await User.findOne({ where: { id: payload.userId } });
                if (!user) {
                    return res.status(404).json({ "message": 'User doesn\'t exist!' });
                }
                req.user = user;
                next();
            }
            catch (err) {
                res.status(500).json({ "message": "Something went wrong!", "Error": err });
            }
        })
}

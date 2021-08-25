const express = require("express");
const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config;
const { port } = require('./config')
const speakeasy = require("speakeasy");
const app = express();

const dbConfig = new Config("myDataBase", true, true, '/')
const db = new JsonDB(dbConfig);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    res.send("Welcome to the two factor authentication exmaple")
});

app.post("/register", (req, res) => {
    //register user into temporary database after checking if user already exists in db    
    const path = `/${req.body.username}`;

    let userexist;
    //checks if user exists or not
    try {
        db.getData(path)
        userexist = 1;
        console.log(req.body.username + ' user exists');
    } catch (error) {
        userexist = 0
        console.log(req.body.username + ' user does not exist');
    }
    //if user exists end response if not create user, generate secret key and store user with key 
    if (userexist) {
        res.end("try another username")
    } else {
        try {
            const secret = speakeasy.generateSecret();
            db.push(path, { secret });
            res.send({ user: req.body.username, secret: secret.base32 })
        } catch (e) {
            console.log(e);
            res.status(500).json({ message: 'Error generating secret key' })
        }
    }
})

app.post("/login", (req, res) => {

    //check if user exists in db or not
    let userexist;
    let path = `/${req.body.username}`
    try {
        db.getData(path)
        userexist = 1;
        console.log(req.body.username + " trying to login ");
    } catch (error) {
        userexist = 0
    }

    //if user exists verify the token 
    if (userexist) {
        const { username, token } = req.body;
        try {
            const user = db.getData(path);
            const { base32: secret } = user.secret;
            const tokenValidates = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window: 5,
            });
            if (tokenValidates) {
                res.json({ validated: true })
            } else {
                res.json({ validated: false })
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error retrieving user' })
        };
    } else {
        res.end('this user does not exists or please check login details')
    }
})

app.listen(port, () => {
    console.log(`App is running on PORT: ${port}.`);
});
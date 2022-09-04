// app.js
// author: Jason Lai

// require the db.js file created so that the code 
// wrote for the Schema and for connecting to the databases is executed
require('./db');

// retrieve the models registered with mongoose
const mongoose = require('mongoose');
const User = mongoose.model('User');
const bannedWordList = mongoose.model('List');
const Admin = mongoose.model('Admin');
const path = require('path');
const fs = require('fs');
const publicPath = path.join(__dirname, 'public');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const salt = 10;
const app = express();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
let textarea = '';
let userLogoutSucc;
let alreadyLogin;
let alreadyLogin2;
let alreadyLogin3;
let chatDecline;
let chatMsgEmpty;
let adminExit;
let adminClearChatOne;
let adminClearChatTwo;
let adminUpdateSucc;
let adminUpdateError;
let adminUpdateEmpty;
let adminDenied;
let adminChatDenied;
let registerBadName;
let registerFail;
let registerSucc;
let registerError;
let registerExisted;
let registerUnknownError;
let loginError;
let loginMissing;
let loginUserNotFound;
let loginCompareError;
let loginWrongPassword;
let loginUnknownError;
let loginSuccess;

app.set('view engine', 'hbs');
app.use(express.static(publicPath));
app.use(cookieParser());
// activate the body parsing middleware
app.use(express.urlencoded({extended: false}));
app.use(session({
    secret: 'add session secret here',
    resave: false,
    saveUninitialized: true,
}));

// passport initialization
app.use(passport.initialize());
app.use(passport.session());

// since there are two logins designated for different
// purposes (one for user and another for admin),
// we need to add custom logic in order to distinguish between the two
// partial reference from:
// https://stackoverflow.com/questions/45897332/passport-js-multiple-de-serialize-methods
passport.serializeUser(function(user, done) {
	if(user instanceof User){
		done(null, {_id: user.id, type: 'User'});
	}
	else{
		done(null, {_id: user.id, type: 'Admin'});
	}
});
passport.deserializeUser(function(id, done) {
	if(id.type === 'User'){
		User.findById(id, function(err, user) {
			done(err, user);
		});
	}
	else{
		Admin.findById(id, function(err, admin) {
			done(err, admin);
		});
	}
});

// set up passport local strategy for user authentication
passport.use(new LocalStrategy(
	function(username, password, done){
		// since username are all stored as lower case in DB,
		// here we should also lower case user input if they
		// enter something that contain a mix of lower or full
		// caps characters
		username = username.toLowerCase();

		User.findOne({username: username}, function(err, user){
			// exception occurred while verifying the credentials
			// e.g. if database is not valid
			if(err){
				return done(err); 
			}
			//user not found
			else if(!user){
				return done(null, false, {notFound: 'user not found'});
			}
			// use bcrypt to verify hashed password
			else{
				bcrypt.compare(password, user.password, function(err, result){
					if(err){
						return done(null, false, {compareError: 'error during compare'});
					}
					else if(result === false){
						return done(null, false, {wrongPassword: 'wrong password'});
					}
					// credentials are valid
					else{
						return done(null, user, {success: 'login success'});
					}
				});
			}
		});
	}
));

// set up admin authentication using passport
passport.use('admin', new LocalStrategy({
	// custom username and password field
	usernameField: 'adminName',
	passwordField: 'adminPassword'
	},
	function(username, password, done){
		Admin.findOne({adminName: username.toLowerCase()}, function(err, admin){
			// database not valid
			if(err){
				return done(err); 
			}
			// admin not found
			else if(!admin){
				return done(null, false, {notFound: 'admin not found'});
			}
			// use bcrypt to verify hashed password
			else{
				bcrypt.compare(password, admin.adminPassword, function(err, result){
					if(err){
						return done(null, false, {compareError: 'admin error during compare'});
					}
					else if(result === false){
						return done(null, false, {wrongPassword: 'admin wrong password'});
					}
					// credentials are valid
					else{
						return done(null, admin, {success: 'admin login success'});
					}
				});
			}
		});
	}
));

// homepage
app.get('/', (req, res) => {
	if(req.user && req.user.username){
		const username = req.user.username;

		res.render('homepage', {adminExit: adminExit, registerSucc: registerSucc, loginSuccess: loginSuccess,
		alreadyLogin: alreadyLogin, alreadyLogin2: alreadyLogin2, alreadyLogin3: alreadyLogin3, username: username,
		adminDenied: adminDenied});
	}
	else if(req.user && req.user.adminName){
		const adminName = req.user.adminName;

		res.render('homepage', {adminExit: adminExit, registerSucc: registerSucc, loginSuccess: loginSuccess,
		alreadyLogin: alreadyLogin, alreadyLogin2: alreadyLogin2, alreadyLogin3: alreadyLogin3, adminName: adminName,
		adminDenied: adminDenied});
	}
	else{
		res.render('homepage', {adminExit: adminExit, registerSucc: registerSucc, loginSuccess: loginSuccess,
		alreadyLogin: alreadyLogin, alreadyLogin2: alreadyLogin2, alreadyLogin3: alreadyLogin3, userLogoutSucc: userLogoutSucc,
		adminDenied: adminDenied});
	}
	
	adminExit = false;
	adminDenied = false;
	registerSucc = false;
	loginSuccess = false;
	alreadyLogin = false;
	alreadyLogin2 = false;
	alreadyLogin3 = false;
	userLogoutSucc = false;
});

app.post('/', (req, res) => {
	if(req.body.userLogout){
		// using passport.js's logout function to log user out
		req.logOut();
		userLogoutSucc = true;
		res.redirect('/');
	}
	// log out admin
	else if(req.body.adminLogout){
		req.logOut();
		adminExit = true;
		res.redirect('/');
	}
});

//chat room page
app.get('/go', (req, res) => {
	// if admin accidentally gets into chat page
	// redirect them back to admin panel
	if(req.user && req.user.adminName){
		adminChatDenied = true;
		res.redirect('/adminPanel');
	}
	// rendering as normal
	else{
		res.render('chat', {chatMsgEmpty: chatMsgEmpty, chatDecline: chatDecline});
		chatMsgEmpty = false;
		chatDecline = false;
	}
});

app.post('/go', (req, res) => {
	let userMsg = req.body.newMsg;
	const room = req.cookies.room;
	const location = `public/files/${room}.txt`;

	// non-registered users are not allowed to chat
	if(!req.user){
		chatDecline = true;
		res.redirect('/go');
	}
	// check if user input msg is empty or only contain
	// spaces, if yes, then generate error, else proceed to send
	// snippet referenced from
	// https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces/50971250
	else if(!userMsg.trim()){
		chatMsgEmpty = true;
		res.redirect('/go');
	}
	// send message, with filter applied
	else{
		userMsg = userMsg.toLowerCase();
		const splitMsg = userMsg.split(' ');
		const username = req.user.username;

		bannedWordList.find({}, (err, list)=> {
			if(err){
				console.log(err);
			}
			else{
				// filter message if contains banned words
				const filteredMsg = splitMsg.map(word => {
					for(let i = 0; i < list[0].wordList.length; i++){
						if(word === list[0].wordList[i]){
							return '***';
						}
					}
					return word;
				});

				fs.appendFile(location, '\n' + `${username}: ${filteredMsg.join(' ')}`, (err) => {
					if(err){
						console.log(err);
					}
					else{
						res.redirect('/go');
					}
				});
			}
		});
	}
});

// page for registering new user account
app.get('/register', (req, res) => {
	if(req.user){
		alreadyLogin2 = true;
		res.redirect('/');
	}
	else{
		res.render('register', {registerFail: registerFail, registerError: registerError, registerExisted: registerExisted,
		registerUnknownError: registerUnknownError, registerBadName: registerBadName});

		registerFail = false;
		registerError = false;
		registerExisted = false;
		registerUnknownError = false;
		registerBadName = false;
	}
});

app.post('/register', (req, res) => {
	let username = req.body.username;
	const password = req.body.password;

	// username cannot be blank
	if(!username.trim() || !password){
		registerFail = true;
		res.redirect('/register');
	}
	// only allow alphanumeric characters in username
	// referenced from: 
	// https://stackoverflow.com/questions/41597685/javascript-test-string-for-only-letters-and-numbers
	else if(!/^[A-Za-z0-9]+$/.test(username)){
		registerBadName = true;
		res.redirect('/register');
	}
	else{
		username = username.toLowerCase();

		//check duplicate username
		User.findOne({username: username}, (err, result) => {
			if(err){
				registerError = true;
				res.redirect('/register');
			}
			else if(result !== null){
				registerExisted = true;
				res.redirect('/register');
			}
			// save hash to db
			else{
				bcrypt.hash(password, salt, (err, hash) => {
					if(err){
						registerError = true;
						res.redirect('/register');
					}
					else{
                        const newUser = new User({
                            username: username,
                            password: hash
                        });

                        // save newly registered user to DB
                        newUser.save((err, user) => {
							if(err){
								registerError = true;
								res.redirect('/register');
							}
							else{
								// log user in
								req.logIn(user, function(err){
									if(err){
										registerUnknownError = true;
										return res.redirect('/register');
									}
									else{
										registerSucc = true;
										return res.redirect('/');
									}
								});
							}
                        });
					}
				});
			}
		});
	}
});

// page for user login
app.get('/login', (req, res) => {
	if(req.user){
		alreadyLogin = true;
		res.redirect('/');
	}
	else{
		res.render('login', {loginMissing: loginMissing, loginUserNotFound: loginUserNotFound,
		loginError: loginError, loginCompareError: loginCompareError, loginWrongPassword: loginWrongPassword,
		loginUnknownError: loginUnknownError});

		loginMissing = false;
		loginUserNotFound = false;
		loginError = false;
		loginCompareError = false;
		loginWrongPassword = false;
		loginUnknownError = false;
	}
});

// using passport.js for user authentication
app.post('/login', (req, res, next) => {
	const username = req.body.username;
	const password = req.body.password;

	if(!username.trim() || !password){
		loginMissing = true;
		res.redirect('/login');
	}
	else{
		passport.authenticate('local', function(err, user, info){
			if(err){
				loginError = true;
				return res.rediect('/login');
			}
			// user not found
			else if(info.notFound){
				loginUserNotFound = true;
				return res.redirect('/login'); 
			}
			// error during password comparison
			else if(info.compareError){
				loginCompareError = true;
				return res.redirect('/login'); 
			}
			// wrong password
			else if(info.wrongPassword){
				loginWrongPassword = true;
				return res.redirect('/login'); 
			}
			// login user if authentication success
			else{
				// using passport.js' logIn function
				req.logIn(user, function(err){
					if(err){
						loginUnknownError = true;
						return res.redirect('/login');
					}
					else{
						loginSuccess = true;
						return res.redirect('/');
					}
				});
			}
		})(req, res, next);
	}
});

// page for admin login
app.get('/admin', (req, res) => {
	if(req.user){
		// if logged in user tries to access admin login page
		// redirect them back to homepage, with warning msg
		if(req.user.username){
			alreadyLogin3 = true;
			res.redirect('/');
		}
		// if it's authenticated admin
		// redirect back to admin panel
		else{
			res.redirect('/adminPanel');
		}
	}
	else{
		res.render('adminLogin', {loginMissing: loginMissing, loginError: loginError, loginUserNotFound: loginUserNotFound,
			loginCompareError: loginCompareError, loginWrongPassword: loginWrongPassword, 
			loginUnknownError: loginUnknownError});

		loginMissing = false;
		loginError = false;
		loginUserNotFound = false;
		loginCompareError = false;
		loginWrongPassword = false;
		loginUnknownError = false;
	}
});

// handle admin login
app.post('/admin', (req, res, next) => {
	const adminName = req.body.adminName;
	const adminPassword = req.body.adminPassword;

	if(!adminName.trim() || !adminPassword){
		loginMissing = true;
		res.redirect('/admin');
	}
	else{
		passport.authenticate('admin', function(err, admin, info){
			if(err){
				loginError = true;
				return res.rediect('/admin');
			}
			// admin not found
			else if(info.notFound){
				loginUserNotFound = true;
				return res.redirect('/admin'); 
			}
			// error during password comparison
			else if(info.compareError){
				loginCompareError = true;
				return res.redirect('/admin'); 
			}
			// wrong password
			else if(info.wrongPassword){
				loginWrongPassword = true;
				return res.redirect('/admin'); 
			}
			// login admin if authentication success
			else{
				// using passport.js' logIn function
				req.logIn(admin, function(err){
					if(err){
						loginUnknownError = true;
						return res.redirect('/admin');
					}
					else{
						loginSuccess = true;
						return res.redirect('/adminPanel');
					}
				});
			}
		})(req, res, next);
	}
});

app.get('/adminPanel', (req, res) => {
	// no login presents
	// access denied
	if(!req.user){
		adminDenied = true;
		res.redirect('/');
	}
	// if someone login as normal chat user
	// and tries to access the admin panel
	// access denied
	else if(req.user.adminName === undefined){
		adminDenied = true;
		res.redirect('/');
	}
	else{
		bannedWordList.find({}, (err, list) => {
			if(err){
				console.log(err);
			}
			else if(list.length === 0){
				const bannedList = new bannedWordList({
					wordList: ['dog']
				});

				bannedList.save();
			}
			else{
				const adminName = req.user.adminName;

				list[0].wordList.forEach(word => {
					textarea += `${word} \n`;
				});

				res.render('adminPanel', {loginSuccess: loginSuccess, adminClearChatOne: adminClearChatOne, 
					adminClearChatTwo: adminClearChatTwo, adminChatDenied: adminChatDenied,
					adminUpdateSucc: adminUpdateSucc, adminUpdateError: adminUpdateError,
					textarea: textarea, adminUpdateEmpty: adminUpdateEmpty, adminName: adminName});

				loginSuccess = false;
				adminClearChatOne = false;
				adminClearChatTwo = false;
				adminUpdateSucc = false;
				adminUpdateError = false;
				adminUpdateEmpty = false;
				adminChatDenied = false;
				textarea = '';
			}
		});
	}
});

// handle request in admin panel
app.post('/adminPanel', (req, res) => {
	// clear chat room 1 msg
	if(req.body.adminClearChatOne){
		fs.writeFile('public/files/room1.txt', 'Drop your chats for room 1:)', (err) => {
			if(err){
				console.log(err);
			}
			else{
				adminClearChatOne = true;
				res.redirect('/adminPanel');
			}
		});
	}
	// clear chat room 2 msg
	else if(req.body.adminClearChatTwo){
		fs.writeFile('public/files/room2.txt', 'Drop your chats for room 2:)', (err) => {
			if(err){
				console.log(err);
			}
			else{
				adminClearChatTwo = true;
				res.redirect('/adminPanel');
			}
		});
	}
	// log out admin
	else if(req.body.leaveAdmin){
		req.logOut();
		adminExit = true;
		res.redirect('/');
	}
	else if(!req.body.newBannedWords.trim()){
		adminUpdateEmpty = true;
		res.redirect('/adminPanel');
	}
	// update banned words list
	else if(req.body.newBannedWords){
		// remove extra white space between commas, then split
		const newBanned = req.body.newBannedWords.replace(/\s/g, '').split(',');

		// since we are modifying banned words list,
		// only letters are allowed, and any input that contains
		// numbers or special characters will be excluded
		const wordsOnly = newBanned.filter(word => {
			return /^[A-Za-z]+$/.test(word) === true;
		});

		// turn every element in the array to lower case
		const lowered = wordsOnly.map(ele => {
			return ele.toLowerCase();
		});

		const bannedList = new bannedWordList({
			wordList: lowered
		});

		bannedWordList.deleteMany({}, function(err){
			if(err){
				console.log(err);
				adminUpdateError = true;
				res.redirect('/adminPanel');
			}
			else{
				bannedList.save((err) => {
					if(err){
						console.log(err);
						adminUpdateError = true;
						res.redirect('/adminPanel');
					}
					else{
						adminUpdateSucc = true;
						res.redirect('/adminPanel');
					}
				});
			}
		});
	}
});

app.listen(process.env.PORT || 3000);
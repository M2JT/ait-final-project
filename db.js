// db.js
// author: Jason Lai
// FINAL DATA MODEL

const mongoose = require('mongoose');

// users
// * our site requires authentication for login
// * users have a username and password
const User = new mongoose.Schema({
  username: {type: String, required: true},
  password: {type: String, required: true}
});

// admins
// * our site requires admin authentication for the admin panel page 
// * admins have a adminName and adminPassword
const Admin = new mongoose.Schema({
  adminName: {type: String, required: true},
  adminPassword: {type: String, required: true}
});

// banned words list
// list for storing banned words across site
// can only be modified by authenticated admin
const List = new mongoose.Schema({
  wordList: {type: Array, required: false},
});

// register models
mongoose.model('List', List);
mongoose.model('User', User);
mongoose.model('Admin', Admin);

// code provided by Professor from instructions
// is the environment variable, NODE_ENV, set to PRODUCTION? 
let dbconf;
if(process.env.NODE_ENV === 'PRODUCTION'){
  // if we're in PRODUCTION mode, then read the configration from a file
  // use blocking file io to do this...
  const fs = require('fs');
  const path = require('path');
  const fn = path.join(__dirname, 'config.json');
  const data = fs.readFileSync(fn);

  // our configuration file will be in json, so parse it and set the
  // conenction string appropriately!
  const conf = JSON.parse(data);
  dbconf = conf.dbconf;
}
// in dev mode 
else{
  // if we're not in PRODUCTION mode, then use
  dbconf = 'mongodb://localhost/aitdev';
}

mongoose.connect(dbconf);
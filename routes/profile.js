var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')
var bcrypt = require('bcrypt');
const saltRounds = 10;

/* GET home page. */

module.exports = (db) => {

 //get profile 
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    const link = 'profile';
    const user = req.session.user
    let sql = `SELECT * FROM user WHERE email = $1`
    db.query(sql, [user.email], (err, data) => {
      if(err) return res.send(err)

      res.render('profile/view', {
        user,
        link,
        data: data.rows[0]
      })
    })   
  });

  router.post('/', helpers.isLoggedIn, function (req, res, next) {
    const user = req.session.user
    
    const {password, firstname, lastname, position, typejob} = req.body

    bcrypt.hash(password , saltRounds, (err, hash) => {
      if(err) return res.send(err)

      let sql = `UPDATE users SET password = '${hash}', firstname = '${firstname}', lastname = '${lastname}', position = '${position}', typejob = '${typejob}' WHERE email = '${user.email}'`
      db.query(sql, (err) => {
        if(err) return res.send(err)

        res.redirect('/profile')
      })
    })
 
  });

  return router;
}


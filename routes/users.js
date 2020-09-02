var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
const bcrypt = require('bcrypt');
const saltRounds = 10;

let checkOptions = {
  Id: true,
  Name: true,
  Position: true,
  Email: true,
  Type: true,
  Role: true
}

module.exports = (db) => {
  /* GET users listing. */
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    const link = 'users'
    const user = req.session.user
    const { checkId, checkName, checkEmail, checkPosition, checkType, id, name, email, position, type } = req.query;
    let result = []
    let search = ""

    if (checkId && id) {
      result.push(`userid = ${parseInt(id)}`)
    }

    if (checkName && name) {
      result.push(`CONCAT(firstname,' ',lastname) ILIKE '%${name}%'`)
    }

    if (checkEmail && email) {
      result.push(`email= '${email}'`)
    }

    if (checkPosition && position) {
      result.push(`position= '${position}'`)
    }

    if (checkType && type) {
      result.push(`typeJob= '${type}'`)
    }

    if (result.length > 0) {
      search += ` WHERE ${result.join(' AND ')}`
    }

    let sqlUser = `SELECT COUNT (userid) AS total from users ${search}`

    db.query(sqlUser, (err, totalUsers) => {
      if (err) return res.send(err)

      let total = totalUsers.rows[0].total
      const url = req.url = '/' ? `/?page=1` : req.url
      const page = req.query.page || 1
      const limit = 3;
      const offset = (page - 1) * limit
      let pages = Math.ceil(total / limit)
      let sqlData = `SELECT userid, email, CONCAT(firstname,' ',lastname) AS fullname, position, typejob, role
      FROM users ${search} ORDER BY userid ASC LIMIT ${limit} OFFSET ${offset}`

      db.query(sqlData, (err, data) => {
        if (err) return res.send(err)

        let users = data.rows;
        res.render('users/list', {
          link,
          users,
          pages,
          page,
          url,
          option: checkOptions,
          user
        })
      })
    })
  });
  router.post('/', helpers.isLoggedIn, function (req, res) {
    checkOptions.Id = req.body.cId
    checkOptions.Name = req.body.cName
    checkOptions.Position = req.body.cPosition
    checkOptions.Email = req.body.cEmail
    checkOptions.Type = req.body.cType
    checkOptions.Role = req.body.cRole

    res.redirect('/users')
  });

  //////////// ADD ///////////
  router.get('/add', helpers.isLoggedIn, (req, res) => {
    const link = 'users';
    res.render('users/add', {
      link,
      user: req.session.user
    })
  })

  router.post('/add', helpers.isLoggedIn, function (req, res, next) {
    const { firstName, lastName, email, password, position, type, role } = req.body


    bcrypt.hash(password, saltRounds, function (err, hash) {
      // Store hash in your password DB.
      if (err) return res.send(err)

      let sql = 'INSERT INTO users(firstname, lastname, email, password, position, typejob, role) VALUES ($1, $2, $3, $4, $5, $6, $7)'
      let values = [firstName, lastName, email, hash, position, type, role]
      db.query(sql, values, (err) => {
        // console.log(values)
        if (err) return res.send(err)

        res.redirect('/users')
      })
    });
  });

  /////////// DELETE /////////////
  router.get('/delete/:id', helpers.isLoggedIn, function (req, res) {
    let id = req.params.id
    let sql = `DELETE FROM users WHERE userid=$1`

    db.query(sql, [id], (err) => {
      if (err) return res.send(err)

      res.redirect('/users')
    })
  })

  return router;
}

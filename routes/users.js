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
    checkOption.Id = req.body.cId
    checkOption.Name = req.body.cName
    checkOption.Position = req.body.cPosition
    checkOption.Email = req.body.cEmail
    checkOption.Type = req.body.cType
    checkOption.Role = req.body.cRole

    res.redirect('/users')
  });

  return router;
}

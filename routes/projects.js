var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util')
var path = require('path');
const { readSync } = require('fs');


let projectOptions = {
  id: true,
  name: true,
  member: true
}

/* GET home page. */

module.exports = (db) => {

  // Start main project
  router.get('/', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user

    let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid `

    const { checkId, checkName, checkMember, projectId, projectName, member } = req.query;

    let query = []

    if (checkId && projectId) {
      query.push(`projects.projectid=${projectId}`)
    }
    if (checkName && projectName) {
      query.push(`projects.name ILIKE '%${projectName}%'`)
    }
    if (checkMember && member) {
      query.push(`members.userid =${member}`)
    }

    if (query.length > 0) {
      getData += ` WHERE ${query.join(" AND ")}`
    }

    getData += `) AS projectname`;

    // console.log(getData);

    db.query(getData, (err, totalData) => {
      // console.log(totalData);
      if (err) return res.status(500).json({
        error: true,
        massage: err
      })
      //pgnation
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 3
      const offset = (page - 1) * limit
      const total = totalData.rows[0].total
      const pages = Math.ceil(total / limit)

      let getData = `SELECT DISTINCT projects.projectid, projects.name,
      string_agg(users.firstname || ' ' || users.lastname, ', ') as member FROM projects
      LEFT JOIN members ON members.projectid = projects.projectid
      LEFT JOIN users ON users.userid = members.userid `

      if (query.length > 0) {
        getData += `WHERE ${query.join('AND')}`
      }

      getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset} `;
      // console.log(getData);

      db.query(getData, (err, dataProject) => {
        // console.log(dataProject);
        if (err) return res.status(500).json({
          error: true,
          massage: err
        })

        let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`

        db.query(getUser, (err, dataUsers) => {
          // console.log(dataUsers);
          if (err) return res.status(500).json({
            error: true,
            massage: err

          })

          res.render('projects/list', {
            url,
            user,
            link,
            page,
            pages,
            query: dataProject.rows,
            users: dataUsers.rows,
            option: projectOptions,
          })
        })
      })
    })
    router.post('/option', helpers.isLoggedIn, (req, res) => {
      projectOptions.id = req.body.checkid;
      projectOptions.name = req.body.checkname;
      projectOptions.member = req.body.checkmember;
      res.redirect('/projects')
    })
  });

  // add project list
  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user
    let sql = `SELECT DISTINCT (userid), concat(firstname,' ',lastname) AS fullname FROM users ORDER BY fullname`
    db.query(sql, (err, data) => {
      // console.log(data);
      if (err) return res.status(500).json({
        error: true,
        massage: err
      })

      res.render('projects/add', {
        link,
        data: data.rows,
        user
      })
    })
  });

  router.post('/add', helpers.isLoggedIn, function (req, res, next) {
    const { members, projectName } = req.body

    let sql = `INSERT INTO projects (name) values('${projectName}')`
    db.query(sql, (err) => {
      if (err) return res.send(err)

      db.query('SELECT projectid FROM projects ORDER BY projectid desc limit 1', (err, projectid) => {
        if (err) return res.send(err)

        let id = projectid.rows[0].projectid;
        let query = [];

        for (let i = 0; i < members.length; i++) {
          query.push(`(${members[i]}, ${id})`)
        }
        db.query(`INSERT INTO members (userid, projectid) values ${query.join(',')}`, (err, data) => {
          res.redirect('/projects')
        })
      })
    })
  });

  // edit
  router.get('/edit/:projectid', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const user = req.session.user
    let id = req.params.projectid
    let sql = `SELECT projects.name FROM projects WHERE projects.projectid = ${id}`
    let fullName = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname
    FROM users ORDER BY fullname`
    let sqlmember = `SELECT members.userid, projects.name, projects.projectid FROM members
    LEFT JOIN projects ON members.projectid = projects.projectid WHERE projects.projectid = ${id}`

    db.query(sql, (err, data) => {
      if (err) return res.send(err)

      let projectName = data.rows[0];
      db.query(fullName, (err, member) => {
        if (err) return res.send(err)

        let members = member.rows;
        db.query(sqlmember, (err, membersData) => {
          if (err) return res.send(err)

          let memberData = membersData.rows.map(item => item.userid)
          res.render('projects/edit', {
            link,
            memberData,
            projectName,
            members,
            user
          })

        })
      })
    })
  });

  router.post('/edit/:projectid', helpers.isLoggedIn, function (req, res, next) {
    let id = req.params.projectid

    const { editName, editMembers } = req.body

    let sql = `UPDATE projects SET name = '${editName}' WHERE projectid = ${id}`

    if (id && editName && editMembers) {
      db.query(sql, (err) => {
        if (err) return res.send(err)

        let memberDelete = `DELETE FROM members WHERE projectid = ${id}`
        db.query(memberDelete, (err) => {
          if (err) return res.send(err)

          let result = []
          if (typeof editMembers == 'string') {
            result.push(`(${editMembers}, ${id})`)
          } else {
            for (let i = 0; i < editMembers.length; i++) {
              result.push(`(${editMembers[i]}, ${id})`)
            }
          }

          let memberUpdate = `INSERT INTO members (userid, projectid) VALUES ${result.join(",")}`
          db.query(memberUpdate, (err) => {
            if (err) {
              return res.send(err)
            }
            res.redirect('/projects')
          })
        })
      })
    } else {
      res.redirect(`/projects/edit/${id}`)
    }

  });

  // delete
  router.get('/delete/:projectid', helpers.isLoggedIn, function (req, res, next) {
    const id = parseInt(req.params.projectid)
    let membersData = `DELETE FROM members WHERE projectid =${id}`;

    db.query(membersData, (err) => {
      if (err) return res.send(err)

      let projectsData = `DELETE FROM projects WHERE projectid = ${id}`;
      db.query(projectsData, (err) => {
        if (err) return res.send(err)

        res.redirect('/projects')
      })
    })

  });
  // end main project

  // Overview
  router.get('/:projectid/overview', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'overview'
    const projectid = req.params.projectid
    const user = req.session.user

    let dataProject = `SELECT * FROM project WHERE projectid = ${projectid}`
    db.query(dataProject, (err, projectData) => {
      if (err) return res.send(err)

      let dataMember = `SELECT users.firstname, users.lastname, members.role FROM members
      LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`
      db.query(dataMember, (err, memberData) => {
        if (err) return res.send(err)

        let dataIssues = `SELECT tracker, status FROM issues WHERE projectid = ${projectid}`
        db.query(dataIssues, (err, issuesData) => {
          if (err) return res.send(err)

          let bugOpen = 0;
          let bugTotal = 0;
          let featureOpen = 0;
          let featureTotal = 0;
          let supportOpen = 0;
          let supportTotal = 0;

          issuesData.rows.forEach(item => {
            if (item.tracker == 'Bug' && item.status !== "closed") {
              bugOpen += 1
            }
            if (item.tracker == 'Bug') {
              bugTotal += 1
            }
          })

          issuesData.rows.forEach(item => {
            if (item.tracker == 'Feature' && item.status !== "closed") {
              featureOpen += 1
            }
            if (item.tracker == 'Feature') {
              featureTotal += 1
            }
          })

          issuesData.rows.forEach(item => {
            if (item.tracker == 'Support' && item.status !== "closed") {
              supportOpen += 1
            }
            if (item.tracker == 'Support') {
              supportTotal += 1
            }
          })

          res.render('projects/overview/view', {
            link,
            user,
            url,
            projectid,
            data: projectData.rows[0],
            members: memberData.rows,
            bugOpen,
            bugTotal,
            featureOpen,
            featureTotal,
            supportOpen,
            supportTotal
          })
        })
      })
    })
  });

  // Activity
  router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/activity/view', { user: req.session.user })
  });

  // Members start
  router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/list', { user: req.session.user })
  });

  //add
  router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/add', { user: req.session.user })
  });

  router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

  // edit
  router.get('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/members/edit', { user: req.session.user })
  });

  router.post('/members/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });

  // delete
  router.get('/members/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/members/${req.params.projectid}`)
  });
  // End members

  // Issues start
  router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/issues/list', { user: req.session.user })
  });

  //add
  router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/issues/add', { user: req.session.user })
  });

  router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/issues/${req.params.projectid}`)
  });

  // edit
  router.get('/issues/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.render('projects/issues/edit', { user: req.session.user })
  });

  router.post('/issues/:projectid/edit/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/issues/${req.params.projectid}`)
  });

  // delete
  router.get('/issues/:projectid/delete/:memberid', helpers.isLoggedIn, function (req, res, next) {
    res.redirect(`/projects/issues/${req.params.projectid}`)
  });
  // End issues

  return router;
}

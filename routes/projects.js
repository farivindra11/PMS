var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
var moment = require('moment');
var path = require('path');




let projectOptions = {
  id: true,
  name: true,
  member: true
}

let memberOptions = {
  id: true,
  name: true,
  position: true
}

let issuesOptions = {
  checkid: true,
  checksubject: true,
  checktracker: true
}

/* GET home page. */

module.exports = (db) => {

  ////////////////////////////////////////////////////////// Start main project //////////////////////////////////////////////////////////
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

  ////////////////////////////////////////////////////////// Overview //////////////////////////////////////////////////////////
  router.get('/overview/:projectid', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'overview'
    const projectid = req.params.projectid
    const user = req.session.user

    // let dataProject = `SELECT * FROM project WHERE projectid = ${projectid}`
    // db.query(dataProject, (err, projectData) => {
    //   if (err) return res.send(err)

    //   let dataMember = `SELECT users.firstname, users.lastname, members.role FROM members
    //   LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`
    //   db.query(dataMember, (err, memberData) => {
    //     if (err) return res.send(err)

    //     let dataIssues = `SELECT tracker, status FROM issues WHERE projectid = ${projectid}`
    //     db.query(dataIssues, (err, issuesData) => {
    //       if (err) return res.send(err)

    //       let bugOpen = 0;
    //       let bugTotal = 0;
    //       let featureOpen = 0;
    //       let featureTotal = 0;
    //       let supportOpen = 0;
    //       let supportTotal = 0;

    //       issuesData.rows.forEach(item => {
    //         if (item.tracker == 'Bug' && item.status !== "closed") {
    //           bugOpen += 1
    //         }
    //         if (item.tracker == 'Bug') {
    //           bugTotal += 1
    //         }
    //       })

    //       issuesData.rows.forEach(item => {
    //         if (item.tracker == 'Feature' && item.status !== "closed") {
    //           featureOpen += 1
    //         }
    //         if (item.tracker == 'Feature') {
    //           featureTotal += 1
    //         }
    //       })

    //       issuesData.rows.forEach(item => {
    //         if (item.tracker == 'Support' && item.status !== "closed") {
    //           supportOpen += 1
    //         }
    //         if (item.tracker == 'Support') {
    //           supportTotal += 1
    //         }
    //       })

    res.render('projects/overview/view', {
      link,
      user,
      url,
      projectid
      // data: projectData.rows[0],
      // members: memberData.rows,
      // bugOpen,
      // bugTotal,
      // featureOpen,
      // featureTotal,
      // supportOpen,
      // supportTotal
    })
  })
  //     })
  //   })
  // });

  // Activity
  router.get('/activity/:projectid', helpers.isLoggedIn, function (req, res, next) {


    res.render('projects/activity/view', { user: req.session.user })
  });


  ////////////////////////////////////////////////////////// Members start //////////////////////////////////////////////////////////
  router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'members';
    const projectid = req.params.projectid;
    const user = req.session.user;
    let getData = `SELECT COUNT(member) AS total FROM(SELECT members.userid FROM members JOIN users 
      ON members.userid = users.userid WHERE members.projectid = ${projectid}`;

    const { checkId, checkName, checkPosition, memberId, memberName, position } = req.query;

    let query = []

    if (checkId && memberId) {
      query.push(`members.id=${memberId}`)
    }
    if (checkName && memberName) {
      query.push(`CONCAT(users.firstname,' ',users.lastname) LIKE '%${memberName}%'`)
    }
    if (checkPosition && position) {
      query.push(`members.role =${position}`)
    }
    if (query.length > 0) {
      getData += ` AND ${query.join(" AND ")}`
    }

    getData += `) AS member`;

    db.query(getData, (err, totalData) => {
      if (err) return res.status(500).json({
        error: true,
        massage: err
      })
      const pageUrl = (req.url == `/members/${projectid}`) ? `/members/${projectid}/?page=1` : req.url;
      const page = req.query.page || 1
      const limit = 3
      const offset = (page - 1) * limit
      const total = totalData.rows[0].total
      const pages = Math.ceil(total / limit)

      let getData = `SELECT users.userid, projects.name, projects.projectid, members.id, members.role, 
      CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
      LEFT JOIN projects ON projects.projectid = members.projectid
      LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid}`


      if (query.length > 0) {
        getData += ` AND ${query.join(' AND ')}`
      }
      getData += ` ORDER BY members.id ASC`
      getData += ` LIMIT ${limit} OFFSET ${offset}`

      db.query(getData, (err, dataMember) => {
        if (err) return res.send(err)

        let projectData = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(projectData, (err, dataProject) => {
          if (err) return res.status(500).json({
            error: true,
            massage: err

          })
          res.render('projects/members/list', {
            link,
            url,
            projectid,
            page,
            pages,
            pageUrl,
            members: dataMember.rows,
            project: dataProject.rows[0],
            option: memberOptions,
            user
          })
        })
      })
    })
    router.post('/members/:projectid/option', helpers.isLoggedIn, (req, res) => {
      const projectid = req.params.projectid

      memberOptions.id = req.body.checkid;
      memberOptions.name = req.body.checkname;
      memberOptions.position = req.body.checkposition;

      res.redirect(`/projects/members/${projectid}`)
    })
  });

  //add
  router.get('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'members';
    const user = req.session.user;
    const projectid = req.params.projectid;

    let getData = `SELECT * FROM projects WHERE projectid = ${projectid}`
    db.query(getData, (err, dataProject) => {
      if (err) return res.send(err)

      let memberData = `SELECT userid, CONCAT(firstname,' ',lastname) As fullname FROM users
      WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = ${projectid})`
      db.query(memberData, (err, dataMember) => {
        if (err) return res.send(err)

        res.render('projects/members/add', {
          link,
          url,
          user,
          projectid,
          members: dataMember.rows,
          project: dataProject.rows[0]
        })
      })
    })
  });

  router.post('/members/:projectid/add', helpers.isLoggedIn, function (req, res, next) {

    const projectid = req.params.projectid
    const { inputmember, inputposition } = req.body
    let queryAdd = `INSERT INTO members(userid, role, projectid) VALUES ($1,$2,$3)`
    let values = [inputmember, inputposition, projectid]

    db.query(queryAdd, values, (err) => {
      if (err) return res.send(err)
    })

    res.redirect(`/projects/members/${projectid}`)
  });

  // edit
  router.get('/members/:projectid/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'members';
    const user = req.session.user;
    let projectid = req.params.projectid;
    let id = req.params.id;
    let memberData = `SELECT members.id, CONCAT(users.firstname,' ',users.lastname) AS fullname, members.role FROM members
    LEFT JOIN users ON members.userid = users.userid WHERE projectid=${projectid} AND id=${id}`

    db.query(memberData, (err, dataMember) => {
      if (err) return res.send(err)

      let projectData = `SELECT * FROM projects WHERE projectid= ${projectid}`
      db.query(projectData, (err, dataProject) => {
        if (err) return res.send(err)

        res.render('projects/members/edit', {
          link,
          url,
          projectid,
          member: dataMember.rows[0],
          project: dataProject.rows[0],
          user
        })
      })
    })
  });

  router.post('/members/:projectid/edit/:id', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid;
    let id = req.params.id;
    let position = req.body.inputposition;
    let editData = `UPDATE members SET role='${position}' WHERE id=${id}`
    db.query(editData, (err) => {
      if (err) return res.send(err)

      res.redirect(`/projects/members/${projectid}`)
    })
  });

  // delete
  router.get('/members/:projectid/delete/:id', helpers.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let id = req.params.id;
    let delData = `DELETE FROM members WHERE projectid=${projectid} AND id=${id}`

    db.query(delData, (err) => {
      if (err) return res.send(err)

      res.redirect(`/projects/members/${projectid}`)
    })
  });
  // End members

  ///////////////////////////////////////////////  Issues start ///////////////////////////////////////////////
  router.get('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'issues';
    const projectid = req.params.projectid
    let projectData = `SELECT * FROM projects WHERE projectid=${projectid}`

    const { checkId, checkSubject, checkTracker, issuesId, issuesSubject, issuesTracker } = req.query;

    let query = [];
    let search = ''

    if (checkId && issuesId) {
      query.push(`issues.issueid=${issuesId}`)
    }
    if (checkSubject && issuesSubject) {
      query.push(`issues.subject ILIKE '%${issuesSubject}%'`)
    }
    if (checkTracker && issuesTracker) {
      query.push(`issues.tracker='${issuesTracker}'`)
    }
    if (query.length > 0) {
      search += ` AND ${query.join(' AND ')}`
    }

    let dataTotal = `SELECT COUNT(issueid) AS total FROM issues WHERE projectid = ${projectid} ${search}`

    db.query(projectData, (err, dataProject) => {
      if (err) return res.send(err)

      let project = dataProject.rows[0];
      db.query(dataTotal, (err, totalData) => {
        if (err) return res.send(err)

        let total = totalData.rows[0].total;

        const pageUrl = req.url == `/issues/${projectid}` ? `/issues/${projectid}/?page=1` : req.url;
        const page = req.query.page || 1
        const limit = 3;
        const offset = (page - 1) * limit;
        const pages = Math.ceil(total / limit)

        let issuesData = `SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) AS authorname FROM issues
        LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid=${projectid} ${search} 
        ORDER BY issues.issueid ASC LIMIT ${limit} OFFSET ${offset}`

        db.query(issuesData, (err, dataIssues) => {
          if (err) return res.send(err)

          let issues = dataIssues.rows;

          let assigneeData = `SELECT users.userid, CONCAT(firstname,' ',lastname) AS fullname FROM members
          LEFT JOIN users ON members.userid=users.userid WHERE projectid=${projectid}`

          db.query(assigneeData, (err, dataAssignee) => {
            if (err) return res.send(err)

            let assignee = dataAssignee.rows

            res.render('projects/issues/list', {
              link,
              url,
              projectid,
              project,
              pageUrl,
              page,
              pages,
              issues,
              assignee,
              option: issuesOptions,
              moment,
              user: req.session.user
            })
          })
        })
      })
    })
    router.post('/issues/:projectid', helpers.isLoggedIn, function (req, res, next) {
      const projectid = req.params.projectid;

      issuesOptions.checkid = req.body.checkid
      issuesOptions.checksubject = req.body.checksubject
      issuesOptions.checktracker = req.body.checktracker

      res.redirect(`/projects/issues/${projectid}`)
    })
  });

  //add
  router.get('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    const link = 'projects';
    const url = 'issues';
    const projectid = req.params.projectid

    let projectData = `SELECT * FROM projects WHERE projectid=${projectid}`

    db.query(projectData, (err, dataProject) => {
      if (err) return res.send(err)

      let project = dataProject.rows[0];

      let memberData = `SELECT users.userid, CONCAT(users.firstname, ' ', users.lastname) AS fullname FROM members
      LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${projectid}`
      db.query(memberData, (err, dataMember) => {
        if (err) return res.send(err)

        members = dataMember.rows;

        res.render('projects/issues/add', {
          link,
          url,
          projectid,
          project,
          members,
          user: req.session.user
        })
      })
    })
  });

  router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
    let projectid = parseInt(req.params.projectid)
    let query = req.body;
    let user = req.session.user

    let file = req.files.file;
    let filename = file.name.toLowerCase().replace('', Date.now()).split(' ').join('-');
    let addData = `INSERT INTO issues(projectid, tracker, subject, description, status, priority,
      assignee, startdate, duedate, estimatedtime, done, files, author, createddate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`

    let values = [projectid, query.tracker, query.subject, query.description, query.status, query.priority, parseInt(query.assignee), query.startdate,
      query.duedate, parseInt(query.estimatedtime), parseInt(query.done), filename, user.userid]

    db.query(addData, values, (err) => {
      if (err) return res.send(err)

      file.mv(path.join(__dirname, '..', 'public', 'upload', 'filename'), (err) => {
        if (err) return res.send(err)

        res.redirect(`/projects/issues/${projectid}`)
      })
    })
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

const sendMail = require('mailer').send;
const path = require('path');
const CourseInvite = require('../models/courseInvite');
const config = require('config');
const User = require('users').User;

module.exports = function*(invite) {

  yield CourseInvite.populate(invite, [{path: 'order'}, {path: 'group'}]);

  var userExists = yield User.findOne({
    email: invite.email
  }).exec();

  yield sendMail({
    templatePath: path.join(__dirname, '../templates/invite/email'),
    from:         'orders',
    to:           invite.email,
    contactName:  invite.order.data.contactName,
    subject:      "Приглашение на курс, в группу " + invite.group.title,
    order:        invite.order,
    group:        invite.group,
    userExists:   userExists,
    link:         config.server.siteHost + '/courses/invite/' + invite.token
  });


};

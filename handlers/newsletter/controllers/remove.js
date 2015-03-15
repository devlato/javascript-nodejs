const path = require('path');
const Newsletter = require('../models/newsletter');
const Subscription = require('../models/subscription');
const sendMail = require('sendMail');
const config = require('config');

exports.get = function*() {
  this.nocache();

  const subscription = yield Subscription.findOne({
    accessKey: this.params.accessKey
  }).exec();

  if (!subscription) {
    this.throw(404, "Нет такой подписки");
  }

  yield subscription.destroy();

  this.body = "Подписка удалена из базы.";

};

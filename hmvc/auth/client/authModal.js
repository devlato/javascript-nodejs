var xhr = require('client/xhr');
require('client/xhr-notify');

var delegate = require('client/delegate');
var Modal = require('client/head').Modal;
var Spinner = require('client/spinner');

var loginForm = require('../templates/login-form.jade');
var registerForm = require('../templates/register-form.jade');
var forgotForm = require('../templates/forgot-form.jade');

var jadeRender = require('client/jadeRender');

/**
 * Options:
 *   - callback: function to be called after successful login (by default - go to successRedirect)
 *   - message: form message to be shown when the login form appears ("Log in to leave the comment")
 *   - successRedirect: the page to redirect (current page by default)
 *       - after immediate login
 *       - after registration for "confirm email" link
 */
function AuthModal(options) {
  Modal.apply(this, arguments);
  options = options || {};

  if (!options.successRedirect) {
    options.successRedirect = window.location.href;
  }

  var self = this;
  if (!options.callback) {
    options.callback = function() {
      self.successRedirect();
    };
  }


  this.options = options;
  this.setContent(jadeRender(loginForm));

  if (options.message) {
    this.showFormMessage(options.message, 'info');
  }

  this.initEventHandlers();
}
AuthModal.prototype = Object.create(Modal.prototype);

delegate.delegateMixin(AuthModal.prototype);

AuthModal.prototype.successRedirect = function() {
  if (window.location.href == this.options.successRedirect) {
    window.location.reload();
  } else {
    window.location.href = this.options.successRedirect;
  }
};

AuthModal.prototype.clearFormMessages = function() {
  /*
   remove error for this notation:
   span.text-input.text-input_invalid.login-form__input
   input.text-input__control#password(type="password", name="password")
   span.text-inpuxt__err Пароли не совпадают
   */
  [].forEach.call(this.elem.querySelectorAll('.text-input_invalid'), function(elem) {
    elem.classList.remove('text-input_invalid');
  });

  [].forEach.call(this.elem.querySelectorAll('.text-input__err'), function(elem) {
    elem.remove();
  });

  // clear form-wide notification
  this.elem.querySelector('[data-notification]').innerHTML = '';
};

AuthModal.prototype.request = function(options) {
  var request = xhr(options);

  request.addEventListener('loadstart', function() {
    var onEnd = this.startRequestIndication();
    request.addEventListener('loadend', onEnd);
  }.bind(this));

  return request;
};

AuthModal.prototype.startRequestIndication = function() {
  this.showOverlay();
  var self = this;

  var submitButton = this.elem.querySelector('[type="submit"]');

  if (submitButton) {
    var spinner = new Spinner({ elem: submitButton, size: 'small' });
    spinner.start();
  }

  return function onEnd() {
    self.hideOverlay();
    if (spinner) spinner.stop();
  };

};

AuthModal.prototype.initEventHandlers = function() {

  this.delegate('[data-switch="register-form"]', 'click', function(e) {
    e.preventDefault();
    this.setContent(jadeRender(registerForm));
  });

  this.delegate('[data-switch="login-form"]', 'click', function(e) {
    e.preventDefault();
    this.setContent(jadeRender(loginForm));
  });

  this.delegate('[data-switch="forgot-form"]', 'click', function(e) {
    e.preventDefault();
    this.setContent(jadeRender(forgotForm));
  });


  this.delegate('[data-form="login"]', 'submit', function(event) {
    event.preventDefault();
    this.submitLoginForm(event.target);
  });


  this.delegate('[data-form="register"]', 'submit', function(event) {
    event.preventDefault();
    this.submitRegisterForm(event.target);
  });

  this.delegate('[data-form="forgot"]', 'submit', function(event) {
    event.preventDefault();
    this.submitForgotForm(event.target);
  });

  this.delegate("[data-provider]", "click", function(event) {
    event.preventDefault();
    this.openAuthPopup('/auth/login/' + event.delegateTarget.dataset.provider);
  });

  this.delegate('[data-action-verify-email]', 'click', function(event) {
    event.preventDefault();

    var request = this.request({
      method: 'POST',
      url:    '/auth/reverify'
    });

    var self = this;
    request.addEventListener('success', function(event) {

      if (this.status == 200) {
        self.showFormMessage("Письмо-подтверждение отправлено.", 'success');
      } else {
        self.showFormMessage(event.result, 'error');
      }

    });

    var payload = new FormData();
    payload.append("email", event.delegateTarget.dataset.actionVerifyEmail);

    request.send(payload);
  });
};

AuthModal.prototype.submitRegisterForm = function(form) {

  this.clearFormMessages();

  var hasErrors = false;
  if (!form.elements.email.value) {
    hasErrors = true;
    this.showInputError(form.elements.email, 'Введите, пожалуста, email.');
  }

  if (!form.elements.displayName.value) {
    hasErrors = true;
    this.showInputError(form.elements.displayName, 'Введите, пожалуста, имя пользователя.');
  }

  if (!form.elements.password.value) {
    hasErrors = true;
    this.showInputError(form.elements.password, 'Введите, пожалуста, пароль.');
  }

  if (hasErrors) return;

  var request = this.request({
    method: 'POST',
    url:    '/auth/register'
  });

  var self = this;
  request.addEventListener('success', function(event) {

    if (this.status == 201) {
      self.setContent(jadeRender(loginForm));
      self.showFormMessage(
          "Сейчас вам придёт email с адреса <code>inform@javascript.ru</code> " +
          "со ссылкой-подтверждением. Если письмо не пришло в течение минуты, можно " +
          "<a href='#' data-action-verify-email='" + form.elements.email.value + "'>перезапросить подтверждение</a>.",
        'success'
      );
      return;
    }

    if (this.status == 409) {
      self.showFormMessage(event.result, 'error');
      return;
    }

    self.showFormMessage("Неизвестный статус ответа сервера", 'error');
  });

  var payload = new FormData(form);
  payload.append("successRedirect", this.options.successRedirect);
  request.send(payload);
};


AuthModal.prototype.submitForgotForm = function(form) {

  this.clearFormMessages();

  var hasErrors = false;
  if (!form.elements.email.value) {
    hasErrors = true;
    this.showInputError(form.elements.email, 'Введите, пожалуста, email.');
  }

  if (hasErrors) return;

  var request = this.request({
    method: 'POST',
    url:    '/auth/forgot'
  });

  var self = this;
  request.addEventListener('success', function(event) {

    if (this.status == 200) {
      self.setContent(jadeRender(loginForm));
      self.showFormMessage(event.result, 'success');
    } else {
      self.showFormMessage(event.result, 'error');
    }
  });

  var payload = new FormData(form);
  payload.append("successRedirect", this.options.successRedirect);
  request.send(payload);
};


AuthModal.prototype.showInputError = function(input, error) {
  input.parentNode.classList.add('text-input_invalid');
  var errorSpan = document.createElement('span');
  errorSpan.className = 'text-input__err';
  errorSpan.innerHTML = error;
  input.parentNode.appendChild(errorSpan);
};

AuthModal.prototype.showFormMessage = function(message, type) {
  if (['info', 'error', 'warning', 'success'].indexOf(type) == -1) {
    throw new Error("Unsupported type: " + type);
  }

  var container = document.createElement('div');
  container.className = 'login-form__' + type;
  container.innerHTML = message;

  this.elem.querySelector('[data-notification]').innerHTML = '';
  this.elem.querySelector('[data-notification]').appendChild(container);
};

AuthModal.prototype.submitLoginForm = function(form) {

  this.clearFormMessages();

  var hasErrors = false;
  if (!form.elements.login.value) {
    hasErrors = true;
    this.showInputError(form.elements.login, 'Введите, пожалуста, имя или email.');
  }

  if (!form.elements.password.value) {
    hasErrors = true;
    this.showInputError(form.elements.password, 'Введите, пожалуста, пароль.');
  }

  if (hasErrors) return;

  var request = this.request({
    method: 'POST',
    url:    '/auth/login/local'
  });

  request.addEventListener('success', function(event) {

    if (this.status != 200) {
      window.authModal.onAuthFailure(event.result.message);
      return;
    }

    window.authModal.onAuthSuccess();
  });

  request.send(new FormData(form));
};

AuthModal.prototype.openAuthPopup = function(url) {
  var width = 800, height = 600;
  var top = (window.outerHeight - height) / 2;
  var left = (window.outerWidth - width) / 2;
  window.open(url, 'auth_popup', 'width=' + width + ',height=' + height + ',scrollbars=0,top=' + top + ',left=' + left);
};

/*
 все обработчики авторизации (включая Facebook из popup-а и локальный)
 в итоге триггерят один из этих каллбэков
 */
AuthModal.prototype.onAuthSuccess = function() {
  this.options.callback();
};


AuthModal.prototype.onAuthFailure = function(errorMessage) {
  this.showFormMessage(errorMessage || "Отказ в авторизации", 'error');
};


module.exports = AuthModal;
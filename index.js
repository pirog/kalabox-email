'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var mailgun = require('mailgun-js');
var VError = require('verror');

/*
 * Export.
 */
module.exports = function(config) {

  // Get required values from mailgun config.
  var apiKey = _.get(config, 'mailgun.apiKey');
  var domain = _.get(config, 'mailgun.domain');

  // Validate.
  if (!apiKey) {
    throw new Error('Email config is missing mailgun apiKey value.');
  }
  if (!domain) {
    throw new Error('Email config is missing mailgun domain value.');
  }
  
  /*
   * Mailgun api configured.
   */
  var mg = mailgun({
    apiKey: apiKey,
    domain: domain
  });

  /*
   * Validate email send object.
   */
  function validate(o) {
    if (!o.from || !_.isString(o.from)) {
      throw new Error('Invalid from value: ' + pp(o));
    }
    if (!o.to || (!_.isString(o.to) && !_.isArray(o.to))) {
      throw new Error('Invalid from value: ' + pp(o));
    }
    if (!o.subject || !_.isString(o.subject)) {
      throw new Error('Invalid subject value: ' + pp(o));
    }
    if (!o.text || !_.isString(o.text)) {
      throw new Error('Invalid text value: ' + pp(o));
    }
  }

  /*
   * Pretty print.
   */
  function pp(o) {
    if (typeof o === 'string') {
      return o;
    } else if (typeof o === 'object') {
      return JSON.stringify(o);
    } else {
      return o;
    }
  }
  
  /*
   * Sends an email and returns a promise.
   */
  function send(data) {
    // Validate email object.
    return Promise.try(function() {
      validate(data);
    })
    // Replace email lists with email addresses. 
    .then(function() {
      if (typeof data.to === 'string') {
        data.to = [data.to];
      }
      data.to = _.map(data.to, function(address) {
        if (_.startsWith(address, '@')) {
          /*
           * If email address starts with an @ that means it's a preconfigured
           * list. Replace it with a list of email addresses.
           */
          var name = _.trim(address, '@');
          // Get email list.
          var list = _.get(config, 'lists.' + name);
          if (!list) {
            // Email list doesn't exist so throw an error.
            throw new Error('Invalid email list: ' + address);
          } else {
            // Email list does exist so return it.
            return list;
          }
        } else {
          // Just a normal email address.
          return address;
        }
      });
      // Flatten, remove duplicates, and join.
      data.to = _.uniq(_.flatten(data.to)).join(', ');
    })
    // Send email.
    .then(function() {
      return Promise.fromNode(function(cb) {
        mg.messages().send(data, cb);
      });
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error sending email: ', JSON.stringify(data));
    });
  }

  /*
   * Build api.
   */
  var api = {
    send: send
  };

  /*
   * Return api.
   */
  return api;

};

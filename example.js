var config = require('../kalabox-config/email/config.json');

var mail = require('./index.js')(config);

mail.send({
  //to: 'bob@barker.com',
  to: '@test',
  from: 'drew@carey.com',
  subject: 'test subject',
  text: 'test text'
})
.then(function() {
  console.log('Email sent!');
});

'use strict';

var kafka = require('kafka-node');
var Producer = kafka.Producer;
var KeyedMessage = kafka.KeyedMessage;
var Client = kafka.KafkaClient;
var client = new Client({ kafkaHost: 'velomobile-01.srvs.cloudkafka.com:9094,velomobile-02.srvs.cloudkafka.com:9094,velomobile-03.srvs.cloudkafka.com:9094',
  sasl: {
    mechanism: 'plain',
    username: 'po23z7ne',
    password: 'e1wLUMtei8KdWL4h41Q8_70k9KCADHfa'
  },
  connectTimeout: 10000,
  requestTimeout: 10000
});
var argv = require('optimist').argv;

var topic = argv.topic || 'slack-messages';

var p = argv.p || 0;
var a = argv.a || 0;
var producer = new Producer(client, { requireAcks: 1 });

console.log('attempting to connect');

producer.on('ready', function () {

  console.log('connected');

  var message = 'tanners having a rough day with passwords.';

  producer.send([{ topic: topic, partition: p, messages: [message], attributes: a }], function (
    err,
    result
  ) {
    console.log(err || result);
    process.exit();
  });

  console.log('does this work');
});

producer.on('error', function (err) {
  console.log('error', err);
});
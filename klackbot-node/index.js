let secrets = require('./secrets');

let kafka = require('kafka-node');
let bunnyslack = require('./bunnyslack');

let client = new kafka.KafkaClient({ kafkaHost: '10.10.114.49:2181' });
let producer = new kafka.Producer(client, { requireAcks: 1 });
let consumer = new kafka.Consumer(client, [{ topic: 'slack-message', partition: 0, offset: 0 }], { autoCommit: false, fetchMaxWaitMs: 1000, fetchMaxBytes: 1024 * 1024 });
let offset = new kafka.Offset(client);

// global object because reasons
let G = {
    status: 'dead',
    botname: 'x2bot',
    god: 'UC72G0ATD',
    topicname: 'kafka-demo'
};

// slackbot
let slacki = new bunnyslack({
    token: secrets.token,
    wptoken: secrets.wstoken,
    name: G.botname
});

slacki.on('start', () => {
    console.log('started');
    G.status = 'ready';
});

slacki.on('message', (msg) => {
    
    if (msg.type != 'message' || msg.username === G.botname) {
        return;
    }

    if (msg.user == G.god) {
        if (msg.text === '::start idiots') {
            console.log('starting idiots');

            G.status = 'listening to idiots';
            console.log('G status [' + G.status + ']');

            return;
        }
        else if (msg.text === '::kill') {
            G.status = 'ready';
            console.log('G status [' + G.status + ']');

            return;
        }
        else if (msg.text === '::status') {
            console.log('G status [' + G.status + ']');
            
            return;
        }
        else if (msg.text === '::replayall') {
            replayallmessages();
        }
        // return;
    }

    if (G.status != 'listening to idiots') {
        return;
    }

    slacki.getUserById(msg.user).then((user) => {
        let payload = {
            id: user.id,
            name: user.name,
            display_name: user.profile.display_name,
            text: msg.text
        };

        // THIS IS THE PUSH TO KAFKA
        pushtokafka(payload);
        
    });
});

producer.on('ready', function () {

    console.log('world');

    producer.send([{ topic: 'slack-message', partition: 0, messages: ['tanner is having password issues'], attributes: 0 }],
        (err, result) => {
            console.log(err || result);
            process.exit();
    });
});

consumer.on('message', (message) =>  {
    console.log(message);
});

let pushtokafka = (payload) => {
    slacki.postMessageToGroup(G.topicname, payload);
};

/*slacki.getGroupHistory('GGCHNUF2T').then((data) => {
    console.log(data);
});*/



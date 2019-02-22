let secrets = require('./secrets');

let kafka = require('kafka-node');
let bunnyslack = require('./bunnyslack');

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
            return;
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


let pushtokafka = (payload) => {
    slacki.postMessageToGroup(G.topicname, payload);
};

let replayallmessages = () => {
    slacki.getGroupHistory('GGCHNUF2T').then((data) => {
        //console.log(data);
        slacki.postMessageToUser('moohh91', data);
    });
};

/*slacki.getGroupHistory('GGCHNUF2T').then((data) => {
    console.log(data);
});*/



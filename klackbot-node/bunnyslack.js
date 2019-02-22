'use strict';

var _ = require('lodash');
var request = require('request');
var Vow = require('vow');
var extend = require('extend');
var WebSocket = require('ws');
var EventEmitter = require('events').EventEmitter;

class bunnyslack extends EventEmitter {

     constructor(params) {
         super(params);
         this.token = params.token;
         this.wptoken = params.wptoken;
         this.name = params.name;

         console.assert(params.token, 'token must be defined');
         this.login();
     }

    // start rtm
    login() {
        this._api('rtm.start').then((data) => {
            this.wsUrl = data.url;
            this.self = data.self;
            this.team = data.team;
            this.channels = null;//data.channels;
            this.users = null;//data.users;
            this.ims = null;//data.ims;
            this.groups = null;//data.groups;

            this.emit('start');

            this.connect();
        }).fail((data) => {
            this.emit('error', new Error(data.error ? data.error : data));
        }).done();
    }

    // establish ws
    connect() {
        this.ws = new WebSocket(this.wsUrl);

        // open
        this.ws.on('open', function(data) {
            this.emit('open', data);
        }.bind(this));

        // close
        this.ws.on('close', function(data) {
            this.emit('close', data);
        }.bind(this));

        // message
        this.ws.on('message', function(data) {
            try {
                this.emit('message', JSON.parse(data));
            } catch (e) {
                console.log(e);
            }
        }.bind(this));

        //
    }

    // channels
    getChannels() {
        if (this.channels) {
            return Vow.fulfill({ channels: this.channels });
        }
        return this._api('channels.list');
    }

    // people
    getUsers() {
        if (this.users) {
            return Vow.fulfill({ members: this.users });
        }

        return this._api('users.list');
    }

    // get group history
    getGroupHistory(name, params) {
        params = extend({
            channel: name,
            count: 1000
        }, params || {});

        return this._api('groups.history', params, true);
    }

    getConversations() {
        if (this.groups) {
            return Vow.fulfill({ groups: this.groups });
        }

        return this._api('conversations.list');
    }

    getChannelHistory(name, params) {
        params = extend({
            channel: name,
            count: 1000
        }, params || {});

        return this._api('channels.history', params, true);
    }

    getGroupHistory(name, params) {
        params = extend({
            channel: name,
            count: 100
        }, params || {});

        return this._api('groups.history', params, true);
    }

    getGroups() {
        if (this.groups) {
            return Vow.fulfill({ groups: this.groups });
        }

        return this._api('groups.list');
    }

    getUser(name) {
        return this.getUsers().then(function(data) {
            var res = _.find(data.members, { name: name });

            console.assert(res, 'user not found');
            return res;
        });
    }

    getChannel(name) {
        return this.getChannels().then(function(data) {
            var res = _.find(data.channels, { name: name });

            console.assert(res, 'channel not found');
            return res;
        });
    }

    getGroup(name) {
        return this.getGroups().then(function(data) {
            var res = _.find(data.groups, { name: name });

            console.assert(res, 'group not found');
            return res;
        });
    }

    getUserById(id) {
        return this.getUsers().then(function(data) {
            var res = _.find(data.members, { id: id });

            console.assert(res, 'user not found');
            return res;
        });
    }

    getChannelById(id) {
        return this.getChannels().then(function(data) {
            var res = _.find(data.channels, { id: id });

            console.assert(res, 'channel not found');
            return res;
        });
    }

    getGroupById(id) {
        return this.getGroups().then(function(data) {
            var res = _.find(data.groups, { id: id });

            console.assert(res, 'group not found');
            return res;
        });
    }

    getChannelId(name) {
        return this.getChannel(name).then(function(channel) {
            return channel.id;
        });
    }

    getGroupId(name) {
        return this.getGroup(name).then(function(group) {
            return group.id;
        });
    }

    getUserId(name) {
        return this.getUser(name).then(function(user) {
           return user.id;
        });
    }

    getUserByEmail(email) {
        return this.getUsers().then(function(data) {
            return _.find(data.members, { profile: { email: email } });
        });
    }

    getChatId(name) {
        return this.getUser(name).then(function(data) {

            var chatId = _.find(this.ims, { user: data.id });

            return (chatId && chatId.id) || this.openIm(data.id);
        }.bind(this)).then(function(data) {
            return typeof data === 'string' ? data : data.channel.id;
        });
    }

    openIm(userId) {
        return this._api('im.open', {user: userId});
    }

    getImChannels() {
        if (this.ims) {
            return Vow.fulfill({ ims: this.ims });
        }
        return this._api('im.list');
    }

    // reminders
    getReminders() {
        return this._api('reminders.list', null, true);
    }

    // reminders by id
    getReminder(id) {
        return this._api('reminders.info', null, true);
    }

    // add reminder
    postReminder(user, text, time, params) {
        params = extend({
            text: text,
            time: time,
            user: user,
            wptoken: true,
            username: this.name
        }, params || {});

        return this._api('reminders.add', params, true);
    }

    // create channels
    createGroup(name, params) {
        params = extend({
            name: name,
            validate: true
        }, params || {});

        return this._api('groups.create', params, true);
    }

    postEphemeral(id, user, text, params) {
        params = extend({
            text: text,
            channel: id,
            user: user,
            username: this.name
        }, params || {});

        return this._api('chat.postEphemeral', params);
    }

    postMessage(id, text, params) {
        params = extend({
            text: text,
            channel: id,
            username: this.name
        }, params || {});

        return this._api('chat.postMessage', params);
    }

    updateMessage(id, ts, text, params) {
        params = extend({
            ts: ts,
            channel: id,
            username: this.name,
            text: text
        }, params || {});

        return this._api('chat.update', params);
    }

    postMessageToUser(name, text, params, cb) {
        return this._post((params || {}).slackbot ? 'slackbot' : 'user', name, text, params, cb);
    }

    postMessageToChannel(name, text, params, cb) {
        return this._post('channel', name, text, params, cb);
    }

    postMessageToGroup(name, text, params, cb) {
        return this._post('group', name, text, params, cb);
    }

    _post(type, name, text, params, cb) {
        var method = ({
            'group': 'getGroupId',
            'channel': 'getChannelId',
            'user': 'getChatId',
            'slackbot': 'getUserId'
        })[type];

        if (typeof params === 'function') {
            cb = params;
            params = null;
        }

        return this[method](name).then(function(itemId) {
            return this.postMessage(itemId, text, params);
        }.bind(this)).always(function(data) {
            if (cb) {
                cb(data._value);
            }
        });
    }

    postTo(name, text, params, cb) {
        return Vow.all([this.getChannels(), this.getUsers(), this.getGroups()]).then(function(data) {

            name = this._cleanName(name);

            var all = [].concat(data[0].channels, data[1].members, data[2].groups);
            var result = _.find(all, {name: name});

            console.assert(result, 'wrong name');

            if (result['is_channel']) {
                return this.postMessageToChannel(name, text, params, cb);
            } else if (result['is_group']) {
                return this.postMessageToGroup(name, text, params, cb);
            } else {
                return this.postMessageToUser(name, text, params, cb);
            }
        }.bind(this));
    }

    _cleanName (name) {
        if (typeof name !== 'string') {
            return name;
        }

        var firstCharacter = name.charAt(0);
        if (firstCharacter === '#' || firstCharacter === '@') {
            name = name.slice(1);
        }
        return name;
    }

    _preprocessParams(params, wpt) {
        params = extend(params || {}, {token: !wpt ? this.token : this.wptoken});

        Object.keys(params).forEach(function(name) {
            var param = params[name];

            if (param && typeof param === 'object') {
                params[name] = JSON.stringify(param);
            }
        });

        return params;
    }

    _api(methodName, params, wpt) {
        var data = {
            url: 'https://slack.com/api/' + methodName,
            form: this._preprocessParams(params, wpt)
        };

        return new Vow.Promise(function(resolve, reject) {

            request.post(data, function(err, request, body) {
                if (err) {
                    reject(err);
                    return false;
                }

                try {
                    body = JSON.parse(body);

                    // is the response ok?
                    if (body.ok) {
                        resolve(body);
                    } else {
                        reject(body);
                    }

                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}

module.exports = bunnyslack;

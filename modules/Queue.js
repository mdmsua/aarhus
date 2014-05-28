"use strict";

var Q = require("Q");

function Queue(client, name) {
    this.name = name;
    this.queue = client;
    client.createQueueIfNotExists(name, function (error) {
        if (error) {
            throw error;
        }
    });
}

Queue.prototype.enqueue = function (message, callback) {
    var d = Q.defer();
    this.queue.createMessage(this.name, message, function (error, queueMessage) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(queueMessage);
        }
    });
    return d.promise.nodeify(callback);
};

Queue.prototype.dequeue = function (queueMessage, callback) {
    var d = Q.defer();
    this.queue.deleteMessage(this.name, queueMessage.id || queueMessage.messageid, queueMessage.popreceipt, function (error, success) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(success);
        }
    });
    return d.promise.nodeify(callback);
};

Queue.prototype.peek = function (number, callback) {
    var d = Q.defer(),
        n = number ? number > 32 ? 32 : number : 1;
    this.queue.peekMessages(this.name, { numofmessages: n }, function (error, queueMessages) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(queueMessages);
        }
    });
    return d.promise.nodeify(callback);
};

Queue.prototype.update = function (queueMessage, visibilityTimeout, callback) {
    var d = Q.defer();
    this.queue.updateMessage(this.name, queueMessage.messageid, queueMessage.popreceipt, visibilityTimeout, { messagetext: queueMessage.messagetext }, function (error, success) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(success);
        }
    });
    return d.promise.nodeify(callback);
};

Queue.prototype.get = function (number, callback) {
    var d = Q.defer(),
        n = number ? number > 32 ? 32 : number : 32;
    this.queue.getMessages(this.name, { numofmessages: n, visibilitytimeout: 1 }, function (error, queueMessages) {
        if (error) {
            d.reject(error);
        } else {
            d.resolve(queueMessages);
        }
    });
    return d.promise.nodeify(callback);
};

module.exports = Queue;
"use strict";

var uuid = require("node-uuid");

function Task(storageClient, tableName, partitionKey, rowKeyProperty, callback) {
    this.storageClient = storageClient;
    this.tableName = tableName;
    this.partitionKey = partitionKey;
    this.rowKeyProperty = rowKeyProperty;
    this.storageClient.createTableIfNotExists(tableName, function (error) {
        if (callback) {
            if (!error) {
                callback();
            } else {
                callback(error);
            }
        }
    });
}

function nextPage(entities, continuation, callback) {
    continuation.getNextPage(function (error, results, token) {
        entities = entities.concat(results);
        if (token.nextPartitionKey && token.nextRowKey) {
            nextPage(entities, token, callback);
        } else {
            callback(null, entities.map(function (entity) {
                delete entity._;
                return entity;
            }));
        }
    });
}

Task.prototype.queryEntities = function (query, callback) {
    var self = this;
    self.storageClient.queryEntities(query, function (error, entities, continuation) {
        if (error) {
            callback(error);
        } else {
            if (continuation.nextPartitionKey && continuation.nextRowKey) {
                nextPage(entities, continuation, callback);
            } else {
                callback(null, entities.map(function (entity) {
                    delete entity._;
                    return entity;
                }));
            }
        }
    });
};

Task.prototype.queryEntity = function (rowKey, callback) {
    var self = this;
    self.storageClient.queryEntity(self.tableName, self.partitionKey, process.env.NODE_ENV === 'dev' ? rowKey : rowKey.toString(), function (error, entity) {
        if (error) {
            callback(error);
        } else {
            callback(null, entity);
        }
    });
};

Task.prototype.insertEntity = function (item, callback) {
    var self = this;
    if (!item.PartitionKey) {
        item.PartitionKey = self.partitionKey || uuid.v4();
    }
    if (!item.RowKey) {
        item.RowKey = item[self.rowKeyProperty] || uuid.v4();
    }
    self.storageClient.insertEntity(self.tableName, item, function (error, entity) {
        if (callback) {
            if (error) {
                callback(error);
            } else {
                callback(null, entity);
            }
        }
    });
};

Task.prototype.updateEntity = function (item, callback) {
    var self = this;
    self.storageClient.queryEntity(self.tableName, self.partitionKey, item, function (error, entity) {
        if (error) {
            callback(error);
        } else {
            self.storageClient.updateEntity(self.tableName, entity, function (error, entity) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, entity);
                }
            });
        }
    });
};

Task.prototype.deleteEntity = function (item, callback) {
    this.storageClient.deleteEntity(this.tableName, item, callback);
};

Task.prototype.batchEntities = function (items, callback) {
    var self = this,
        batches = [],
        errors = [],
        i;
    while (items.length) {
        batches.push(items.splice(0, 100));
    }
    for (i = batches.length - 1; i; i -= 1) {
        (function (i) {
            var batch = batches[i],
                length = batch.length;
            setTimeout(function () {
                console.log("Batch %d of %d entities", i, length);
                self.storageClient.beginBatch();
                batch.forEach(function (item) {
                    self.insertEntity(item);
                });
                self.storageClient.commitBatch(function (error) {
                    if (error) {
                        errors.push(error);
                        console.error(error);
                    } else {
                        console.log("Batch %d committed", i);
                    }
                });
            }, i * 100);
        })(i);
    }
    callback(errors);
};

module.exports = Task;
"use strict";

var Q = require("Q"),
    uuid = require("node-uuid"),
    limit = 1000;

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
            if (entities.length === limit && continuation.nextPartitionKey && continuation.nextRowKey) {
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
    self.storageClient.queryEntity(self.tableName, self.partitionKey, rowKey.toString(), function (error, entity) {
        if (error) {
            callback(error);
        } else {
            callback(null, entity);
        }
    });
};

Task.prototype.getEntity = function (partitionKey, rowKey, callback) {
    var self = this;
    self.storageClient.queryEntity(self.tableName, partitionKey || self.partitionKey, rowKey.toString(), function (error, entity) {
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
    var self = this,
        deferred = Q.defer();
    this.storageClient.queryEntity(this.tableName, item.PartitionKey || this.partitionKey, item.RowKey || item[this.rowKeyProperty], function (error, entity) {
        if (error) {
            deferred.reject(error);
        } else {
            self.storageClient.updateEntity(self.tableName, item, function (error, entity) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(entity);
                }
            });
        }
    });
    return deferred.promise.nodeify(callback);
};

Task.prototype.deleteEntity = function (item, callback) {
    var deferred = Q.defer();
    this.storageClient.deleteEntity(this.tableName, item, function (error, result) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(result);
        }
    });
    return deferred.promise.nodeify(callback);
};

Task.prototype.batchEntities = function (items, callback) {
    var self = this,
        batches = [],
        errors = [],
        i,
        j;
    while (items.length) {
        batches.push(items.splice(0, 100));
    }
    for (i = 0, j = batches.length; i < j; i += 1) {
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

Task.prototype.insertOrReplaceEntity = function (entity, callback) {
    if (!entity.PartitionKey) {
        entity.PartitionKey = this.partitionKey;
    }
    if (!entity.RowKey) {
        entity.RowKey = this.rowKeyProperty ? (entity[this.rowKeyProperty] || uuid.v4()) : uuid.v4();
    }
    this.storageClient.insertOrReplaceEntity(this.tableName, entity, function (error) {
        if (error) {
            callback(error);
        } else {
            callback(null);
        }
    });
};

Task.prototype.insertOrMergeEntity = function (entity, callback) {
    if (!entity.PartitionKey) {
        entity.PartitionKey = this.partitionKey;
    }
    if (!entity.RowKey) {
        entity.RowKey = this.rowKeyProperty ? (entity[this.rowKeyProperty] || uuid.v4()) : uuid.v4();
    }
    this.storageClient.insertOrMergeEntity(this.tableName, entity, function (error) {
        if (error) {
            callback(error);
        } else {
            callback(null);
        }
    });
};

module.exports = Task;
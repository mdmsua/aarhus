module.exports = Task;

var async = require('async'),
    underscore = require('underscore');

function Task(storageClient, tableName, partitionKey) {
    this.storageClient = storageClient;
    this.tableName = tableName;
    this.partitionKey = partitionKey;
    this.storageClient.createTableIfNotExists(tableName, function (error) {
        if (error) {
            throw error;
        }
    });
}

Task.prototype.queryEntities = function (query, callback) {
    var self = this;
    self.storageClient.queryEntities(query, function (error, entities) {
        if (error) {
            callback(error);
        } else {
            callback(null, underscore.map(entities, function (entity) {
                delete entity._;
                return entity;
            }));
        }
    });
};

Task.prototype.insertEntity = function (item, prop, callback) {
    var self = this;
    item.PartitionKey = self.partitionKey;
    item.RowKey = self.partitionKey + '_' + item[prop];
    self.storageClient.insertEntity(self.tableName, item, function (error) {
        if (error) {
            callback(error);
        }
        callback(null);
    });
};

Task.prototype.updateEntity = function (item, callback) {
    var self = this;
    self.storageClient.queryEntity(self.tableName, self.partitionKey, item, function (error, entity) {
        if (error) {
            callback(error);
        }
        self.storageClient.updateEntity(self.tableName, entity, function (error) {
            if (error) {
                callback(error);
            }
            callback(null);
        });
    });
};

Task.prototype.batchEntities = function (items, callback) {
    var self = this;
    self.storageClient.beginBatch();
    async.forEach(items,
        function (item, callback) {
            item.RowKey = self.partitionKey + '_' + item.code;
            item.PartitionKey = self.partitionKey;
            self.storageClient.insertEntity(self.tableName, item, function (error) {
                if (error) {
                    callback(error);
                }
                callback(null);
            });
        },
        function (error) {
            if (error) {
                callback(error)
            }
            self.storageClient.commitBatch(function (error) {
                if (error) {
                    callback(error);
                }
                else {
                    callback(null);
                }
            });
        }
    );
};
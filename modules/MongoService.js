"use strict";

function MongoService(db) {
    this.db = db;
}

MongoService.prototype.createTable = function (table, callback) {
    this.db.createCollection(table, { w: 1 }, function (error, collection) {
        if (error) {
            callback(error);
        } else {
            collection.ensureIndex({ PartitionKey: 1, RowKey: 1 });
            callback(null, collection);
        }
    });
};

MongoService.prototype.createTableIfNotExists = function (table, callback) {
    this.db.createCollection(table, function (error, collection) {
        if (error) {
            callback(error);
        } else {
            collection.ensureIndex({ PartitionKey: 1, RowKey: 1 }, { unique: true}, function (error, index) {
                callback(null, collection);
            });
        }
    });
};

MongoService.prototype.deleteEntity = function (table, entityDescriptor, callback) {
    this.db.createCollection(table, function (error, collection) {
        if (error) {
            callback(error);
        } else {
            collection.remove({ $and: [{ PartitionKey: entityDescriptor.PartitionKey }, { RowKey: entityDescriptor.RowKey } ] }, true, callback);
        }
    });
};

MongoService.prototype.deleteTable = function (table, callback) {

};

MongoService.prototype.insertEntity = function (table, entityDescriptor, callback) {
    if (this.batch) {
        this.batch.table = table;
        this.batch.array.push(entityDescriptor);
    } else {
        this.db.collection(table, function (error, collection) {
            if (error) {
                callback(error);
            } else {
                collection.insert(entityDescriptor, { w: 1 }, function (error, result) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, result);
                    }
                });
            }
        });
    }
};

MongoService.prototype.insertOrMergeEntity = function (table, entityDescriptor, callback) {

};

MongoService.prototype.insertOrReplaceEntity = function (table, entityDescriptor, callback) {

};

MongoService.prototype.mergeEntity = function (table, entityDescriptor, callback) {

};

MongoService.prototype.queryEntities = function (tableQuery, callback) {
    this.db.collection(tableQuery.table, function (error, collection) {
        if (error) {
            callback(error);
        } else {
            var find = collection.find(tableQuery.query || {}, { _id: 0 });
            if (tableQuery.top) {
                find = find.limit(tableQuery.top);
            }
            find.toArray(function (error, documents) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, documents, {});
                }
            });
        }
    });
};

MongoService.prototype.queryEntity = function (table, partitionKey, rowKey, callback) {
    this.db.collection(table, function (error, collection) {
        if (error) {
            callback(error);
        } else {
            collection.findOne({ $and: [ { PartitionKey: partitionKey }, { RowKey: rowKey } ] }, { _id: 0 },
                function (error, documents) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, documents, {});
                    }
                });
        }
    });
};

MongoService.prototype.queryTables = function (callback) {

};

MongoService.prototype.updateEntity = function (table, entityDescriptor, callback) {

};

MongoService.prototype.beginBatch = function () {
    this.batch = {
        table: null,
        array: []
    };
};

MongoService.prototype.commitBatch = function (callback) {
    var self = this;
    if (self.batch) {
        self.db.collection(self.batch.table, function (error, collection) {
            if (error) {
                callback(error);
            } else {
                collection.insert(self.batch.array, { w: 1 }, function (error, result) {
                    self.batch = null;
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, result);
                    }
                });
            }
        });
    }
};

module.exports = MongoService;
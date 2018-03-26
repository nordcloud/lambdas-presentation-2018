'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.SERVERLESS_REGION,
});

AWS.config.setPromisesDependency(Promise);
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  console.log('EVENT', event);

  const fileKey = event.Records[0].s3.object.key;
  const sourceBucket = process.env.SOURCE_BUCKET;
  const fileParams = {
    Bucket: sourceBucket,
    Key: fileKey,
  };

  const processedBucket = process.env.PROCESSED_BUCKET;
  console.log(`Processing '${fileKey}'`);

  Promise.resolve()
    .then(() => processFile(fileParams, processedBucket))
    .then(() => {
      callback(null, 'Finished');
    })
    .catch((err) => {
      callback(err);
    });
};

const processFile = (fileParams, processedBucket) => {
  const fileName = fileParams.Key;
  return s3.getObject(fileParams).promise()
    .then((file) => {
      console.log(file);
      return file.Body.toString();
    })
    .then(contents => calculateTotal(contents))
    .then(total => saveToDynamo(total, fileName))
    .then(() => moveFile(fileParams, processedBucket));
};

const calculateTotal = (contents) => {
  const lines = contents.split(/[\r\n]/);
  const expensesTotal = lines.map(line => line.split(',')[2] || 0)
    .reduce((total, value) => total + (value * 1), 0);
  console.log('Expenses Total', expensesTotal);
  return expensesTotal;
};

const saveToDynamo = (total, fileName) => {
  const expensesTable = process.env.EXPENSES_TABLE;
  console.log('Saving to table', expensesTable);
  const crappyUnique = `${fileName}-${Date.now()}`;
  const putParams = {
    TableName: expensesTable,
    Item: {
      expense_id: crappyUnique,
      total,
    },
    ReturnValues: 'ALL_OLD',
  };

  return documentClient.put(putParams).promise()
    .then(() => putParams.Item);
};

const moveFile = (fileParams, targetBucket) => {
  const fileName = fileParams.Key;
  const sourceBucket = fileParams.Bucket;
  const copyParams = {
    CopySource: `${sourceBucket}/${fileName}`,
    Bucket: targetBucket,
    Key: fileName,
  };
  console.log(`Moving '${fileName}' to bucket '${targetBucket}'`);
  return s3.copyObject(copyParams).promise()
    .then(() => {
      const deleteParams = {
        Bucket: sourceBucket,
        Key: fileName,
      };

      return s3.deleteObject(deleteParams);
    });
};

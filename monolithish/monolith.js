'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.SERVERLESS_REGION,
});

AWS.config.setPromisesDependency(Promise);
const s3 = new AWS.S3();
const documentClient = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

module.exports.handler = (event, context, callback) => {
  console.log('EVENT', event);

  const sourceBucket = process.env.SOURCE_BUCKET;
  const params = {
    Bucket: sourceBucket,
  };
  console.log('Checking bucket', sourceBucket);

  s3.listObjects(params).promise()
    .then((objects) => {
      console.log('OBJECTS', objects);
      const processedBucket = process.env.PROCESSED_BUCKET;
      const rejectedBucket = process.env.REJECTED_BUCKET;
      return objects.Contents.map((item) => {
        const fileParams = {
          Bucket: sourceBucket,
          Key: item.Key,
        };
        if (item.Key.match(/expenses.*csv/)) {
          console.log(`Processing '${item.Key}'`);
          return processFile(fileParams, processedBucket);
        }

        console.log(`Rejecting '${item.Key}'`);
        return moveFile(fileParams, rejectedBucket);
      });
    })
    .then(promises => Promise.all(promises))
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
    .then((newItem) => {
      console.log('Saved Item', newItem);
      return maybeNotify(newItem);
    })
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

const maybeNotify = (newItem) => {
  if (newItem.total > 500) {
    const message = `Need to review expense report '${newItem.expense_id}' which has a value of ${newItem.total}`;

    console.log(`Sending success message to SNS Topic'${process.env.EXPENSES_NOTIFICATION_TOPIC_ARN}'`);
    const params = {
      Message: message,
      TopicArn: process.env.EXPENSES_NOTIFICATION_TOPIC_ARN,
    };

    return sns.publish(params).promise();
  }

  console.log('No need to send a message');
  return Promise.resolve();
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

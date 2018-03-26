'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.SERVERLESS_REGION,
});

const sns = new AWS.SNS({ apiVersion: '2010-03-31' });


module.exports.handler = (event, context, callback) => {
  console.log('EVENT', event.Records[0].dynamodb);

  const newItem = event.Records[0].dynamodb.NewImage;
  const total = newItem.total.N;
  if (total > 500) {
    notify(newItem)
      .then(() => {
        callback(null, 'Finished');
      })
      .catch((err) => {
        console.log('ERROR', err);
        callback(err);
      });
  }
  else {
    console.log('Nothing to do!');
    callback(null, 'Finished');
  }
};

const notify = (newItem) => {
  const total = newItem.total.N;
  const message = `Need to review expense report '${newItem.expense_id.S}' which has a value of ${total}`;
  console.log(`Sending review message to SNS Topic'${process.env.EXPENSES_NOTIFICATION_TOPIC_ARN}'`);
  const params = {
    Message: message,
    TopicArn: process.env.EXPENSES_NOTIFICATION_TOPIC_ARN,
  };

  return sns.publish(params).promise();
};

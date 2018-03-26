// 'use strict';

// const AWS = require('aws-sdk');

// AWS.config.update({
//   region: process.env.SERVERLESS_REGION,
// });

// AWS.config.setPromisesDependency(Promise);
// const s3 = new AWS.S3();
// const documentClient = new AWS.DynamoDB.DocumentClient();
// const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

// module.exports.handler = (event, context, callback) => {
//   console.log('EVENT', event);

//   const sourceBucket = process.env.SOURCE_BUCKET;
//   const params = {
//     Bucket: sourceBucket,
//   };
//   console.log('Checking bucket', sourceBucket);

//   s3.listObjects(params).promise()
//     .then((objects) => {
//       console.log('OBJECTS', objects);
//       const processedBucket = process.env.PROCESSED_BUCKET;
//       const rejectedBucket = process.env.REJECTED_BUCKET;
//       return objects.Contents.map((item) => {
//         const fileParams = {
//           Bucket: sourceBucket,
//           Key: item.Key,
//         };
//         if (item.Key.match(/expenses.*csv/)) {
//           console.log(`Processing '${item.Key}'`);
//           return processFile(fileParams, processedBucket);
//         }

//         console.log(`Rejecting '${item.Key}'`);
//         return moveFile(fileParams, rejectedBucket);
//       });
//     })
//     .then(promises => Promise.all(promises))
//     .then(() => {
//       callback(null, 'Finished');
//     })
//     .catch((err) => {
//       callback(err);
//     });
// };

// const processFile = (fileParams, processedBucket) => {
//   const fileName = fileParams.Key;
//   return s3.getObject(fileParams).promise()
//     .then((file) => {
//       console.log(file);
//       return file.Body.toString();
//     })
//     .then(contents => calculateTotal(contents))
//     .then(total => saveToDynamo(total, fileName))
//     .then((newItem) => {
//       console.log('Saved Item', newItem);
//       return maybeNotify(newItem);
//     })
//     .then(() => moveFile(fileParams, processedBucket));
// };





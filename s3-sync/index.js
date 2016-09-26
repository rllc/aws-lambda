'use strict';
console.log('Loading function');

let fs = require('fs');
let aws = require('aws-sdk');
let id3 = require('id3-parser');
let firebase = require('firebase');
var Promise = require("bluebird");
let s3 = new Promise.promisifyAll(new aws.S3({ apiVersion: '2006-03-01' }));
// let s3 = new aws.S3({ apiVersion: '2006-03-01' });

firebase.initializeApp({
  serviceAccount: JSON.parse(process.env.SERVICE_ACCOUNT),
  databaseURL: process.env.DATABASE_URL
});

exports.handler = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false

    function getSermon(bucket, key, cb) {
      s3.getObject({Bucket: bucket, Key: key}, (err, data) => {
          if (err) {
              console.log(err);
              const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
              console.log(message);
          } else {
            cb(data);
          }
    })
  }

    function parseAndUpdate(bucket, data) {
      id3.parse(new Buffer(data.Body)).then(function (tag) {
        console.log(tag);

        firebase.database().ref('congregations/' + bucket + '/sermons').push({
            minister : tag.artist,
            bibleText : tag.album,
            comments : tag.comment,
            date : tag.title,
            fileUrl : fileUrl
          })
          .then(function(data) {
            console.log(fileUrl + " : CREATED");
          }).catch(function (error) {
            console.log('Database set error ' + error);
          });
      });
    }

    function s3ListObjects(bucket, params, cb) {
      console.log("s3ListObjects")
        s3.listObjectsV2(params, function(err, data) {
            if (err) {
                console.log("listS3Objects Error:", err);
            } else {
                for (var index in data.Contents) {
                  var item = data.Contents[index];
                  console.log("item : " + JSON.stringify(item, null, 2));
                  getSermon(bucket, item.Key, function(data) {
                    parseAndUpdate(bucket, data);
                  })
                }

                if (data.IsTruncated) {
                    // Set Marker to last returned key
                    params.Marker = contents[contents.length-1].Key;
                    s3ListObjects(params, cb);
                } else {
                    cb();
                }
            }
        });
    }

    function finalize() {
      console.log("finalizing...");
    }

// kick off processing
    s3.listBucketsAsync()
      .then(function(data){
        console.log("listBucketsAsync")
        for (var index in data.Buckets) {
          var bucket = data.Buckets[index];
          console.log("Bucket: ", bucket.Name, ' : ', bucket.CreationDate);
          console.log("bucket : " + JSON.stringify(bucket, null, 2))
          var params = {
              Bucket: bucket.Name
          };
          s3ListObjects(bucket.Name, params, finalize);
        }
      })
      .catch(function(error){
        context.fail(error);
      });
    //
    //   .then(Promise.promisify())
    //
    //
    // function(err, data) {
    //     if (err) {
    //       console.log("Error:", err);
    //     }
    //     else {
    //       for (var index in data.Buckets) {
    //         var bucket = data.Buckets[index];
    //         console.log("Bucket: ", bucket.Name, ' : ', bucket.CreationDate);
    //         console.log("bucket : " + JSON.stringify(bucket, null, 2))
    //         var params = {
    //             Bucket: bucket.Name
    //         };
    //         s3ListObjects(params, s3Print);
    //       }
    //     }
    //
    //   })
    //


      // s3ListObjects({Bucket: 'minneapolis-archives'}, s3Print);
};

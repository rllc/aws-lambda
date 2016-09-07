'use strict';
console.log('Loading function');

let fs = require('fs');
let aws = require('aws-sdk');
let id3 = require('id3-parser');
let firebase = require('firebase');
let s3 = new aws.S3({ apiVersion: '2006-03-01' });

firebase.initializeApp({
  serviceAccount: JSON.parse(process.env.SERVICE_ACCOUNT),
  databaseURL: process.env.DATABASE_URL
});

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event, null, 2));
    const s3Data = event.Records[0].s3;
    const eventName = event.Records[0].eventName;
    const bucket = s3Data.bucket.name;
    const key = decodeURIComponent(s3Data.object.key.replace(/\+/g, ' '));
    const fileUrl = 'https://s3.amazonaws.com/'  + bucket + '/' + key;

    function deleteSermon() {

      firebase.database()
          .ref('congregations/' + bucket + '/sermons')
          .orderByChild('fileUrl')
          .equalTo(fileUrl)
          .limitToFirst(1)
          .once('value', function(snap) {
            snap.forEach(function(childSnapshot) {
              var key = childSnapshot.key;
              console.log("key : " + key);

              firebase.database().ref('congregations/' + bucket + '/sermons/' + key).remove()
                .then(function() {
                  console.log("Remove succeeded.")
                  callback(null, fileUrl + " : DELETED");
                })
                .catch(function(error) {
                  console.log("Remove failed: " + error.message)
                  callback(null, fileUrl + " : DELETE FAILED");
                });
            });
          });
    }

    function addSermon() {
      s3.getObject({Bucket: bucket, Key: key}, (err, data) => {
          if (err) {
              console.log(err);
              const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
              console.log(message);
              callback(message);
          } else {
              // TODO : check if file already exists in database
              console.log('parsing data...');
              id3.parse(new Buffer(data.Body)).then(function (tag) {
                console.log('data parsed...');
                console.log(tag);

                firebase.database().ref('congregations/' + bucket + '/sermons').push({
                    minister : tag.artist,
                    bibleText : tag.album,
                    comments : tag.comment,
                    date : tag.title,
                    fileUrl : fileUrl
                  }).then(function(data) {
                    console.log(fileUrl + " : CREATED");
                    callback(null, fileUrl + " : CREATED");
                  }).catch(function (error) {
                    console.log('Database set error ' + error);
                    callback('Database set error ' + error);
                  });
              });
          }
      });
    }

    if (eventName.includes('ObjectRemoved')) {
        console.log(fileUrl + ' [DELETING]');
        deleteSermon();
    }
    else if (eventName.includes('ObjectCreated')) {
        console.log(fileUrl + ' [CREATING]');
        addSermon();
  }
};

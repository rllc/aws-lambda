'use strict';
console.log('Loading function');

let firebase = require('firebase');
let crypto = require('crypto');
let moment = require('moment');
let aws = require('aws-sdk');
let s3 = new aws.S3({ apiVersion: '2006-03-01' });
let id3 = require('id3-parser');

aws.config.setPromisesDependency(require('q').Promise);

firebase.initializeApp({
  serviceAccount: JSON.parse(process.env.SERVICE_ACCOUNT),
  databaseURL: process.env.DATABASE_URL
});

exports.handler = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false
    console.log(JSON.stringify(event, null, 2));
    const s3Data = event.Records[0].s3;
    const eventName = event.Records[0].eventName;
    const bucket = s3Data.bucket.name;
    const key = decodeURIComponent(s3Data.object.key.replace(/\+/g, ' '));
    const fileUrl = 'https://s3.amazonaws.com/'  + bucket + '/' + s3Data.object.key;
    const databaseKey = 'sermons/' + crypto.createHash('md5').update(s3Data.object.key).digest("hex");

    function persistSermon(sermonData, label) {
      console.log('sermonData: %j, databaseKey: %s', sermonData, databaseKey);
      firebase.database().ref(databaseKey).set(sermonData).then(function(data) {
        callback(null, fileUrl + " : " + label);
      }).catch(function (error) {
        callback('Database set error ' + error);
      });
    }

    function persistEmptySermon() {
      const sermonData = {
        bucketID : bucket,
        minister : '',
        bibleText : '',
        comments : '',
        date : moment().format(),
        published : false,
        fileUrl : fileUrl
      };
      persistSermon(sermonData, 'CREATED');
    }

    function formatDate(date) {
      console.log('formatDate');
      var formattedDate = moment(date.substring(0,10), 'MM/DD/YYYY').format();
      if ('Invalid date' === formattedDate) {
        formattedDate = moment().format();
      }
      return formattedDate;
    }

    if (eventName.includes('ObjectRemoved')) {
        console.log(fileUrl + ' [DELETING]');
        persistSermon(null, 'DELETED');
    }
    else if (eventName.includes('ObjectCreated')) {
        console.log(fileUrl + ' [CREATING]');
        s3.getObject({Bucket: bucket, Key: key}).promise()
        .then(function(data) {
          console.log('parsing mp3 tag');
          id3.parse(new Buffer(data.Body))
          .then(function (tag) {
            console.log('parsed mp3 tag');
            const sermonData = {
              bucketID : bucket,
              minister : tag.artist ? tag.artist : '',
              bibleText : tag.album ? tag.album : '',
              comments : tag.comment ? tag.comment : '',
              date : formatDate(tag.title ? tag.title : ''),
              published : false,
              fileUrl : fileUrl
            };
            persistSermon(sermonData, 'CREATED');
          },
          function(err) {
            console.log('unable to parse mp3 tag : ' + err);
            persistEmptySermon();
          });
        }).catch(function(err) {
          console.log(err);
          const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
          console.log(message);
          persistEmptySermon();
        });
  }
};

'use strict';
console.log('Loading function');

let firebase = require('firebase');
let crypto = require('crypto');

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
    const fileUrl = 'https://s3.amazonaws.com/'  + bucket + '/' + s3Data.object.key;
    const databaseKey = 'sermons/' + crypto.createHash('md5').update(s3Data.object.key).digest("hex");

    function persistSermon(sermonData, label) {
      firebase.database().ref(databaseKey).set(sermonData).then(function(data) {
        callback(null, fileUrl + " : " + label);
      }).catch(function (error) {
        callback('Database set error ' + error);
      });
    }

    if (eventName.includes('ObjectRemoved')) {
        console.log(fileUrl + ' [DELETING]');
        persistSermon(null, 'DELETED');
    }
    else if (eventName.includes('ObjectCreated')) {
        console.log(fileUrl + ' [CREATING]');
        const sermonData = {
          bucketID : bucket,
          minister : '',
          bibleText : '',
          comments : '',
          date : '',
          published : false,
          fileUrl : fileUrl
        };
        persistSermon(sermonData, 'CREATED');
  }
};

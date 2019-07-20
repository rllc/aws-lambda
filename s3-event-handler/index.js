'use strict';
console.log('Loading function');

let firebase = require('firebase');
let crypto = require('crypto');
let moment = require('moment');
let aws = require('aws-sdk');
let s3 = new aws.S3({
  apiVersion: '2006-03-01'
});
let id3 = require('id3-parser');
let ses = new aws.SES({
  region: 'us-east-1',
  apiVersion: '2010-12-01'
});

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
  const fileUrl = 'https://s3.amazonaws.com/' + bucket + '/' + s3Data.object.key;
  const sermonHash = crypto.createHash('md5').update(s3Data.object.key).digest("hex");
  const databaseKey = 'sermons/' + sermonHash;

  function buildDestinations(sermonData) {
    var congregationAdmins = [{
        "bucket": "alaska-archives",
        "admins": [{
          "name": "Richard",
          "email": "rjinalaska@gmail.com"
        }]
      },
      {
        "bucket": "cokato-archives",
        "admins": [{
          "name": "Mike",
          "email": "mjanck@yahoo.com"
        }]
      },
      {
        "bucket": "elk-river-archives",
        "admins": [{
          "name": "Webcasters",
          "email": "webcast@llcer.org"
        }]
      },
      {
        "bucket": "glendale-archives",
        "admins": [{
          "name": "Ben",
          "email": "bengran@gmail.com"
        }]
      },
      {
        "bucket": "ishpeming-archives",
        "admins": [{
          "name": "Ishpeming",
          "email": "ishpemingllc@gmail.com"
        }]
      },
      {
        "bucket": "llc-outlook-archives",
        "admins": [{
            "name": "Bryce",
            "email": "bpirness@gmail.com"
          },
          {
            "name": "Dave",
            "email": "andey51@gmail.com"
          }
        ]
      },
      {
        "bucket": "llchurch-archives",
        "admins": [{
          "name": "Adrian",
          "email": "apirness@gmail.com"
        }]
      },
      {
        "bucket": "longview-archives",
        "admins": [{
          "name": "Longview",
          "email": "lllcarchives@gmail.com"
        }]
      },
      {
        "bucket": "menahga-archives",
        "admins": [{
          "name": "Dan",
          "email": "djarvi@wcta.net"
        }]
      },
      {
        "bucket": "minneapolis-archives",
        "admins": [{
            "name": "Robert",
            "email": "bob.hall88@gmail.com"
          },
          {
            "name": "Minneapolis",
            "email": "broadcast@mllchurch.org"
          }
        ]
      },
      {
        "bucket": "monticello-archives",
        "admins": [{
            "name": "Tim",
            "email": "timhillu03@gmail.com"
          },
          {
            "name": "Bruce",
            "email": "bherrala@gmail.com"
          },
          {
            "name": "Monticello Archiver",
            "email": "llcmwebcast@gmail.com"
          }
        ]
      },
      {
        "bucket": "phoenix-archives",
        "admins": [{
          "name": "Dave",
          "email": "davebrianna@gmail.com"
        }]
      },
      {
        "bucket": "roaring-fork-valley-archives",
        "admins": [{
          "name": "Nathan",
          "email": "nathanmarj@gmail.com"
        }]
      },
      {
        "bucket": "rockford-archives",
        "admins": [{
            "name": "Allen",
            "email": "akumpula03@gmail.com"
          },
          {
            "name": "Jouko",
            "email": "jouko.haapsaari@gmail.com"
          },
          {
            "name": "Andrew",
            "email": "adparks1011@gmail.com"
          },
          {
            "name": "Blair",
            "email": "blairn2010@gmail.com"
          },
          {
            "name": "Jordan",
            "email": "j.nikula13@gmail.com"
          },
          {
            "name": "Rick",
            "email": "nevala.rick@gmail.com"
          },
          {
            "name": "Darrel",
            "email": "dhillukka@gmail.com"
          },
          {
            "name": "Chet",
            "email": "laurachetdavison@gmail.com"
          },
          {
            "name": "Phillip",
            "email": "philliploukusa@gmail.com"
          },
          {
            "name": "Jake",
            "email": "jakerfuller@gmail.com"
          },
          {
            "name": "Steve",
            "email": "smcadams86+archive.llchurch.org@gmail.com"
          }
        ]
      },
      {
        "bucket": "seattle-archives",
        "admins": [{
            "name": "Tyson",
            "email": "tyson.huotari@inquisitek.com"
          },
          {
            "name": "Todd",
            "email": "todd.huotari@inquisitek.com"
          }
        ]
      },
      {
        "bucket": "toronto-archives",
        "admins": [{
          "name": "Daniel",
          "email": "tllcrecord@gmail.com"
        }]
      },
      {
        "bucket": "williston-archives",
        "admins": [{
          "name": "Ryan",
          "email": "rerintam@mtu.edu"
        }]
      },
      {
        "bucket": "wolf-lake-archives",
        "admins": [{
          "name": "Ethan",
          "email": "ethan.viking73@gmail.com"
        }]
      }
    ];

    return congregationAdmins.find(function(bucket) {
      return bucket.bucket == sermonData.bucketID
    }).admins.map(function(admin) {
      return {
        "Destination": {
          "ToAddresses": [
            admin.email
          ]
        },
        "ReplacementTemplateData": "{ \"name\":\"" + admin.name + "\" }"
      }
    });
  }

  function buildEmail(sermonData) {
    var emailData = {
      name: "",
      sermonHash: sermonHash,
      minister: sermonData.minister,
      bibleText: sermonData.bibleText,
      event: sermonData.comments,
      date: sermonData.date,
      bucket: sermonData.bucketID,
      fileUrl: sermonData.fileUrl
    };

    return {
      "Source": "smcadams86+archive.llchurch.org@gmail.com",
      "Template": "sermon-uploaded",
      "Destinations": buildDestinations(sermonData),
      "DefaultTemplateData": JSON.stringify(emailData)
    };
  }

  function persistSermon(sermonData, label) {
    console.log('sermonData: %j, databaseKey: %s', sermonData, databaseKey);
    firebase.database().ref(databaseKey).set(sermonData).then(function(data) {
      if (sermonData != null) {
        ses.sendBulkTemplatedEmail(buildEmail(sermonData), function(err, data) {
          if (err) {
            console.log(err);
            callback('Send Email Error' + error);
          } else {
            callback(null, fileUrl + " : " + label);
          }
        });
      } else {
        callback(null, fileUrl + " : " + label);
      }
    }).catch(function(error) {
      callback('Database set error ' + error);
    });
  }

  function persistEmptySermon() {
    const sermonData = {
      bucketID: bucket,
      minister: '',
      bibleText: '',
      comments: '',
      date: moment().format(),
      published: false,
      fileUrl: fileUrl
    };
    persistSermon(sermonData, 'CREATED');
  }

  function formatDate(date) {
    console.log('formatDate');
    var formattedDate = moment(date.substring(0, 10), 'MM/DD/YYYY').format();
    if ('Invalid date' === formattedDate) {
      formattedDate = moment().format();
    }
    return formattedDate;
  }

  if (eventName.includes('ObjectRemoved')) {
    console.log(fileUrl + ' [DELETING]');
    persistSermon(null, 'DELETED');
  } else if (eventName.includes('ObjectCreated')) {
    console.log(fileUrl + ' [CREATING]');
    s3.getObject({
        Bucket: bucket,
        Key: key
      }).promise()
      .then(function(data) {
        console.log('parsing mp3 tag');
        id3.parse(new Buffer(data.Body))
          .then(function(tag) {
              console.log('parsed mp3 tag: %j', tag);
              const sermonData = {
                bucketID: bucket,
                minister: tag.artist ? tag.artist : '',
                bibleText: tag.album ? tag.album : '',
                comments: tag.comments ? tag.comments : '',
                date: formatDate(tag.title ? tag.title : ''),
                published: false,
                fileUrl: fileUrl
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

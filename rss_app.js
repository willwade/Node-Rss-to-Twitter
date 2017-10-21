var request = require('request'),
url = require('url'),
htmlparser = require('htmlparser'),
fs = require('fs'),
Twit = require('twit');

// Config variables
if (!process.env.rssUrl){
	var rssUrl = 'https://openassistive.org/index.xml';
} else {
	var rssUrl = process.env.rssUrl;
}

if (!process.env.intervalLength){
	var intervalLength = 3600000;
} else {
	var intervalLength = process.env.intervalLength;
}

// Setup vars for twitter posting
if (!process.env.twitterConsumerKey){
  console.error('No twitterConsumerKey env var set! Now quitting');
  process.exit(-1);
}

if (!process.env.twitterConsumerSecret){
  console.error('No twitterConsumerSecret env var set! Now quitting');
  process.exit(-1);
}

if (!process.env.twitterAccessToken){
  console.error('No twitterAccessToken env var set! Now quitting');
  process.exit(-1);
}

if (!process.env.twitterAccessTokenSecret){
  console.error('No twitterAccessTokenSecret env var set! Now quitting');
  process.exit(-1);
}

var twitter = new Twit({
    consumer_key:         process.env.twitterConsumerKey
  , consumer_secret:      process.env.twitterConsumerSecret
  , access_token:         process.env.twitterAccessToken
  , access_token_secret:  process.env.twitterAccessTokenSecret
});

// Get date of latest posted article
var lastestPostedItemDate = getLatestPostedItemDate();

// Needed for RSS parsing
var handler = new htmlparser.RssHandler();
var parser = new htmlparser.Parser(handler);

// function to sort of dates
function compareDates(a, b) {
    var aDate = new Date(a.pubDate);
    var bDate = new Date(b.pubDate);

    if (aDate < bDate)
        return -1;
    if (aDate > bDate)
        return 1;
    return 0;
}

// get the date (uses flat file to be replaced with MongoDB)
function getLatestPostedItemDate(){
    var dateString = fs.readFileSync('lastestPostedDate.txt').toString();
    return new Date(dateString);
}

// set the date (uses flat file to be replaced with MongoDB)
function setLatestPostedItemDate(date){
    lastestPostedItemDate = date;
    // write to file
    fs.writeFile('lastestPostedDate.txt', lastestPostedItemDate);
    return true;
}

// post item to twitter
function publishToTwitter(item){
    var tweet = item.title + ' ' + item.link;
    console.log('publishing to twitter');
    
    twitter.post('statuses/update', { status: tweet }, function(err, data, response) {
		     if (err)
			 console.log(err);
		     console.log(data);
		 });

}

// looping on the server (every second)
setInterval(function(){
    request({uri: rssUrl}, function(err, response, body){

        // Basic error check
        if(err && response.statusCode !== 200){
            console.log('Request error.');
        }
        
        parser.parseComplete(body);
        var items = handler.dom.items;
        var itemsToPublish = []; // Array

        for(key in items){
            //console.log(prop + ': ' + items[prop].title + ' ' + items[prop].link + '\n');
            var itemDate = new Date(items[key].pubDate);
            if(itemDate > lastestPostedItemDate){
                // add to a publish array here
                itemsToPublish.push(items[key]);
            };
        }
        // sort items to publish on pubDate
        itemsToPublish.sort(compareDates);

        for(var i in itemsToPublish){
            console.log(itemsToPublish[i].pubDate + ' ' + itemsToPublish[i].title);
            publishToTwitter(itemsToPublish[i]);
            setLatestPostedItemDate(itemsToPublish[i].pubDate);
        }
    });
    console.log('\n');
}, intervalLength);

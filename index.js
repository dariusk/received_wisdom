var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var inflection = require('inflection');
var Twit = require('twit');
var T = new Twit(require('./config.js'));
var wordfilter = require('wordfilter');
var wordnikKey = require('./permissions.js').key;
var pos = require('pos');
var proverbs = _.chain(require('./proverbs.json').proverbs)
                .map(function(el) { return _.values(el)[0]; })
                .flatten()
                .value();

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};

function generate() {
  var dfd = new _.Deferred();
  /*
  var url = 'someUrl';
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = '';
      var $ = cheerio.load(body);
      // parse stuff and resolve
      dfd.resolve(result);
    }
    else {
      dfd.reject();
    }
  });
  */
  var sayings = [];
  _.each(proverbs, function(proverb) {
    var words = new pos.Lexer().lex(proverb);
    var tags = new pos.Tagger().tag(words);
    var nouns = [];
    var pnouns = [];
    for (i in tags) {
      var word = tags[i][0];
      var part = tags[i][1];
      if ((part === "NN" || part === "NNP") && word.length > 3 && word !== 'wasn') {
        nouns.push(word);
      }
      if ((part === "NNS" || part === "NNPS") && word.length > 3) {
        pnouns.push(word);
      }
    }
    if (nouns.length === 2 && nouns[0].toLowerCase() !== nouns[1].toLowerCase()) {
      proverb = proverb.replace(nouns[0], 'NOUN1');
      proverb = proverb.replace(nouns[1], 'NOUN2');
      proverb = proverb.replace('NOUN1', nouns[1]);
      proverb = proverb.replace('NOUN2', nouns[0]);
      sayings.push(inflection.humanize(proverb));
    }
    else if (pnouns.length === 2 && pnouns[0].toLowerCase() !== pnouns[1].toLowerCase()) {
      proverb = proverb.replace(pnouns[0], 'NOUN1');
      proverb = proverb.replace(pnouns[1], 'NOUN2');
      proverb = proverb.replace('NOUN1', pnouns[1]);
      proverb = proverb.replace('NOUN2', pnouns[0]);
      sayings.push(inflection.humanize(proverb));
    }
  });
  

  dfd.resolve(sayings.pick());
  return dfd.promise();
}

function tweet() {
  generate().then(function(myTweet) {
    if (!wordfilter.blacklisted(myTweet)) {
      console.log(myTweet);
      T.post('statuses/update', { status: myTweet }, function(err, reply) {
        if (err) {
          console.log('error:', err);
        }
        else {
          console.log('reply:', reply);
        }
      });
    }
  });
}

// Tweet once on initialization
tweet();

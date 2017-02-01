// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization and
// Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2015

"use strict";

// built-in path module
var path    = require('path');
// load modules from the server's folder
var request = require(path.join(module.parent.exports.dirname, 'request'));  // HTTP client request


var quotes = [];

function processRequest(wsio, data, config) {
	var headers = {
		'User-Agent':   'NodeJS/4.0',
		'Content-Type': 'application/json'
	};

	if (data.query.image) {
		request({url: data.query.url, headers: headers}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var json  = JSON.parse(body);
				var quote = quotes[Math.floor(Math.random() * quotes.length)];
				if (data.broadcast === true) {
					// get the broadcast function from main module
					// send the data to all display nodes
					module.parent.exports.broadcast('broadcast', {
						app: data.app, func: data.func,
						data: {picture: json, quote: quote, err: null}
					});
				} else {
					// send data to the master display node
					wsio.emit('broadcast', {app: data.app, func: data.func, data: {picture: json, quote: quote, err: null}});
				}
			}
		});
	} else if (data.query.location) {
		// "ip": "131.193.78.133",
		// "hostname": "No Hostname",
		// "city": "Chicago",
		// "region": "Illinois",
		// "country": "US",
		// "loc": "41.8784,-87.6852",
		// "org": "AS6200 University of Illinois at Chicago",
		// "postal": "60612"

		request({url: 'http://ipinfo.io/', timeout: 2000}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var geojson = JSON.parse(body);
				// var loc = geojson.city + '/' + geojson.region + '/' + geojson.country;
				if (data.broadcast === true) {
					// send the data to all display nodes
					module.parent.exports.broadcast('broadcast', {
						app: data.app, func: data.func,
						data: {location: geojson, err: null}
					});
				} else {
					// send data to the master display node
					wsio.emit('broadcast', {app: data.app, func: data.func, data: {location: geojson, err: null}});
				}
			} else {
				console.log('ipinfo> failed', error);
			}
		});
	} else if (data.query.weather) {
		var appID = "87631523c20f9cc12d59c3791a9f6eb1";
		var aUrl  = "http://api.openweathermap.org/data/2.5/weather?q=";
		if (data.query.place) {
			aUrl += data.query.place;
		} else {
			aUrl += "chicago,IL";
		}
		aUrl += "&APPID=" + appID;
		aUrl += "&units=imperial";
		request({url: aUrl, timeout: 2000}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var wjson = JSON.parse(body);
				if (data.broadcast === true) {
					// send the data to all display nodes
					module.parent.exports.broadcast('broadcast', {
						app: data.app, func: data.func,
						data: {weather: wjson, err: null}
					});
				} else {
					// send data to the master display node
					wsio.emit('broadcast', {app: data.app, func: data.func, data: {weather: wjson, err: null}});
				}
			} else {
				console.log('Weather> failed', error);
			}
		});
	}

}

module.exports = processRequest;

quotes.push("A beautiful, smart, and loving person will be coming into your life.");
quotes.push("A dubious friend may be an enemy in camouflage.");
quotes.push("A feather in the hand is better than a bird in the air.");
quotes.push("A fresh start will put you on your way.");
quotes.push("A friend asks only for your time not your money.");
quotes.push("A friend is a present you give yourself.");
quotes.push("A gambler not only will lose what he has, but also will lose what he doesn’t have.");
quotes.push("A golden egg of opportunity falls into your lap this month.");
quotes.push("A good friendship is often more important than a passionate romance.");
quotes.push("A good time to finish up old tasks.");
quotes.push("A hunch is creativity trying to tell you something.");
quotes.push("A light heart carries you through all the hard times.");
quotes.push("A new perspective will come with the new year.");
quotes.push("A person is never to (sic) old to learn.");
quotes.push("A person of words and not deeds is like a garden full of weeds.");
quotes.push("A pleasant surprise is waiting for you.");
quotes.push("A smile is your personal welcome mat.");
quotes.push("A smooth long journey! Great expectations.");
quotes.push("A soft voice may be awfully persuasive.");
quotes.push("A truly rich life contains love and art in abundance.");
quotes.push("Accept something that you cannot change, and you will feel better.");
quotes.push("Adventure can be real happiness.");
quotes.push("Advice is like kissing. It costs nothing and is a pleasant thing to do.");
quotes.push("Advice, when most needed, is least heeded.");
quotes.push("All the effort you are making will ultimately pay off.");
quotes.push("All the troubles you have will pass away very quickly.");
quotes.push("All will go well with your new project.");
quotes.push("All your hard work will soon pay off.");
quotes.push("Allow compassion to guide your decisions.");
quotes.push("An agreeable romance might begin to take on the appearance.");
quotes.push("An important person will offer you support.");
quotes.push("An inch of time is an inch of gold.");
quotes.push("Any decision you have to make tomorrow is a good decision.");
quotes.push("At the touch of love, everyone becomes a poet.");
quotes.push("Be careful or you could fall for some tricks today.");
quotes.push("Beauty in its various forms appeals to you.");
quotes.push("Because you demand more from yourself, others respect you deeply.");
quotes.push("Believe in yourself and others will too.");
quotes.push("Believe it can be done.");
quotes.push("Better ask twice than lose yourself once.");
quotes.push("Carve your name on your heart and not on marble.");
quotes.push("Change is happening in your life, so go with the flow!");
quotes.push("Competence like yours is underrated.");
quotes.push("Congratulations! You are on your way.");
quotes.push("Could I get some directions to your heart?");
quotes.push("Courtesy begins in the home.");
quotes.push("Courtesy is contagious.");
quotes.push("Curiosity kills boredom. Nothing can kill curiosity.");
quotes.push("Dedicate yourself with a calm mind to the task at hand.");
quotes.push("Depart not from the path which fate has you assigned.");
quotes.push("Determination is what you need now.");
quotes.push("Disbelief destroys the magic.");
quotes.push("Distance yourself from the vain.");
quotes.push("Do not be intimidated by the eloquence of others.");
quotes.push("Do not demand for someone’s soul if you already got his heart.");
quotes.push("Do not let ambitions overshadow small success.");
quotes.push("Do not make extra work for yourself.");
quotes.push("Do not underestimate yourself. Human beings have unlimited potentials.");
quotes.push("Don’t be discouraged, because every wrong attempt discarded is another step forward.");
quotes.push("Don’t confuse recklessness with confidence.");
quotes.push("Don’t just spend time. Invest it.");
quotes.push("Don’t just think, act!");
quotes.push("Don’t let friends impose on you, work calmly and silently.");
quotes.push("Don’t let the past and useless detail choke your existence.");
quotes.push("Don’t let your limitations overshadow your talents.");
quotes.push("Don’t worry; prosperity will knock on your door soon.");
quotes.push("Each day, compel yourself to do something you would rather not do.");
quotes.push("Education is the ability to meet life’s situations.");
quotes.push("Emulate what you admire in your parents.");
quotes.push("Emulate what you respect in your friends.");
quotes.push("Every flower blooms in its own sweet time.");
quotes.push("Every wise man started out by asking many questions.");
quotes.push("Everyday in your life is a special occasion.");
quotes.push("Failure is the chance to do better next time.");
quotes.push("Fear and desire — two sides of the same coin.");
quotes.push("Feeding a cow with roses does not get extra appreciation.");
quotes.push("For hate is never conquered by hate. Hate is conquered by love.");
quotes.push("Fortune Not Found: Abort, Retry, Ignore?");
quotes.push("From listening comes wisdom and from speaking repentance.");
quotes.push("From now on your kindness will lead you to success.");
quotes.push("Get your mind set — confidence will lead you on.");
quotes.push("Get your mind set…confidence will lead you on.");
quotes.push("Go take a rest; you deserve it.");
quotes.push("Good news will be brought to you by mail.");
quotes.push("Good news will come to you by mail.");
quotes.push("Good to begin well, better to end well.");
quotes.push("Happiness begins with facing life with a smile and a wink.");
quotes.push("Happiness will bring you good luck.");
quotes.push("Happy life is just in front of you.");
quotes.push("Hard words break no bones, fine words butter no parsnips.");
quotes.push("Have a beautiful day.");
quotes.push("He who expects no gratitude shall never be disappointed.");
quotes.push("He who knows he has enough is rich.");
quotes.push("Help! I’m being held prisoner in a chinese bakery!");
quotes.push("How you look depends on where you go.");
quotes.push("I learn by going where I have to go.");
quotes.push("If a true sense of value is to be yours it must come through service.");
quotes.push("If certainty were truth, we would never be wrong.");
quotes.push("If you continually give, you will continually have.");
quotes.push("If you look in the right places, you can find some good offerings.");
quotes.push("If you think you can do a thing or think you can’t do a thing, you’re right.");
quotes.push("If your desires are not extravagant, they will be granted.");
quotes.push("If your desires are not to extravagant they will be granted. (2)");
quotes.push("Imagination rules the world.");
quotes.push("In order to take, one must first give.");
quotes.push("In the end all things will be known.");
quotes.push("It could be better, but its[sic] good enough.");
quotes.push("It is better to be an optimist and proven a fool than to be a pessimist and be proven right.");
quotes.push("It is better to deal with problems before they arise.");
quotes.push("It is honorable to stand up for what is right, however unpopular it seems.");
quotes.push("It is worth reviewing some old lessons.");
quotes.push("It takes courage to admit fault.");
quotes.push("It’s time to get moving. Your spirits will lift accordingly.");
quotes.push("Keep your face to the sunshine and you will never see shadows.");
quotes.push("Let the world be filled with tranquility and goodwill.");
quotes.push("Like the river flow into the sea. Something are just meant to be.");
quotes.push("Listen not to vain words of empty tongue.");
quotes.push("Listen to everyone. Ideas come from everywhere.");
quotes.push("Living with a commitment to excellence shall take you far.");
quotes.push("Long life is in store for you.");
quotes.push("Love is a warm fire to keep the soul warm.");
quotes.push("Love is like sweet medicine, good to the last drop.");
quotes.push("Love lights up the world.");
quotes.push("Love truth, but pardon error.");
quotes.push("Man is born to live and not prepared to live.");
quotes.push("Man’s mind, once stretched by a new idea, never regains it’s original dimensions.");
quotes.push("Many will travel to hear you speak.");
quotes.push("Meditation with an old enemy is advised.");
quotes.push("Miles are covered one step at a time.");
quotes.push("Nature, time and patience are the three great physicians.");
quotes.push("Never fear! The end of something marks the start of something new.");
quotes.push("New ideas could be profitable.");
quotes.push("New people will bring you new realizations, especially about big issues.");
quotes.push("No one can walk backwards into the future.");
quotes.push("Now is a good time to buy stock.");
quotes.push("Now is the time to go ahead and pursue that love interest!");
quotes.push("Now is the time to try something new");
quotes.push("Now is the time to try something new.");
quotes.push("Others can help you now.");
quotes.push("Pennies from heaven find their way to your doorstep this year!");
quotes.push("People are attracted by your Delicate[sic] features.");
quotes.push("People find it difficult to resist your persuasive manner.");
quotes.push("Perhaps you’ve been focusing too much on saving.");
quotes.push("Physical activity will dramatically improve your outlook today.");
quotes.push("Place special emphasis on old friendship.");
quotes.push("Please visit us at www.wontonfood.com");
quotes.push("Practice makes perfect.");
quotes.push("Protective measures will prevent costly disasters.");
quotes.push("Put your mind into planning today. Look into the future.");
quotes.push("Remember to share good fortune as well as bad with your friends.");
quotes.push("Rest has a peaceful effect on your physical and emotional health.");
quotes.push("Resting well is as important as working hard.");
quotes.push("Romance moves you in a new direction.");
quotes.push("Savor your freedom — it is precious.");
quotes.push("Say hello to others. You will have a happier day.");
quotes.push("Self-knowledge is a life long process.");
quotes.push("Share your joys and sorrows with your family.");
quotes.push("Sloth makes all things difficult; industry all easy.");
quotes.push("Small confidences mark the onset of a friendship.");
quotes.push("Society prepares the crime; the criminal commits it.");
quotes.push("Someone you care about seeks reconciliation.");
quotes.push("Soon life will become more interesting.");
quotes.push("Stand tall. Don’t look down upon yourself.");
quotes.push("Staying close to home is going to be best for your morale today");
quotes.push("Stop searching forever, happiness is just next to you.");
quotes.push("Success is a journey, not a destination.");
quotes.push("Success is going from failure to failure without loss of enthusiasm.");
quotes.push("Swimming is easy. Stay floating is hard.");
quotes.push("Take care and sensitivity you show towards others will return to you.");
quotes.push("Take the high road.");
quotes.push("Technology is the art of arranging the world so we do not notice it.");
quotes.push("The austerity you see around you covers the richness of life like a veil.");
quotes.push("The best prediction of future is the past.");
quotes.push("The change you started already have far-reaching effects. Be ready.");
quotes.push("The change you started already have far-reaching effects. Be ready.");
quotes.push("The first man gets the oyster, the second man gets the shell.");
quotes.push("The harder you work, the luckier you get.");
quotes.push("The night life is for you.");
quotes.push("The one that recognizes the illusion does not act as if it is real.");
quotes.push("The only people who never fail are those who never try.");
quotes.push("The person who will not stand for something will fall for anything.");
quotes.push("The philosophy of one century is the common sense of the next.");
quotes.push("The saints are the sinners who keep on trying.");
quotes.push("The secret to good friends is no secret to you.");
quotes.push("The small courtesies sweeten life, the greater ennoble it.");
quotes.push("The smart thing to do is to begin trusting your intuitions.");
quotes.push("The strong person understands how to withstand substantial loss.");
quotes.push("The sure way to predict the future is to invent it.");
quotes.push("The truly generous share, even with the undeserving.");
quotes.push("The value lies not within any particular thing, but in the desire placed on that thing.");
quotes.push("The weather is wonderful.");
quotes.push("There is no mistake so great as that of being always right.");
quotes.push("There is no wisdom greater than kindness.");
quotes.push("There is not greater pleasure than seeing your lived (sic) ones prosper.");
quotes.push("There’s no such thing as an ordinary cat.");
quotes.push("Things don’t just happen; they happen just.");
quotes.push("Those who care will make the effort.");
quotes.push("Time and patience are called for many surprises await you!.");
quotes.push("Time is precious, but truth is more precious than time");
quotes.push("To know oneself, one should assert oneself.");
quotes.push("To the world you may be one person, but to one person you may be the world.");
quotes.push("Today is the conserve yourself, as things just won’t budge.");
quotes.push("Today, your mouth might be moving but no one is listening.");
quotes.push("Tonight you will be blinded by passion.");
quotes.push("Use your eloquence where it will do the most good.");
quotes.push("Welcome change.");
quotes.push("“Welcome” is a powerful word.");
quotes.push("Well done is better than well said.");
quotes.push("What’s hidden in an empty box?");
quotes.push("What’s yours in mine, and what’s mine is mine.");
quotes.push("When more become too much. It’s same as being not enough.");
quotes.push("When your heart is pure, your mind is clear.");
quotes.push("Wish you happiness.");
quotes.push("You always bring others happiness.");
quotes.push("You are a person of another time.");
quotes.push("You are a talented storyteller.");
quotes.push("You are admired by everyone for your talent and ability.");
quotes.push("You are almost there.");
quotes.push("You are busy, but you are happy.");
quotes.push("You are generous to an extreme and always think of the other fellow.");
quotes.push("You are going to have some new clothes.");
quotes.push("You are in good hands this evening.");
quotes.push("You are modest and courteous.");
quotes.push("You are never selfish with your advice or your help.");
quotes.push("You are next in line for promotion in your firm.");
quotes.push("You are offered the dream of a lifetime. Say yes!");
quotes.push("You are open-minded and quick to make new friends.");
quotes.push("You are solid and dependable.");
quotes.push("You are soon going to change your present line of work.");
quotes.push("You are talented in many ways.");
quotes.push("You are the master of every situation.");
quotes.push("You are very expressive and positive in words, act and feeling.");
quotes.push("You are working hard.");
quotes.push("You begin to appreciate how important it is to share your personal beliefs.");
quotes.push("You can keep a secret.");
quotes.push("You can see a lot just by looking.");
quotes.push("You can’t steal second base and keep your foot on first.");
quotes.push("You desire recognition and you will find it.");
quotes.push("You have a deep appreciation of the arts and music.");
quotes.push("You have a deep interest in all that is artistic.");
quotes.push("You have a friendly heart and are well admired.");
quotes.push("You have a shrewd knack for spotting insincerity.");
quotes.push("You have a yearning for perfection.");
quotes.push("You have an active mind and a keen imagination.");
quotes.push("You have an ambitious nature and may make a name for yourself.");
quotes.push("You have an unusual equipment for success, use it properly.");
quotes.push("You have exceeded what was expected.");
quotes.push("You have the power to write your own fortune.");
quotes.push("You have yearning for perfection.");
quotes.push("You know where you are going and how to get there.");
quotes.push("You look pretty.");
quotes.push("You love challenge.");
quotes.push("You love chinese food.");
quotes.push("You make people realize that there exist other beauties in the world.");
quotes.push("You never hesitate to tackle the most difficult problems.");
quotes.push("You seek to shield those you love and like the role of provider.");
quotes.push("You should be able to make money and hold on to it.");
quotes.push("You should be able to undertake and complete anything.");
quotes.push("You should pay for this check. Be generous.");
quotes.push("You understand how to have fun with others and to enjoy your solitude.");
quotes.push("You will always be surrounded by true friends.");
quotes.push("You will always get what you want through your charm and personality.");
quotes.push("You will always have good luck in your personal affairs.");
quotes.push("You will be a great success both in the business world and society.");
quotes.push("You will be blessed with longevity.");
quotes.push("You will be pleasantly surprised tonight.");
quotes.push("You will be sharing great news with all the people you love.");
quotes.push("You will be successful in your work.");
quotes.push("You will be traveling and coming into a fortune.");
quotes.push("You will be unusually successful in business.");
quotes.push("You will become a great philanthropist in your later years.");
quotes.push("You will become more and more wealthy.");
quotes.push("You will enjoy good health.");
quotes.push("You will enjoy good health; you will be surrounded by luxury.");
quotes.push("You will find great contentment in the daily, routine activities.");
quotes.push("You will have a fine capacity for the enjoyment of life.");
quotes.push("You will have gold pieces by the bushel.");
quotes.push("You will inherit a large sum of money.");
quotes.push("You will make change for the better.");
quotes.push("You will soon be surrounded by good friends and laughter.");
quotes.push("You will take a chance in something in near future.");
quotes.push("You will travel far and wide, both pleasure and business.");
quotes.push("You will travel far and wide,both pleasure and business.");
quotes.push("Your abilities are unparalleled.");
quotes.push("Your ability is appreciated.");
quotes.push("Your ability to juggle many tasks will take you far.");
quotes.push("Your biggest virtue is your modesty.");
quotes.push("Your character can be described as natural and unrestrained.");
quotes.push("Your difficulties will strengthen you.");
quotes.push("Your dreams are never silly; depend on them to guide you.");
quotes.push("Your dreams are worth your best efforts to achieve them.");
quotes.push("Your energy returns and you get things done.");
quotes.push("Your family is young, gifted and attractive.");
quotes.push("Your first love has never forgotten you.");
quotes.push("Your happiness is before you, not behind you! Cherish it.");
quotes.push("Your hard work will payoff today.");
quotes.push("Your heart will always make itself known through your words.");
quotes.push("Your home is the center of great love.");
quotes.push("Your ideals are well within your reach.");
quotes.push("Your infinite capacity for patience will be rewarded sooner or later.");
quotes.push("Your leadership qualities will be tested and proven.");
quotes.push("Your life will be happy and peaceful.");
quotes.push("Your life will get more and more exciting.");
quotes.push("Your love life will be happy and harmonious.");
quotes.push("Your love of music will be an important part of your life.");
quotes.push("Your loyalty is a virtue, but not when it’s wedded with blind stubbornness.");
quotes.push("Your mentality is alert, practical, and analytical.");
quotes.push("Your mind is creative, original and alert.");
quotes.push("Your mind is your greatest asset.");
quotes.push("Your moods signal a period of change.");
quotes.push("Your quick wits will get you out of a tough situation.");
quotes.push("Your success will astonish everyone.");
quotes.push("Your talents will be recognized and suitably rewarded.");
quotes.push("Your work interests can capture the highest status or prestige.");


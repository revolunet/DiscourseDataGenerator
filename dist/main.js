#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var program = require("commander");
var async = require("async");
var _ = require("lodash");
var threadSleep = require('thread-sleep');
var discourse = require('discourse-sdk');
var targetUrl;
program
    .version("v" + require('../package.json').version)
    .description('A tool to auto generate data in discourse')
    .option('--username [value]', 'Api user name')
    .option('--apikey [value]', 'Api key')
    .option('--title [value]', 'title of a topic.', 'Topic from data generator')
    .option('--content [value]', 'content of a topic.', 'This message is autogenerated.')
    .option('--count [value]', 'how many time it runs.')
    .arguments('<targetSite>')
    .action(function (targetSite) {
    targetUrl = targetSite;
})
    .parse(process.argv);
if (!targetUrl || !program.username || !program.apikey) {
    console.log('Error: must specify target_site, api_username and api_key');
    program.help();
}
var count = 1;
if (program.count) {
    try {
        count = parseInt(program.count, 10);
    }
    catch (e) { }
}
var data = {
    api_key: program.apikey,
    api_username: program.username,
    title: program.title,
    raw: program.content
};
if (!(targetUrl.indexOf('http') === 0)) {
    targetUrl = "http://" + targetUrl;
}
var client = new discourse(targetUrl, program.apikey, program.username);
var title = program.title;
var array = _.range(count);
async.forEachLimit(array, 10, function (index) {
    fireRequest(client, data, title, index);
}, function (err) {
    console.log(err);
});
function sleep() {
    var sleepSeconds = 60;
    console.log("Sleep for " + sleepSeconds + " seconds.");
    threadSleep(sleepSeconds * 1000);
}
function fireRequest(client, data, title, count) {
    if (count > 1) {
        data.title = title + " " + count;
    }
    else {
        data.title = title;
    }
    try {
        client.createTopic(data.title, data.raw, 0, function (err, body, code) {
            if (err) {
                console.error(count + ": Upload failed: " + err);
            }
            try {
                body = JSON.parse(body);
                if (!body.errors) {
                    console.log(count + ": Upload successful!");
                }
                else {
                    console.error(count + ": Upload failed: " + body.errors);
                    if (body.errors[0] && body.errors[0].toString().indexOf('daily limit') >= 0) {
                        throw 'reach api limit';
                    }
                }
            }
            catch (e) {
                console.log("Error happen: " + e);
                console.log(body);
                sleep();
                fireRequest(client, data, title, count);
            }
        });
    }
    catch (e) {
        console.log("Error happen: " + e);
        sleep();
        fireRequest(client, data, title, count);
    }
}

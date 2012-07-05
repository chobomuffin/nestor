var _ = require('underscore'),
  bag = require('bagofholding'),
  jenkins = require('./jenkins');

var ANSI_CODES = {
  "off": 0,
  "red": 31,
  "green": 32,
  "yellow": 33,
  "blue": 34,
  "white": 37,
  "gray" : "1;37"
};

var JOB_STATUS_COLORS = {
  "OK": "green",
  "FAIL": "red",
  "DISABLED": "yellow"
}

/**
 * cli#exec
 * 
 * Execute nestor using JENKINS_URL environment variable.
 **/
function exec() {

  var url = process.env.JENKINS_URL;

  function _build() {
    return function (jobName, params) {
      new jenkins(url).build(
        jobName,
        (_.isString(params)) ? params : undefined,
        bag.cli.exitCb(null, function (result) {
          console.log('Job %s was started successfully', jobName);
        })
      );
    }; 
  }

  function _colorize(text, color) {
    return "\033[" + ANSI_CODES[color] + "m" + text + "\033[0m";
  }

  function _colorizeJobStatus(jobStatus) {
    var colorForJob = JOB_STATUS_COLORS[jobStatus];
    if (colorForJob) {
      return _colorize(jobStatus, colorForJob);
    } else {
      return jobStatus;
    }
  }

  function _dashboard() {
    return function () {
      new jenkins(url).dashboard(bag.cli.exitCb(null, function (result) {
        if (result.length === 0) {
          console.log('Jobless Jenkins');
        } else {
          result.forEach(function (job) {
            console.log('%s - %s', _colorizeJobStatus(job.status), job.name);
          });
        }
      }));
    }; 
  }

  function _discover() {
    return function (host) {
      new jenkins(url).discover(host, bag.cli.exitCb(null, function (result) {
        console.log('Jenkins ver. %s is running on %s', result.version, result.url);
      }));
    };
  }

  function _executor() {
    return function () {
      new jenkins(url).executor(bag.cli.exitCb(null, function (result) {
        if (!_.isEmpty(_.keys(result))) {
          _.keys(result).forEach(function (computer) {
            console.log('+ ' + computer);
            result[computer].forEach(function (executor) {
              if (executor.idle) {
                console.log('  - idle');
              } else {
                console.log('  - %s | %s%%s', executor.name, executor.progress, (executor.stuck) ? ' stuck!' : '');
              }
            });
          });
        } else {
          console.log('No executor found');
        }
      }));
    };
  }

  function _job() {
    return function (name) {
      new jenkins(url).job(name, bag.cli.exitCb(null, function (result) {
        console.log('%s | %s', name, result.status);
        result.reports.forEach(function (report) {
          console.log(' - %s', report);
        });
      }));
    };
  }

  function _queue() {
    return function () {
      new jenkins(url).queue(bag.cli.exitCb(null, function (result) {
        if (result.length === 0) {
          console.log('Queue is empty');
        } else {
          result.forEach(function (job) {
            console.log('- %s', job);
          });
        }
      }));
    }; 
  }

  function _version() {
    return function () {
      new jenkins(url).version(bag.cli.exitCb(null, function (result) {
        console.log('Jenkins ver. %s', result);
      }));
    };
  }
  
  var commands = {
    build: {
      desc: 'Trigger a build with optional parameters\n\tnestor build <jobname> ["param1=value1&param2=value2"]',
      action: _build()
    },
    dashboard: {
      desc: 'View status of all jobs\n\tnestor dashboard',
      action: _dashboard()
    },
    discover: {
      desc: 'Discover Jenkins instance running on a specified host\n\tnestor discover <hostname>',
      action: _discover()
    },
    executor: {
      desc: 'View executors\' status (running builds)\n\tnestor executor',
      action: _executor()
    },
    job: {
      desc: 'View job status reports\n\tnestor job <jobname>',
      action: _job()
    },
    queue: {
      desc: 'View queued jobs\n\tnestor queue',
      action: _queue()
    },
    ver: {
      desc: 'View Jenkins version number\n\tnestor ver',
      action: _version()
    }
  };

  bag.cli.parse(commands, __dirname);
}

exports.exec = exec;

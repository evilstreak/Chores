const SQLite3 = require( 'sqlite3' ).SQLite3;

var juice = require('juice');
var app = new juice.Application;

var DOC_ROOT = module.uri.replace(/^.*?:\/\/(.*?)lib\/chores\.js$/, "$1") || "./";
print(DOC_ROOT);

app.db_file = function(env) {
  return env.juice.docRoot + '/db/chores.sqlite3';
}

app.controllers.chores = {
  index : function ( env ) {
    var db = new SQLite3( app.db_file(env) );
    var c = db.cursor( 'SELECT id, label, frequency, due FROM task ORDER BY due, id' );

    var today = new Date();
    today = new Date( today.getFullYear(), today.getMonth(), today.getDate() );
    var lists = [
      {
        label : "Today",
        "class" : "today",
        deadline : today,
        tasks : []
      },
      {
        label : "Next Couple of Days",
        "class" : "tomorrow",
        deadline : new Date( today.getFullYear(), today.getMonth(), today.getDate() + 2 ),
        tasks : []
      },
      {
        label : "Within a Week",
        "class" : "week",
        deadline : new Date( today.getFullYear(), today.getMonth(), today.getDate() + 7 ),
        tasks : []
      },
      {
        label : "Everything Else",
        "class" : "after",
        tasks : []
      }
    ];

    for ( let row in c ) {
      var t = {
        id : row[ 0 ],
        label : row[ 1 ],
        frequency : row[ 2 ],
        due : row[ 3 ]
      };

      var bucket;
      for ( var i in lists ) {
        if ( !lists[ i ].deadline || new Date( t.due ) <= lists[ i ].deadline ) {
          bucket = lists[ i ];
          break;
        }
      }

      bucket.tasks.push( t );
    }

    return {
      chores : lists
    };
  },

  done : function ( env, task_id ) {
    var db = new SQLite3( app.db_file(env) );
    var c = db.cursor( "UPDATE task SET due = STRFTIME('%Y/%m/%d', 'now', 'localtime', frequency || ' days') WHERE id = ?" );
    c.bind( [ task_id ] );
    c.next();

    var c = db.cursor( 'SELECT id, label, frequency, due FROM task WHERE id = ?' );
    c.bind( [ task_id ] );

    var task;
    for ( let row in c ) {
      task = {
        id : row[ 0 ],
        label : row[ 1 ],
        frequency : row[ 2 ],
        due : row[ 3 ]
      };
    }

    return task;
  },

  new : function ( env ) {
    var spec = { fields : {
      label : {
        label : "Label",
        validation : [ "trim", "notEmpty" ]
      },
      frequency : {
        label : "Frequency",
        validation : [ "notEmpty", "integer", "positive" ],
        message : "{label} must be a whole number greater than zero"
      }
    } };

    if ( env.requestMethod != "POST" )
      return { form : spec };

    spec = this.validate( spec.fields, env.juice.params.post );

    if ( ! spec.valid )
      return { form : spec };

    var db = new SQLite3( app.db_file(env) );
    var c = db.cursor( "INSERT INTO task ( label, frequency, due ) VALUES ( ?1, ?2, STRFTIME('%Y/%m/%d', 'now', 'localtime', ?2 || ' days') )" );
    c.bind( [ spec.fields.label.value, spec.fields.frequency.value ] );
    c.next();

    this.redirectTo = "/";

    // TODO grab the newly created task and return it
    return {};
  }
}

app.helpers.days_away = function( due ) { return Math.ceil( ( new Date( due ) - new Date() ) / 86400000 ); };
app.helpers.floor = function( x ) { return Math.floor( x ); };
app.helpers.due_in = function( due ) {
  var days = app.helpers.days_away( due );
  if ( days < 0 )
    return days == -1 ? "yesterday" : ( days * -1 ) + " days ago";
  else if ( days == 0 )
    return "today";
  else {
    if ( days >= 30 )
      return days < 60 ? "in a month" : "in " + app.helpers.floor( days / 30 ) + " months";
    else if ( days >= 14 )
      return "in " + app.helpers.floor( days / 7 ) + " weeks";
    else
      return days == 1 ? "tomorrow" : "in " + days + " days";
  }
};
app.helpers.human_time = function( frequency ) {
  if ( frequency % 7 == 0 )
    return frequency == 7 ? "week" : ( frequency / 7 ) + " weeks";
  else if ( frequency % 30 == 0 )
    return frequency == 30 ? "month" : ( frequency / 30 ) + " months";
  else
    return frequency == 1 ? "day" : frequency + " days";
}

app.controllers.test_x = function() {
  return {
    status: 200,
    headers: {
      'x-sendfile': DOC_ROOT + "static" + this.env.pathInfo
    },
    body: ['']
  }
}

app.actions = {
  "/?" : { action : "chores.index", render : "chores/index.tt" },
  "/(\\d+)/done" : { action : app.controllers.chores.done, redirect : "/" },
  "/new" : { action : "chores.new", render : "chores/new.tt" },
  "/(?:styles|scripts)/.*?": {action: "test_x", raw: true }
};

exports.app = app.setup( DOC_ROOT );


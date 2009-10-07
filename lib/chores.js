const SQLite3 = require( 'sqlite3' ).SQLite3;

var juice = require('juice');
var app = new juice.Application;

var DOC_ROOT = module.uri.replace(/^.*?:\/\/(.*?)lib\/chores\.js$/, "$1") || "./";

app.db_file = function() {
  return DOC_ROOT + '/db/chores.sqlite3';
}

app.models.chores = {
  _db: new SQLite3( app.db_file() ),
	one : function( id ) {
		return this._db.query( "SELECT id, label, frequency, due FROM task WHERE id = ?", [ id ] ).next( true );
	},
	all : function() {
		var cursor = this._db.query( "SELECT id, label, frequency, due FROM task ORDER BY due, id" );
    var all = [];
    while ( ( row = cursor.next( true ) ) )
      all.push( row );
    return all;
	},
	create : function( data ) {
		this._db.exec( "INSERT INTO task ( label, frequency, due ) VALUES ( :label, :frequency, STRFTIME('%Y/%m/%d', 'now', 'localtime', :frequency || ' days') )", data );
	},
  done : function( id ) {
    this._db.exec( "UPDATE task SET due = STRFTIME('%Y/%m/%d', 'now', 'localtime', frequency || ' days') WHERE id = ?", [ id ] );
    return app.models.chores.one( id );
  },
	update : function( data ) {
		this._db.exec( "UPDATE task SET label = :label, frequency = :frequency, due = :due WHERE id = :id", data );
	},
	delete : function( id ) {
		this._db.exec( "DELETE FROM task WHERE id = ?", [ id ] );
	}
}

app.controllers.chores = {
  index : function ( env ) {
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
        label : "By Friday",
        "class" : "tomorrow",
        deadline : new Date( today.getFullYear(), today.getMonth(), today.getDate() + 7 - ( today.getDay() + 2 ) % 7 ),
        tasks : []
      },
      {
        label : "By a Week on Friday",
        "class" : "week",
        deadline : new Date( today.getFullYear(), today.getMonth(), today.getDate() + 14 - ( today.getDay() + 2 ) % 7 ),
        tasks : []
      },
      {
        label : "Everything Else",
        "class" : "after",
        tasks : []
      }
    ];

    var tasks = this.models.chores.all();
    for ( var i in tasks ) {
      var bucket, t = tasks[ i ];

      for ( var j in lists ) {
        if ( !lists[ j ].deadline || new Date( t.due ) <= lists[ j ].deadline ) {
          bucket = lists[ j ];
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
    return this.models.chores.done( task_id );
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

    var task = {
      label : spec.fields.label.value,
      frequency : spec.fields.frequency.value
    };

    this.models.chores.create( task );

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
  "/?" : "chores.index",
  "/(\\d+)/done" : { action : app.controllers.chores.done, redirect : "/" },
  "/new" : "chores.new",
  "/(?:styles|scripts)/.*?": { action: "test_x", raw: true }
};

exports.app = app.setup( DOC_ROOT );


jQuery.fn.oldText = jQuery.fn.text;
jQuery.fn.text = function( text ) {
  if ( typeof text == "function" )
    text = text.apply( this, [ $( this ).oldText() ] );
  return $( this ).oldText( text );
}

$( function() {
  var getSection = function( due ) {
    var difference = ( due - new Date() ) / 86400000; // convert milliseconds to days
    if ( difference > 0 && difference <= 2 ) {
      return { label : "Next Couple of Days", "class" : "tomorrow" };
    } else if ( difference > 2 && difference <= 7 ) {
      return { label : "Within a Week", "class" : "week" };
    } else if ( difference > 7 ) {
      return { label : "Everything Else", "class" : "after" };
    }

    // if we got here we got given a duff due date
    throw "Due date should be tomorrow or later";
  };

  var markAsDone = function( e ) {
    e.preventDefault();
    if ( $( this ).hasClass( 'loading' ) ) return;
    var self = $( this ).parent();

    var updateChore = function( json ) {
      var due = new Date( json.due );
      var section = getSection( due );
      var dl = $( 'dl.' + section[ "class" ] );
      if ( !dl.length ) {
        var dt = $( '<dt>' ).text( section.label );
        dl = $( '<dl>' ).addClass( section[ "class" ] ).append( dt ).hide();
        var p, s = [ 'today', 'tomorrow', 'week', 'after' ];
        for ( p in s ) if ( s[ p ] == section[ "class" ] ) { ++p; break; }
        while ( p < s.length ) {
          var after = $( 'dl.' + s[ p ] );
          if ( after.length ) {
            dl.insertBefore( after )
            break;
          }
          ++p;
        }
        if ( p >= s.length ) dl.appendTo( 'body' );
      }
      var dd;
      $( 'dd', dl ).each( function() {
        if ( !dd && new Date( this.title ) > due ) dd = this;
      } );
      $( self ).slideUp( function() {
        $( self ).prevAll( 'dt' ).text(
          $( self ).prevAll( 'dt' ).text().replace( /\d+/, function( n ) { return --n; } )
        );
        $( 'dt', dl ).text(
          $( 'dt', dl ).text().replace( /\d+/, function( n ) { return ++n; } )
        );
        dd ?
          $( self ).insertBefore( dd ):
          $( self ).appendTo( dl );
        $( self )
          .attr( 'title', json.due )
          .removeClass( 'overdue' )
          .removeClass( 'loading' )
          .addClass( 'done' )
          .find( 'small' ).text( "Due in " + json.frequency + " days — every " + json.frequency + " days" );
        if ( $( self ).parent().is( ':hidden' ) ) {
          $( self ).show();
          $( 'dl:hidden' ).slideDown();
        } else {
          $( self ).slideDown();
        }
        $( 'dl:not(:has(dd))' ).slideUp( function() {
          if ( $( 'dd', this ).length )
            $( this ).slideDown();
          else
            $( this ).remove();
        } );
      } );
    };

    $( self ).addClass( 'loading' );
    $.getJSON( this.href + '.json', updateChore );
  };

  $( '#lists a' ).click( markAsDone );
} );

( function( $ ) {
  $.fn.moveTo = function( target, between ) {
    this.each( function() {
      // the parent dl
      var p = $( this ).parent();

      // do nothing if the element is already a child of the target
      if ( p.is( target ) ) return;

      // do the hide animation on the item
      $( this ).slideUp( function() {
        if ( typeof between == "function" ) between.apply( this );
        $( this ).appendTo( target ).slideDown();
      } );
    } );
    return this;
  }
} )( jQuery );

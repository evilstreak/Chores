Chores
======

Chores is a webapp for keeping track of routine tasks such as housework or
office admin.

It's built on [Juice][] and is currently being used as an example app to help
drive development in a useful direction.

How to use it
-------------

Until Juice supports sessions and this becomes a multi-user app you'll have to
run your own copy to see it in action.

1. Get [Juice][] up and running
2. Checkout a copy of Chores
3. Create the database: `sqlite3 -init db/scripts/init.sql db/chores.sqlite3`
4. Start the server: `./script/server`

[Juice]: http://www.juiceframework.org/

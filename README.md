[![CodeFactor](https://www.codefactor.io/repository/github/liturgical-calendar/examples/badge)](https://www.codefactor.io/repository/github/liturgical-calendar/examples)

# Collection of examples for usage of the Liturgical Calendar API
A few examples of how to render a calendar, create an App, or create a widget, using the data from the Liturgical Calendar API and using different programming languages and web frameworks.
These examples all require a local instance of the Liturgical Calendar API to be running, for example on port 8000.
This can be easily achieved using docker via the [Dockerfile](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI/blob/development/Dockerfile) provided by the Liturgical Calendar API repository:
```console
docker build -t liturgy-api https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI.git#development
docker run -p 8000:8000 -d liturgy-api
```

You may change to a different port if you prefer, for example `-p 9000:8000` (the port on the right hand side is the port inside the docker container and must be set to 8000).

If you have PHP >= 8.1 installed, you can git clone the [Liturgical Calendar API repo](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI.git)
and launch a local instance of the API from the repo folder with `PHP_CLI_SERVER_WORKERS=2 php -S localhost:8000`.

If you use VSCode, you can type <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>b</kbd> and select the `php-server` "build" task to launch the API.

## [Fullcalendar](https://litcal.johnromanodorazio.com/examples/fullcalendar)
A [Fullcalendar](https://github.com/fullcalendar/fullcalendar) rendering of Liturgical events from the Liturgical Calendar API.
This example uses the ES module published at `https://cdn.jsdelivr.net/npm/@liturgical-calendar/components-js@latest/+esm`,
which takes care of building the Calendar select and the API request options form controls,
and making the fetch requests to the Liturgical Calendar API. The data fetched from the API is transformed for use with Fullcalendar.

This example also implements bootstrap for some basic CSS styling.

No need for `node` or `yarn` or `pnp`! All javascript is imported as ES modules right in the browser.

To use your local instance of the API, set the API url in `fullcalendar/examples/script.js` by passing it as a parameter to `ApiClient.init('http://localhost:8000')`,
then open `fullcalendar/examples/month-view.html` in your browser.
If you are using VSCode, the easiest way to do this is to install the recommended `ms-vscode.live-server` (Live Preview by Microsoft),
then select `fullcalendar/examples/month-view.html` and launch the Live Preview task (<kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>P</kbd>,
then type "Live Preview" and choose "Live Preview: Show Preview (External Browser)").

## [Javascript](https://litcal.johnromanodorazio.com/examples/javascript)
A simple rendering of a calendar with Liturgical events from the Liturgical Calendar API.
This example uses the ES module published at `https://cdn.jsdelivr.net/npm/@liturgical-calendar/components-js@latest/+esm`,
which takes care of building the Calendar select, the API request options form controls, and the web calendar,
and making the fetch requests to the Liturgical Calendar API.
This example also implements Bootstrap for some basic CSS styling.

To use your local instance of the API, set the API url in `javascript/main.js` by passing it as a parameter to `ApiClient.init('http://localhost:8000')`,
then open `javascript/index.html` in your browser.
If you are using VSCode, the easiest way to do this is to install the recommended `ms-vscode.live-server` (Live Preview by Microsoft),
then select `javascript/index.html` and launch the Live Preview task (<kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>P</kbd>,
then type "Live Preview" and choose "Live Preview: Show Preview (External Browser)").

## [PHP](https://litcal.johnromanodorazio.com/examples/php)
A simple rendering of a calendar with Liturgical events from the Liturgical Calendar API, using PHP to make a cURL request to the Liturgical Calendar API.
This example makes use of the composer package `liturgical-calendar/components`, which takes care of building the Calendar select,
the API request options form controls, and the web calendar.

In order to view the example, first run `composer install` in the `example/php` folder.
Then ensure you have copied the `.env.example` file to `.env` or `.env.development` or `.env.local`,
with `APP_ENV` set to `development` and `API_PORT` set to the port that your local instance of the Liturgical Calendar API is running on.

Then you can run `php -S localhost:3000 .` from the `example/php` folder (you can change port 3000 to any port you prefer to use),
and finally navigate to `localhost:3000` in your browser.

If you are using VSCode, you can type <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>b</kbd> and select the `php-server` "build" task to launch the example in your browser.

# Adding examples
Would you like to contribute an example to this repository? Feel free to do so! We would be pleased to showcase yet another way of using / rendering data from the Liturgical Calendar API. Feel free to fork this repo, hack away, and open a Pull Request.

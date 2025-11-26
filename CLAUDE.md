# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains example implementations demonstrating how to use the Liturgical Calendar API with different technologies.
All examples require a running instance of the Liturgical Calendar API (typically on localhost:8000).

## Example Implementations

### JavaScript (`javascript/`)

Pure ES6 module example using the `@liturgical-calendar/components-js` library via CDN. Renders a liturgical calendar as an HTML table with Bootstrap styling.

**Running:**

1. Set API URL in `main.js`: `ApiClient.init('http://localhost:8000')`
2. Open `index.html` in browser via Live Server or any HTTP server

**Key Files:**

- `main.js` - Main application using CalendarSelect, ApiOptions, WebCalendar components
- `index.html` - Bootstrap 5 layout with multiselect plugin

### PHP (`php/`)

Server-side example using the `liturgical-calendar/components` Composer package. Demonstrates PSR-compliant HTTP client setup with caching, logging, and retry logic.

**Running:**

```bash
cd php
composer install
cp .env.example .env
# Edit .env to configure API_HOST, API_PORT, etc.
php -S localhost:3000 .
```

**VSCode:** Press `Ctrl+Shift+B` and select `php-server` task.

**Environment Variables (`.env`):**

- `API_PROTOCOL` - http or https (default: http)
- `API_HOST` - API hostname (default: localhost)
- `API_PORT` - API port (default: 8000)
- `API_BASE_PATH` - API path prefix (default: /api/dev)
- `DEBUG_MODE` - Enable verbose logging (default: false)

**Testing:**

```bash
composer test
```

### Fullcalendar (`fullcalendar/`)

Fullcalendar integration displaying liturgical events in month/list views. Uses ES modules via import maps.

**Running:**

1. Set API URL in `script.js`: `ApiClient.init('http://localhost:8000')`
2. Open `month-view.html` via Live Server or HTTP server

**Key Files:**

- `script.js` - Transforms API data to Fullcalendar events format
- `LitGrade.js` - Liturgical grade styling utilities
- `la.js` - Latin locale for Fullcalendar

## API Dependency

All examples require the Liturgical Calendar API running locally:

**Docker:**

```bash
docker build -t liturgy-api https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI.git#development
docker run -p 8000:8000 -d liturgy-api
```

**PHP built-in server:**

```bash
cd /path/to/LiturgicalCalendarAPI
PHP_CLI_SERVER_WORKERS=2 php -S localhost:8000
```

## Architecture Pattern

All examples follow a similar pattern using the `liturgy-components-js` or `liturgy-components-php` libraries:

1. **ApiClient** - Initializes connection to the API and handles requests
2. **CalendarSelect** - Dropdown for selecting national/diocesan calendars
3. **ApiOptions** - Form controls for API request parameters (year, locale, mobile feasts)
4. **WebCalendar** - Renders the liturgical calendar table (JS/PHP examples)

**Component Chaining:** Configuration methods return `this` for fluent interface. In JavaScript, `appendTo()` is a void method and must be called separately.

```javascript
// JavaScript pattern
const select = new CalendarSelect('en-US')
    .class('form-select')
    .allowNull();
select.appendTo('#container');  // NOT chainable
```

```php
// PHP pattern
$select = new CalendarSelect(['locale' => 'en'])
    ->class('form-select')
    ->allowNull();
echo $select;
```

## Code Standards

**PHP:**

- PSR-12 with line length excluded
- Run linting: `vendor/bin/phpcs` (uses `phpcs.xml` config)
- Auto-fix: `vendor/bin/phpcbf`

**JavaScript:**

- ES6 modules
- No build step required for browser usage (CDN imports)

**Markdown:**

All markdown files must conform to rules in `.markdownlint.yaml`:

- **Line length (MD013):** Maximum 180 characters; code blocks and tables excluded
- **Duplicate headings (MD024):** Allowed if in different sections (siblings_only)
- **Multiple top-level headings (MD025):** Allowed
- **Ordered lists (MD029):** Use sequential numbering (1, 2, 3...) or all 1's
- **Emphasis as heading (MD036):** Allowed (rule disabled)
- **Inline HTML (MD033):** Allowed for: img, a, table, thead, tbody, tr, th, td, li, ul, ol, kbd, style
- **First line heading (MD041):** Not required (rule disabled)
- **Code blocks (MD046):** Use fenced style (```) not indented
- **Table alignment (MD060):** Columns must be vertically aligned

**Linting:**

```bash
npx --yes markdownlint-cli "**/*.md"
npx --yes markdownlint-cli --fix "**/*.md"
```

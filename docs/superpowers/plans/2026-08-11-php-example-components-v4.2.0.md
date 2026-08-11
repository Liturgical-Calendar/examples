# PHP example: components v4.2.0 rite awareness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Move `php/` from `liturgical-calendar/components` v3.3.1 to v4.x, add a rite select that drives the
calendar list and the request path, and fix the two locale defects the library fixed in v4.1.0.

**Architecture:** `php/index.php` is a single ~34 KB script: a logic section that handles `$_POST` and builds
component objects, then a markup section that echoes them. Every change below stays inside that shape — new
state is computed in the logic section, new output is echoed in the markup section. The rite is read from
`$_POST` before any component is constructed, because `CalendarSelect` partitions its dioceses by rite at
construction time.

**Tech Stack:** PHP 8.1+, `liturgical-calendar/components`, Bootstrap 5, gettext, Composer.

## Global Constraints

- Code standard is PSR-12 with line length not enforced; `vendor/bin/phpcs` (config `php/phpcs.xml`) must pass
  after every task.
- Never use `git commit --no-verify`. If a hook fails, fix the cause and commit again.
- Single quotes for PHP strings unless interpolation or escapes require double quotes.
- Short array syntax `[]`.
- Markdown must pass `npx --yes markdownlint-cli` (config `.markdownlint.yaml`, 180-char lines).
- Branch: `feat/php-example-components-4.2.0`. Commit after every task.
- Spec: `docs/superpowers/specs/2026-08-11-php-example-components-v4.2.0-design.md`.

### Dependency status — read before starting

`liturgical-calendar/components` **v4.2.0 is released and on Packagist**, so nothing in this plan is blocked
and the example bumps straight from `^3.3` to `^4.2` in Task 1.

Everything the plan uses is in it: `Rite`, `RiteSelect`, `CalendarRequest::rite()`, `LocaleResolver`,
`ScopedLocale` and `Rite::minYear()` from v4.1.0; `Year::rite()`, `Rite::resolve()` and — decisively for the
shape of this plan — an `ApiOptions` that accepts `'rite'` in its constructor options, from v4.2.0.

That last one is why there is no separate task for the year floor. `ApiOptions` resolves the rite in its
options loop and calls `$this->yearInput->rite($rite)` itself (`ApiOptions.php:204` at v4.2.0), so the example
gets the Ambrosian floor from the one `$options` array it already passes to every component. Task 4 adds
`'rite'` to that array and verifies the floor as part of the same change.

### Why there are no unit tests in this plan

`php/composer.json` declares `"test": "phpunit tests"` but no `php/tests/` directory exists, and creating one
is out of scope per the spec. In its place, every task below has a mechanical pass/fail check: the example is
served over HTTP and the response asserted with `curl` and `grep`. Write the check, watch it fail, implement,
watch it pass — the TDD cycle, with `grep` as the assertion.

### Verification harness — already running, read before Task 1

**`localhost:3000` is the LiturgicalCalendarFrontend docker stack, not this example.** Do not point any check
at it: it serves the Frontend's own pages, and `examples.php?example=PHP` renders no calendar selects at all.
Nothing there reflects edits to `php/index.php`.

The two endpoints this plan uses:

| Endpoint                | What it is                       | State                            |
| ----------------------- | -------------------------------- | -------------------------------- |
| `http://localhost:8000` | Liturgical Calendar API (docker) | Already running                  |
| `http://localhost:3010` | This example, `php -S`           | Already started for this session |

- [ ] **Confirm both answer:**

```bash
curl -s -o /dev/null -w 'api:     %{http_code}\n' 'http://localhost:8000/calendars'
curl -s -o /dev/null -w 'example: %{http_code}\n' 'http://localhost:3010/index.php'
```

Expected: `200` for both.

If the example is not up, start it again — note the explicit `-t`, because passing `.` makes PHP treat it as a
*router script* and every request dies with `Failed opening required '.'`:

```bash
php -S localhost:3010 -t /home/johnrdorazio/development/LiturgicalCalendar/examples/php
```

`php/.env` is already written and is gitignored. It must set an **empty** `API_BASE_PATH` — the dockerised API
serves from the root, and `/api/dev/calendars` returns 404, so copying `.env.example` verbatim breaks every
request:

```ini
APP_ENV=development
API_PROTOCOL=http
API_HOST=localhost
API_PORT=8000
API_BASE_PATH=
DEBUG_MODE=false
```

Throughout the plan, these two shorthands are used:

```bash
# GET the page (no POST — first-load state)
GET() { curl -s 'http://localhost:3010/index.php'; }

# POST to the page, e.g.  POST 'rite=ambrosian&year=2026'
POST() { curl -s -X POST -d "$1" 'http://localhost:3010/index.php'; }
```

Paste those two function definitions into your shell before starting.

---

## File Structure

| File                     | Responsibility                        | Tasks that touch it |
| ------------------------ | ------------------------------------- | ------------------- |
| `php/composer.json`      | Dependency constraint                 | 1                   |
| `php/composer.lock`      | Resolved versions                     | 1                   |
| `php/index.php`          | Logic section and markup section      | 2-7                 |
| `php/script.js`          | Client-side form behaviour            | 8                   |
| `README.md`              | Example documentation                 | 8                   |

`index.php` is large and does several jobs, but the spec rules out restructuring it: these changes stay within
the sections they touch.

---

### Task 1: Bump to ^4.2 and absorb the v4.0.0 output changes

**The example is currently broken against the live API.** `CalendarSelect` v3.3.1 fatals with
`TypeError: hasNationalCalendarWithDioceses(): Argument #1 ($item) must be of type NationalCalendar, null
given` — its nation pass assumes every diocese's nation owns a national calendar, which holds only in the
Roman rite, and `lugano_ch` sits in nation `CH`, which owns none. The page renders its shell and then dies
before any select. v4.0.0 fixed exactly this.

So the bump's headline effect is that the form renders at all. Of v4.0.0's three output changes, one is
invisible here (nothing reads `data-calendartype`), and two show up once the page works: the Ambrosian sees
are absent from the Roman diocese list (Task 4 makes them reachable again) and the `allowNull` option is
named.

**Files:**

- Modify: `php/composer.json:6`
- Modify: `php/composer.lock`

**Interfaces:**

- Consumes: nothing.
- Produces: `LiturgicalCalendar\Components\Rite`, `…\RiteSelect`, `…\Locale\LocaleResolver`,
  `…\Locale\ScopedLocale`, `CalendarRequest::rite()`, `Rite::minYear()`, `Rite::hasNationalTier()`,
  `Rite::hasFixedTemporalOptions()`, `Rite::resolve()`, `Year::rite()`, and an `ApiOptions` constructor that
  accepts `'rite'` — all available to every later task.

- [ ] **Step 1: Write the failing check**

The page must stop fatalling and start rendering selects:

```bash
GET | grep -c 'Fatal error'
GET | grep -c '<select'
```

Expected **now**: `1` and `0` — the TypeError above, and not a single select on the page.

- [ ] **Step 2: Bump the constraint**

In `php/composer.json`, change line 6 from:

```json
        "liturgical-calendar/components": "^3.3",
```

to:

```json
        "liturgical-calendar/components": "^4.2",
```

- [ ] **Step 3: Update the dependency**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples/php
composer update liturgical-calendar/components
```

- [ ] **Step 4: Confirm the resolved version**

```bash
composer show liturgical-calendar/components | grep '^versions'
```

Expected: a `v4.2.x` version, not `v3.3.1`.

- [ ] **Step 5: Run the check again**

```bash
GET | grep -c 'Fatal error'
GET | grep -c '<select'
GET | grep -c 'name="diocesan_calendar"'
GET | grep -c 'milano_it'
```

Expected: `0`, then non-zero, then non-zero, then `0` — no crash, selects present, and the Ambrosian sees
absent from the Roman diocese list.

- [ ] **Step 6: Confirm the named empty option and a working page**

```bash
GET | grep -o 'General Roman Calendar' | head -1
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3010/index.php'
```

Expected: `General Roman Calendar` printed, and `200`.

- [ ] **Step 7: Confirm a calendar still generates**

```bash
POST 'year=2026' | grep -c 'LitCalTable'
```

Expected: non-zero.

- [ ] **Step 8: Lint**

```bash
vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/composer.json php/composer.lock
git commit -m "Take liturgy-components-php v4.2

This example had stopped rendering. CalendarSelect v3.3.1 assumed every
diocese's nation owns a national calendar, which is true only in the Roman
rite; lugano_ch sits in CH, which owns none, so building the select against
live metadata died with a TypeError before a single option was emitted.
v4.0.0 fixed it.

With the page working again, two of that release's output changes become
visible. The Ambrosian sees leave the Roman diocese list, which is a
correction --
they never belonged in it -- and the allowNull option is now named for the
calendar it selects rather than reading '---'. Nothing here reads
data-calendartype, so v4.0.0's third output change does not land.

The sees become reachable again once a rite select exists."
```

---

### Task 2: Resolve the region through CLDR and pin LANGUAGE

`index.php:232` guesses a region by uppercasing the language, which turns `en` into `en_EN` — a locale that
exists on no system, so `setlocale()` fails and every component silently renders in whatever locale the process
already holds. This is the same defect v4.1.0 fixed inside the library.

**Files:**

- Modify: `php/index.php` — add two `use` statements after line 33; replace lines 228-234 and lines 243-252.

**Interfaces:**

- Consumes: `LocaleResolver`, `ScopedLocale` from Task 1.
- Produces: `$fullLocale` (unchanged name), now a real locale for bare-language input.

- [ ] **Step 1: Write the failing check**

Ask for bare `en` and confirm the example builds `en_EN`. Add a temporary probe as the last line of
`php/index.php`:

```php
// TEMPORARY PROBE — removed in Step 6
file_put_contents('/tmp/locale-probe.txt', $fullLocale . "\n");
```

Then:

```bash
curl -s -H 'Accept-Language: en' 'http://localhost:3010/index.php' > /dev/null
cat /tmp/locale-probe.txt
```

Expected **now**: the probe file is *not written at all*, and the response body carries
`Uncaught Exception: Invalid locale: en_EN`. `CalendarSelect::locale()` refuses the locale rather than
falling back, so the page dies before reaching the probe. That is this defect in its strongest form: any
client sending a bare-language `Accept-Language` takes the page down.

- [ ] **Step 2: Add the imports**

In `php/index.php`, after line 33 (`use LiturgicalCalendar\Components\Cache\ArrayCache;`), add:

```php
use LiturgicalCalendar\Components\Locale\LocaleResolver;
use LiturgicalCalendar\Components\Locale\ScopedLocale;
```

- [ ] **Step 3: Replace the region guess**

Replace lines 228-234, which currently read:

```php
$detectedLocale = \Locale::canonicalize($detectedLocale);
$baseLocale     = \Locale::getPrimaryLanguage($detectedLocale);
$region         = \Locale::getRegion($detectedLocale);
if (null === $region || empty($region)) {
    $region = strtoupper($baseLocale); // make an attempt at a possible region code
}
$fullLocale = $baseLocale . '_' . $region;
```

with:

```php
$detectedLocale = \Locale::canonicalize($detectedLocale);
$baseLocale     = \Locale::getPrimaryLanguage($detectedLocale);
$region         = \Locale::getRegion($detectedLocale);
if (null === $region || empty($region)) {
    // CLDR likely subtags: 'en' => 'US', 'pt' => 'BR'. Uppercasing the language
    // instead produced 'en_EN', which exists on no system, so setlocale() failed
    // and every component silently rendered in the process locale.
    $region = LocaleResolver::likelyRegion($baseLocale);
}
if (null === $region || empty($region)) {
    $region = strtoupper($baseLocale); // last resort for a language CLDR does not know
}
$fullLocale = $baseLocale . '_' . $region;
```

- [ ] **Step 4: Replace the setlocale ladder**

Replace lines 243-252 of the original file, which currently read:

```php
        // Set locale for gettext
        $localeArray = [
            $baseLocale . '_' . $region . '.utf8',
            $baseLocale . '_' . $region . '.UTF-8',
            $baseLocale . '_' . $region,
            $baseLocale . '.utf8',
            $baseLocale . '.UTF-8',
            $baseLocale
        ];
        setlocale(LC_ALL, $localeArray);
```

with:

```php
        // Set the locale for gettext, and pin LANGUAGE alongside it. glibc's
        // gettext reads LANGUAGE above LC_MESSAGES, so a host exporting it would
        // otherwise override every translation on this page, and LANGUAGE=C would
        // switch translation off altogether.
        $appliedLocale = setlocale(LC_ALL, LocaleResolver::candidates($fullLocale));
        ScopedLocale::pinLanguage($fullLocale, $appliedLocale);
```

- [ ] **Step 5: Run the check again**

```bash
curl -s -H 'Accept-Language: en' 'http://localhost:3010/index.php' > /dev/null
cat /tmp/locale-probe.txt
```

Expected: `en_US`

- [ ] **Step 6: Remove the temporary probe**

Delete the `file_put_contents('/tmp/locale-probe.txt', …)` line added in Step 1, then confirm it is gone:

```bash
grep -c 'locale-probe' php/index.php
```

Expected: `0`

- [ ] **Step 7: Confirm the page still renders and an explicit region still wins**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept-Language: en' 'http://localhost:3010/index.php'
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept-Language: pt-PT' 'http://localhost:3010/index.php'
```

Expected: `200` for both. (`pt_PT` must not be rewritten to `pt_BR`; `LocaleResolver` only fills an absent
region.)

- [ ] **Step 8: Lint**

```bash
cd php && vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/index.php
git commit -m "Resolve the region the way the library does

Uppercasing the language turned 'en' into 'en_EN', a locale that exists on
no system, so setlocale() returned false and every component rendered in
whatever locale the process already held -- the exact defect v4.1.0 fixed
inside the library, hand-rolled here since before it existed.

LANGUAGE is pinned alongside the locale for the same reason the library
pins it: glibc's gettext reads it above LC_MESSAGES, so a host exporting
LANGUAGE silently overrode this page's own translations."
```

---

### Task 3: Contain the ApiOptions LANGUAGE pin

`ApiOptions` translates its inputs when they render, so it sets the locale and `LANGUAGE` and — unlike
`CalendarSelect`, `RiteSelect` and `WebCalendar`, which restore them as of v4.1.0 — leaves both set.

**Read this before writing the check.** Two things about this task are counter-intuitive.

*It is not detectable standalone.* `ApiOptions` is constructed with the same `$options['locale']` the example
uses for its own gettext, so what it leaves behind is what the example wanted anyway. The case that matters is
the **include** path — `$directAccess === false`, how `LiturgicalCalendarFrontend` embeds this file. There the
example sets no locale of its own, the host owns it, and `ApiOptions` overwrites the host's `LANGUAGE`. The
check below exercises the include path; a `curl` against the standalone page cannot detect this and must not
be used to verify it.

*The pin happens in the constructor, not at render.* `prepareL10n()` is called from `ApiOptions::__construct()`
(`ApiOptions.php:189`) and pins there (`:273`); `getForm()` "does not touch the process locale or `LANGUAGE`"
(`:410`). A scope opened around only the render would capture the already-polluted value and faithfully
restore the pollution. **The scope must open before `new ApiOptions($options)` and close after the last
`getForm()`.**

The fix restores what the host had, rather than pinning what the example would have chosen — `restore()` can
express "LANGUAGE was unset", which `pinLanguage()` cannot.

**Files:**

- Modify: `php/index.php` — insert a render block after the POST-handling block (after original line 531,
  before the `BEGIN DISPLAY LOGIC` banner); replace the two `getForm()` echoes at original lines 742 and 745.
- Create then delete: `php/_include-probe.php` (temporary harness, removed in Step 6).

**Interfaces:**

- Consumes: `ScopedLocale` (Task 2); `$apiOptions`, `$fullLocale`.
- Produces: `$apiOptionsAllPathsHtml`, `$apiOptionsBasePathHtml` — both `string`, consumed by the markup.

- [ ] **Step 1: Write the failing check**

Create `php/_include-probe.php`, which mimics a host page that owns its own gettext state and then includes
the example. Two details matter: when included, `index.php` loads neither the autoloader nor the `.env`, so
the host must; and `LANGUAGE` is deliberately set to something *different* from the locale, because the
example derives its own locale from the host's — setting both to `de_DE` would hide the leak behind a
coincidence.

```php
<?php
// TEMPORARY HARNESS -- deleted in Step 6.
// Mimics a host page (LiturgicalCalendarFrontend) that owns its gettext state
// and includes the example. index.php loads the autoloader and the .env only
// when accessed directly, so a host has to do both itself.
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__, ['.env', '.env.local', '.env.development'], false)->safeLoad();
$_ENV['API_PROTOCOL']  = $_ENV['API_PROTOCOL'] ?? 'https';
$_ENV['API_HOST']      = $_ENV['API_HOST'] ?? 'litcal.johnromanodorazio.com';
$_ENV['API_PORT']      = $_ENV['API_PORT'] ?? '';
$_ENV['API_BASE_PATH'] = $_ENV['API_BASE_PATH'] ?? '/api/dev';

// LANGUAGE differs from the locale on purpose. glibc treats it as an
// independent priority list, and it is the value ApiOptions overwrites. Setting
// it to de_DE as well would make the leak undetectable, because the example
// derives its own locale from the host's and would pin the same value back.
putenv('LANGUAGE=fr_FR');
setlocale(LC_ALL, 'de_DE.UTF-8', 'de_DE', 'de');

$bootstrapLoaded = true;
ob_start();
require __DIR__ . '/index.php';
ob_end_clean();

echo 'LANGUAGE after include: ' . (getenv('LANGUAGE') ?: 'unset') . "\n";
```

Run it:

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples/php
php _include-probe.php
```

Expected **now**: something other than `fr_FR` — `ApiOptions` has overwritten the host's `LANGUAGE`.

- [ ] **Step 2: Open the scope before the component is constructed**

Find this line (locate by text; line numbers have drifted):

```php
$apiOptions = new ApiOptions($options);
```

Replace it with:

```php
// ApiOptions sets the process locale and pins LANGUAGE, and does not put either
// back -- it cannot, because the locale it sets has to survive until the inputs
// render. Both happen in the constructor, via prepareL10n(), not in getForm().
// Standalone that is harmless: it renders in the same locale this example uses.
// Included in another page it clobbers the host's LANGUAGE, so the render is
// scoped and the scope closed once the last getForm() has run.
$localeScope = ScopedLocale::apply(LC_ALL, $fullLocale);
$apiOptions  = new ApiOptions($options);
```

- [ ] **Step 3: Render the form and close the scope**

The insertion point is immediately after the closing `}` of the `if (isset($_POST) && !empty($_POST)) {`
block and before the `BEGIN DISPLAY LOGIC` banner comment. It must be after every `selectedValue()` and
`disabled()` call, or the form renders stale. Insert:

```php
// ============================================================================
// Render the ApiOptions form, then give the host back the locale it had
// ============================================================================
// Rendering here rather than inline in the markup is what gives the scope
// opened above somewhere to close, and keeps ApiOptions' locale away from this
// example's own dgettext() calls further down the page.
$apiOptionsAllPathsHtml = $apiOptions->getForm(PathType::ALL_PATHS);
$apiOptionsBasePathHtml = $apiOptions->getForm(PathType::BASE_PATH);
$localeScope->restore();
```

The scope spans the POST-handling block and is deliberately not wrapped in `try`/`finally`: that would mean
indenting some 250 lines for an example, and the request handling inside already catches its own exceptions.

- [ ] **Step 4: Echo the strings from the markup**

Replace this line:

```php
                    <?php echo $apiOptions->getForm(PathType::ALL_PATHS); ?>
```

with:

```php
                    <?php echo $apiOptionsAllPathsHtml; ?>
```

And replace this line:

```php
                    <?php echo $apiOptions->getForm(PathType::BASE_PATH); ?>
```

with:

```php
                    <?php echo $apiOptionsBasePathHtml; ?>
```

- [ ] **Step 5: Run the check again**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples/php
php _include-probe.php
```

Expected: `LANGUAGE after include: fr_FR`

- [ ] **Step 6: Confirm the standalone page is unaffected**

```bash
GET | grep -c 'name="year"'
GET | grep -c 'name="epiphany"'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3010/index.php'
```

Expected: non-zero, non-zero, `200` — the inputs still render in the same place.

- [ ] **Step 7: Delete the temporary harness**

```bash
rm php/_include-probe.php
git status --porcelain php/
```

Expected: `php/_include-probe.php` does not appear.

- [ ] **Step 8: Lint**

```bash
cd php && vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/index.php
git commit -m "Give the host back the locale ApiOptions took

ApiOptions translates its inputs as they render, so it sets LANGUAGE and
leaves it set -- new in v4.1.0, and the one thing in that release that
changes a host's process without putting it back.

Standalone this is harmless: ApiOptions renders in the same locale this
example uses for its own gettext. It matters when index.php is included in
another page, which owns the locale and does not expect an include to
change it. A ScopedLocale around the render restores whatever was there,
including LANGUAGE having been unset -- which pinning a value cannot
express.

Rendering into variables ahead of the markup follows the shape
webCalendarHtml already uses, and gives the scope somewhere to close."
```

---

### Task 4: Add the rite select

Adding `'rite'` to the shared `$options` array does two jobs at once. `CalendarSelect` partitions its dioceses
by it, which is what makes the Ambrosian sees reachable again; and `ApiOptions` — as of v4.2.0 — resolves it
in its options loop and calls `$this->yearInput->rite($rite)` itself, which raises the year floor to 1976 under
the Ambrosian rite with no call site of our own. Both are verified below.

**Files:**

- Modify: `php/index.php` — two `use` statements; the `$options` block at line 264; a new `$riteSelect`
  alongside the other component constructors; a new markup row above the nation/diocese row.

**Interfaces:**

- Consumes: `Rite`, `RiteSelect` from Task 1.
- Produces: `$selectedRite` (a `Rite` case, never null) — consumed by Tasks 5, 6 and 7. `$riteSelect` — a
  `RiteSelect`, consumed by the markup. `$options` gains the `'rite'` key, which reaches `CalendarSelect`
  (diocese partitioning) and `ApiOptions` (year floor); `RiteSelect` ignores it.

- [ ] **Step 1: Write the failing check**

```bash
GET | grep -c 'id="rite"'
```

Expected **now**: `0`

- [ ] **Step 2: Add the imports**

After the `use` statements added in Task 2, add:

```php
use LiturgicalCalendar\Components\Rite;
use LiturgicalCalendar\Components\RiteSelect;
```

- [ ] **Step 3: Read the rite and put it in the shared options**

Replace line 264, which currently reads:

```php
$options = ['locale' => $fullLocale];
```

with:

```php
// The rite is read before any component is built, because it feeds their
// construction: a CalendarSelect partitions its dioceses by rite. An
// unrecognised POST value falls back to the Roman rite rather than erroring,
// matching how this example already treats an out-of-range year.
$postedRite   = is_string($_POST['rite'] ?? null) ? $_POST['rite'] : '';
$selectedRite = Rite::tryFrom($postedRite) ?? Rite::ROMAN;

$options = ['locale' => $fullLocale, 'rite' => $selectedRite];
```

`RiteSelect` and `ApiOptions` both ignore an options key they do not recognise — neither has a `default:` case
— so the shared array is safe to pass to all three. Only `CalendarSelect` reads `'rite'`.

- [ ] **Step 4: Construct the select**

Immediately before line 269's `$calendarSelectNations = new CalendarSelect($options);`, insert:

```php
// No labelText(): omitting it lets RiteSelect supply its own localized label,
// the same choice javascript/main.js makes by omitting `text`.
$riteSelect = new RiteSelect($options);
$riteSelect->label(true)
    ->labelClass('form-label')
    ->id('rite')
    ->name('rite')
    ->class('form-select')
    ->selectedOption($selectedRite);
```

- [ ] **Step 5: Render it**

In the markup, immediately after `<form method="post">` (original line 724) and before the
`<div class="row">` holding the two calendar selects, insert:

```php
                <div class="row">
                    <div class="col-md-6">
                        <?php echo $riteSelect->getSelect(); ?>
                    </div>
                </div>
```

- [ ] **Step 6: Run the check again**

```bash
GET | grep -c 'id="rite"'
GET | grep -o 'value="ambrosian"' | head -1
```

Expected: non-zero, then `value="ambrosian"`.

- [ ] **Step 7: Confirm the Ambrosian sees are reachable again**

```bash
POST 'rite=ambrosian' | grep -c 'milano_it'
POST 'rite=roman' | grep -c 'milano_it'
```

Expected: non-zero for the first (the four sees are back under their own rite), `0` for the second.

- [ ] **Step 8: Confirm an unknown rite falls back rather than erroring**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -d 'rite=nonsense' 'http://localhost:3010/index.php'
```

Expected: `200`

- [ ] **Step 9: Confirm the year floor arrived through ApiOptions**

No code of ours sets this — it comes from `'rite'` being in the `$options` array `ApiOptions` was constructed
with:

```bash
POST 'rite=ambrosian' | grep -o 'name="year"[^>]*min="[0-9]*"' | head -1
POST 'rite=roman' | grep -o 'name="year"[^>]*min="[0-9]*"' | head -1
```

Expected: `min="1976"` for the first, `min="1970"` for the second.

- [ ] **Step 10: Confirm a below-floor value is clamped in the rendered input**

```bash
curl -s -X POST -d 'rite=ambrosian&year=1972' 'http://localhost:3010/index.php' \
  | grep -o 'name="year"[^>]*value="[0-9]*"' | head -1
```

Expected: a `value` of 1976 or later — never 1972. (`Year::get()` clamps up rather than rendering a year the
API would reject.)

- [ ] **Step 11: Lint**

```bash
cd php && vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/index.php
git commit -m "Give the form a rite select

CalendarSelect became rite-aware in v4.0.0 and dropped the four Ambrosian
sees from the Roman diocese list, correctly -- they never belonged in it --
but with no way to ask for the Ambrosian rite they became unreachable. This
puts them back.

The rite is read before any component is constructed because CalendarSelect
partitions its dioceses at construction time. An unrecognised POST value
falls back to Roman rather than erroring; RiteSelect ignores the options
key it does not know, so one array still serves all three.

ApiOptions reads it too, as of v4.2.0, and raises the year input's floor to
the Ambrosian Missal's first year without our asking -- which is why there
is no separate call to set it."
```

---

### Task 5: Hide the nation select under a rite with no national tier

The Ambrosian rite is the rite of a handful of sees in Lombardy and Ticino with nothing above them.
`CalendarSelect` skips the national pass entirely under it, so a nation select would render empty.

**Files:**

- Modify: `php/index.php` — the `$selectedNation` assignment (original lines 367-369); the nation/diocese
  markup row (original lines 725-732).

**Interfaces:**

- Consumes: `$selectedRite` (Task 4), `Rite::hasNationalTier(): bool`.
- Produces: `$selectedNation` is now always `false` under a rite with no national tier.

- [ ] **Step 1: Write the failing check**

```bash
POST 'rite=ambrosian' | grep -c 'id="national_calendar"'
```

Expected **now**: non-zero — an empty nation select is being rendered.

- [ ] **Step 2: Ignore a posted nation under a riteless tier**

Replace the `$selectedNation` assignment (original lines 367-369):

```php
    $selectedNation = (isset($_POST['national_calendar']) && !empty($_POST['national_calendar']))
        ? htmlspecialchars($_POST['national_calendar'], ENT_QUOTES, 'UTF-8')
        : false;
```

with:

```php
    // A rite with no national tier has no nation to select, and asking
    // CalendarRequest for one under it throws. The select is not rendered under
    // such a rite either, so this only ever discards a hand-crafted POST.
    $selectedNation = ($selectedRite->hasNationalTier() && isset($_POST['national_calendar']) && !empty($_POST['national_calendar']))
        ? htmlspecialchars($_POST['national_calendar'], ENT_QUOTES, 'UTF-8')
        : false;
```

- [ ] **Step 3: Render the row conditionally**

Replace the markup row (original lines 725-732):

```php
                <div class="row">
                    <div class="col-md-6">
                        <?php echo $calendarSelectNations->getSelect(); ?>
                    </div>
                    <div class="col-md-6">
                        <?php echo $calendarSelectDioceses->getSelect(); ?>
                    </div>
                </div>
```

with:

```php
                <div class="row">
                    <?php if ($selectedRite->hasNationalTier()) : ?>
                    <div class="col-md-6">
                        <?php echo $calendarSelectNations->getSelect(); ?>
                    </div>
                    <div class="col-md-6">
                        <?php echo $calendarSelectDioceses->getSelect(); ?>
                    </div>
                    <?php else : ?>
                    <div class="col-12">
                        <?php echo $calendarSelectDioceses->getSelect(); ?>
                    </div>
                    <?php endif; ?>
                </div>
```

- [ ] **Step 4: Run the check again**

```bash
POST 'rite=ambrosian' | grep -c 'id="national_calendar"'
POST 'rite=ambrosian' | grep -c 'id="diocesan_calendar"'
POST 'rite=ambrosian' | grep -c '<optgroup'
```

Expected: `0`, then non-zero, then `0` — no nation select, a diocese select present, and its options flat.

- [ ] **Step 5: Confirm the Roman path is untouched**

```bash
POST 'rite=roman' | grep -c 'id="national_calendar"'
POST 'rite=roman' | grep -c '<optgroup'
```

Expected: non-zero for both.

- [ ] **Step 6: Confirm a hand-crafted nation under Ambrosian is discarded, not thrown**

```bash
curl -s -X POST -d 'rite=ambrosian&national_calendar=CH&year=2026' 'http://localhost:3010/index.php' | grep -c 'alert-danger'
```

Expected: `0` — no error alert; the nation was ignored rather than reaching `CalendarRequest`.

- [ ] **Step 7: Lint**

```bash
cd php && vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/index.php
git commit -m "Drop the nation select under a rite with no national tier

CalendarSelect skips the national pass entirely under such a rite rather
than rendering an empty group, and the form should agree: under the
Ambrosian rite the diocese select takes the whole row and its four sees
render flat, with no optgroup to label them.

A posted nation is discarded under the same condition, so the form cannot
build the combination CalendarRequest refuses. The guard it added in v4.1.0
stays unreachable from the UI rather than merely caught."
```

---

### Task 6: Disable the temporal inputs under a rite that fixes them

The reformed Ambrosian Missal fixes Epiphany to 6 January, Ascension to the fortieth day of Easter and Corpus
Domini to the Thursday after Trinity; the Eternal High Priest is not established in the rite at all. The
corresponding API parameters are meaningless under it.

**Files:**

- Modify: `php/index.php` — the disabling condition (original line 385); the request-building condition
  (original line 442).

**Interfaces:**

- Consumes: `$selectedRite` (Task 4), `Rite::hasFixedTemporalOptions(): bool`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing check**

```bash
POST 'rite=ambrosian' | grep -o 'name="epiphany"[^>]*disabled' | head -1
```

Expected **now**: no output — the input is not disabled.

- [ ] **Step 2: Extend the disabling condition**

Replace original line 385:

```php
    if ($selectedDiocese || $selectedNation) {
```

with:

```php
    // A rite that fixes these in its own books joins the national and diocesan
    // calendars, which take them from the calendar rather than the request.
    if ($selectedDiocese || $selectedNation || $selectedRite->hasFixedTemporalOptions()) {
```

- [ ] **Step 3: Stop sending the parameters**

Replace original line 442:

```php
        if (!$selectedDiocese && !$selectedNation) {
```

with:

```php
        if (!$selectedDiocese && !$selectedNation && !$selectedRite->hasFixedTemporalOptions()) {
```

The two earlier guards in the `$_POST` loop (original lines 338 and 354) still populate `$requestData`, but
these keys are only read under the condition above, so they are never sent.

- [ ] **Step 4: Run the check again**

```bash
POST 'rite=ambrosian' | grep -o 'name="epiphany"[^>]*disabled' | head -1
POST 'rite=ambrosian' | grep -o 'name="ascension"[^>]*disabled' | head -1
POST 'rite=ambrosian' | grep -o 'name="corpus_christi"[^>]*disabled' | head -1
POST 'rite=ambrosian' | grep -o 'name="eternal_high_priest"[^>]*disabled' | head -1
```

Expected: each prints a match containing `disabled`.

- [ ] **Step 5: Confirm the Roman path still offers them**

```bash
POST 'rite=roman' | grep -o 'name="epiphany"[^>]*disabled' | head -1
```

Expected: no output — still enabled for the General Roman Calendar.

- [ ] **Step 6: Confirm the parameters are not sent under Ambrosian**

```bash
curl -s -X POST -d 'rite=ambrosian&epiphany=JAN6&year=2026' 'http://localhost:3010/index.php' | grep -o 'epiphany=JAN6' | head -1
```

Expected: no output — the request URL shown on the page carries no `epiphany` parameter.

- [ ] **Step 7: Lint**

```bash
cd php && vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/index.php
git commit -m "Disable the temporal inputs under a rite that fixes them

The reformed Ambrosian Missal fixes Epiphany, Ascension and Corpus Domini
in its own books and does not establish the Eternal High Priest at all, so
the four API parameters are meaningless under it. This is what
linkToRiteSelect() does for the JS examples; the PHP ApiOptions has no such
method, so the condition is written out here and OR'd into the one that
already disables the same inputs for national and diocesan calendars."
```

---

### Task 7: Put the rite in the request path and clamp the year to its floor

**Files:**

- Modify: `php/index.php` — insert after the `$calendarRequest` assignment (original line 411); replace the
  year block (original lines 421-429); delete the `YEAR_LOWER_LIMIT` constant (original line 305).

**Interfaces:**

- Consumes: `$selectedRite` (Task 4), `CalendarRequest::rite()`, `Rite::minYear(): int`.
- Produces: request URLs now carry a rite segment. `YEAR_LOWER_LIMIT` no longer exists; `YEAR_UPPER_LIMIT`
  remains.

- [ ] **Step 1: Write the failing check**

```bash
POST 'year=2026' | grep -o '/calendar/roman/2026' | head -1
```

Expected **now**: no output.

- [ ] **Step 2: Set the rite on the request**

Immediately after original line 411 (`$calendarRequest = $apiClient->calendar();`), insert:

```php
        // Emitted for every rite, the Roman one included: a form built from a
        // RiteSelect knows its rite explicitly, so the URL says so. Set before
        // the nation or diocese, though the guard fires in either order.
        $calendarRequest->rite($selectedRite);
```

- [ ] **Step 3: Clamp the year to the rite's floor**

Replace original lines 421-429:

```php
        if (isset($_POST['year'])) {
            $year = filter_var($_POST['year'], FILTER_VALIDATE_INT);
            if ($year && $year >= YEAR_LOWER_LIMIT && $year <= YEAR_UPPER_LIMIT) {
                $calendarRequest->year($year);
            } else {
                // Fallback to current year if invalid
                $calendarRequest->year((int) date('Y'));
            }
        }
```

with:

```php
        if (isset($_POST['year'])) {
            // The floor is a per-rite fact: 1970 for the Roman rite, 1976 for the
            // Ambrosian, whose reformed Missal begins there. A client-side min
            // constrains only a cooperating browser, so it is enforced again here.
            $yearLowerLimit = $selectedRite->minYear();
            $year           = filter_var($_POST['year'], FILTER_VALIDATE_INT);
            if ($year && $year >= $yearLowerLimit && $year <= YEAR_UPPER_LIMIT) {
                $calendarRequest->year($year);
            } else {
                // Fallback to the current year if invalid, never below the floor
                $calendarRequest->year(max((int) date('Y'), $yearLowerLimit));
            }
        }
```

- [ ] **Step 4: Delete the now-unused constant**

Delete original line 305:

```php
const YEAR_LOWER_LIMIT = 1970;
```

Keep `YEAR_UPPER_LIMIT`. Confirm nothing else referenced it:

```bash
grep -c 'YEAR_LOWER_LIMIT' php/index.php
```

Expected: `0`

- [ ] **Step 5: Stop reading a national calendar that a rite may not have**

Making the request succeed exposes a pre-existing defect. On a successful diocesan response the example reads
`settings.national_calendar` to back-fill the nation select — but an Ambrosian response carries no such key,
because the rite has no national tier, and `selectedOption(null)` is a `TypeError`. Until now the Ambrosian
diocesan request returned 400 and never reached this code.

Find:

```php
            // If diocese selected without nation, set nation from response
            if ($selectedDiocese && false === $selectedNation) {
```

Replace with:

```php
            // If diocese selected without nation, set nation from response.
            // Only a rite with a national tier has one to read: an Ambrosian
            // response carries no national_calendar at all, and $selectedNation
            // is always false under such a rite, so this guard would otherwise
            // always be entered and always dereference a missing property.
            if ($selectedDiocese && false === $selectedNation && $selectedRite->hasNationalTier()) {
```

- [ ] **Step 6: Run the check again**

```bash
POST 'year=2026' | grep -o '/calendar/roman/2026' | head -1
```

Expected: `/calendar/roman/2026`

- [ ] **Step 7: Confirm the Ambrosian diocesan path**

```bash
curl -s -X POST -d 'rite=ambrosian&diocesan_calendar=milano_it&year=2026' 'http://localhost:3010/index.php' \
  | grep -o '/calendar/ambrosian/diocese/milano_it/2026' | head -1
```

Expected: `/calendar/ambrosian/diocese/milano_it/2026`

- [ ] **Step 8: Confirm a below-floor year is clamped rather than erroring**

```bash
curl -s -X POST -d 'rite=ambrosian&year=1972' 'http://localhost:3010/index.php' | grep -c 'alert-danger'
```

Expected: `0` — clamped to the current year, not an error.

- [ ] **Step 9: Confirm a calendar still generates on both paths**

```bash
POST 'rite=roman&year=2026' | grep -c 'LitCalTable'
POST 'rite=ambrosian&year=2026' | grep -c 'LitCalTable'
```

Expected: non-zero for both.

- [ ] **Step 10: Lint**

```bash
cd php && vendor/bin/phpcs
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/index.php
git commit -m "Route the request through the rite

The API routes a rite as a bare segment named by the rite itself, between
calendar and any nation or diocese pair. The segment is emitted for the
Roman rite too: a form built from a RiteSelect knows its rite explicitly,
so the URL shown in the Request Details card says so, which is also what
the JS examples do.

The year floor becomes a per-rite fact read from Rite::minYear() rather
than the YEAR_LOWER_LIMIT constant, which had exactly one caller and is
gone. YEAR_UPPER_LIMIT stays -- no rite varies it.

Routing the request correctly also made an Ambrosian diocesan response
arrive for the first time, and the code that back-fills the nation select
from it assumed every diocese's nation owns a national calendar. It does
not: the response carries no national_calendar under a rite with no
national tier, and passing that null on was a TypeError. Same asymmetry the
select already accounts for, now accounted for on the way back in."
```

---

### Task 8: Auto-submit on a rite change, and document it

Switching rite has to rebuild the diocese list before an Ambrosian see can be picked, which on a POST-only
form would otherwise take two submits.

**Files:**

- Modify: `php/script.js`
- Modify: `README.md` — the PHP section (around lines 66-80)

**Interfaces:**

- Consumes: the `id="rite"` select from Task 4.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing check**

```bash
grep -c "getElementById('rite')" php/script.js
```

Expected **now**: `0`

- [ ] **Step 2: Add the listener**

Append to `php/script.js`:

```javascript
// Switching rite rebuilds the diocese list server-side, so the form is
// submitted as soon as the rite changes rather than making the user pick a
// rite, submit, and only then find the dioceses they wanted. Optional
// chaining because index.php can be included in another page, where the
// element may be absent.
const initializeRiteAutoSubmit = () => {
    document.getElementById('rite')?.addEventListener('change', (event) => {
        event.target.form?.submit();
    });
}

if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', initializeRiteAutoSubmit );
} else {
    initializeRiteAutoSubmit();
}
```

- [ ] **Step 3: Run the check again**

```bash
grep -c "getElementById('rite')" php/script.js
```

Expected: `1`

- [ ] **Step 4: Confirm it parses**

```bash
node --check php/script.js
```

Expected: no output (exit 0).

- [ ] **Step 5: Verify in a browser**

Open `http://localhost:3010/index.php`, change the rite select to the Ambrosian rite, and confirm the page
reloads by itself and the diocese select then lists Bergamo, Lugano, Milano and Novara with no nation select
beside it.

- [ ] **Step 6: Update the README**

In `README.md`, in the PHP section, after the paragraph ending "…which takes care of building the Calendar
select, the API request options form controls, and the web calendar." add:

```markdown
The example also renders a rite select. The Ambrosian rite has no national tier and its four sees — Bergamo,
Lugano, Milano and Novara — render as a flat diocese list with no nation select; it also fixes Epiphany,
Ascension, Corpus Domini and the Eternal High Priest in its own books, so those four request parameters are
disabled under it, and its calendar begins in 1976. Changing the rite submits the form, because the diocese
list is rebuilt server-side.

This example requires `liturgical-calendar/components` `^4.2`.
```

- [ ] **Step 7: Lint the markdown**

```bash
npx --yes markdownlint-cli "README.md"
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
cd /home/johnrdorazio/development/LiturgicalCalendar/examples
git add php/script.js README.md
git commit -m "Submit the form when the rite changes

The diocese list is rebuilt server-side, so without this, reaching an
Ambrosian diocesan calendar takes two submits: one to switch rite and
discover the sees, another to pick one. The JS examples rebuild live; this
is the POST-form equivalent.

Optional chaining throughout because index.php is includable in another
page, where neither the select nor its form is guaranteed to be there."
```

---

## Final verification

After Task 8, run the whole matrix once:

- [ ] **Roman, no calendar:**

```bash
POST 'rite=roman&year=2026' | grep -o '/calendar/roman/2026' | head -1
```

Expected: `/calendar/roman/2026`

- [ ] **Roman, nation and diocese:**

```bash
curl -s -X POST -d 'rite=roman&national_calendar=US&diocesan_calendar=boston_us&year=2026' \
  'http://localhost:3010/index.php' | grep -o '/calendar/roman/diocese/boston_us/2026' | head -1
```

Expected: `/calendar/roman/diocese/boston_us/2026`

- [ ] **Ambrosian, flat diocese list, no nation select:**

```bash
POST 'rite=ambrosian' | grep -c 'id="national_calendar"'   # expect 0
POST 'rite=ambrosian' | grep -c '<optgroup'                # expect 0
POST 'rite=ambrosian' | grep -c 'milano_it'                # expect non-zero
```

- [ ] **Ambrosian diocesan calendar renders:**

```bash
curl -s -X POST -d 'rite=ambrosian&diocesan_calendar=milano_it&year=2026' \
  'http://localhost:3010/index.php' | grep -c 'LitCalTable'
```

Expected: non-zero.

- [ ] **Lint everything:**

```bash
cd php && vendor/bin/phpcs
cd .. && npx --yes markdownlint-cli "**/*.md"
```

Expected: no errors from either.

- [ ] **Confirm the working tree is clean and the branch is ready:**

```bash
git status --porcelain
git log --oneline main..HEAD
```

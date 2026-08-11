# PHP example: rite awareness and locale handling from liturgy-components-php

Bump `php/` from `liturgical-calendar/components` `^3.3` (v3.3.1 installed), and wire in the rite awareness
and locale handling that arrived in v4.0.0 and v4.1.0.

The target is parity with what the JavaScript examples received in `86ea0c6` and `f0354e1`: a rite select
driving the calendar list and the request path. The PHP library does not offer the one piece that makes that
cheap in JavaScript — `ApiOptions::linkToRiteSelect()` is JS-only — so the behaviour it implies is written out
by hand here, driven off the `Rite` enum rather than hardcoded.

One piece of it could not be written out by hand, because the library gave the example no lever to pull: the
Ambrosian year floor. That was closed in the library, and the example targets `^4.2` as a result. See
[Dependency](#dependency-the-rite-floor-and-the-apioptions-rite-option).

## Context

The example crosses a major version. What actually reaches it:

| Change                                                   | Version | Affects the example                                         |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| `data-calendartype` values renamed                       | v4.0.0  | No — nothing in the example selects on the attribute        |
| Ambrosian dioceses leave the default diocese list        | v4.0.0  | Yes — four sees vanish with no way to reach them            |
| `allowNull` option text `---` → rite-level calendar name | v4.0.0  | Cosmetic; both selects call `allowNull()`                   |
| `CalendarRequest::rite()` and the national-tier guard    | v4.1.0  | New capability, currently unused                            |
| `RiteSelect`                                             | v4.1.0  | New component, currently unused                             |
| Region resolution via CLDR likely subtags                | v4.1.0  | Yes — the example hand-rolls the same bug it fixes          |
| `ApiOptions` pins `LANGUAGE` and does not restore it     | v4.1.0  | Yes — the example's own gettext runs after the form renders |
| `Rite::minYear()` exists but nothing consumes it         | v4.1.0  | Yes — and the example cannot fix it unaided                 |

Two properties of this example shape every decision below. It is a plain POST form with no live rebuilding,
so a rite change only reaches the server on a submit. And it renders two `CalendarSelect`s — a nation select
and a diocese select — where the JavaScript examples render one.

## Dependency: the rite floor and the `ApiOptions` rite option

`Rite::minYear()` returns 1970 for the Roman rite and 1976 for the Ambrosian, the first year of its reformed
Missal. Through v4.1.0 it had no callers in `src/`: `ApiOptions\Input\Year` hardcoded 1970 in the rendered
`min` attribute and in both `selectedValue` range checks, and `Input` exposed no setter, so the example could
not raise the floor however it was written.

**v4.2.0 closes this, and is released.** Three additions matter here:

- `Year::rite(Rite|string)` sets the floor from `Rite::minYear()`, and `Year::get()` clamps a below-floor
  `selectedValue` up rather than rendering a year the API would reject.
- `ApiOptions` accepts `'rite'` in its constructor options, resolves it in the options loop, and calls
  `$this->yearInput->rite($rite)` itself (`ApiOptions.php:204`).
- `Rite::resolve()` is the shared string-to-case resolver the four rite-accepting methods now share.

The second is what shapes the design below. The example already passes one `$options` array to every
component, so adding `'rite' => $selectedRite` to it — which section 2 does anyway, for `CalendarSelect`'s
sake — carries the year floor as well. **The example needs no year-floor call of its own.**

`ApiOptions` gained no `linkToRiteSelect()`, though: the temporal-input disabling and everything else in
section 3 remain the example's job.

## Design

### 1. Dependency

`php/composer.json`: `"liturgical-calendar/components": "^3.3"` becomes `"^4.2"`, followed by
`composer update liturgical-calendar/components`. `composer.lock` is committed with the change.

### 2. Rite select

A `RiteSelect` renders ahead of the nation/diocese row and posts as `rite`. The rite is read back before any
component is constructed, because it feeds their construction:

```php
$selectedRite = Rite::tryFrom($_POST['rite'] ?? '') ?? Rite::ROMAN;

$riteSelect = new RiteSelect($options);
$riteSelect->label(true)
    ->labelClass('form-label')
    ->id('rite')
    ->name('rite')
    ->class('form-select')
    ->selectedOption($selectedRite);
```

`Rite::tryFrom()` rather than the throwing path: an unrecognised POST value falls back to the Roman rite
rather than presenting an error, matching how the example already treats an out-of-range year.

`labelText()` is deliberately not called, so `RiteSelect` supplies its own localized label — the same choice
`javascript/main.js` makes by omitting `text`.

`$options` gains `'rite' => $selectedRite` alongside `'locale'`, so both `CalendarSelect`s are rite-partitioned
and the Ambrosian sees become reachable again.

### 3. Rite-aware behaviour

`ApiOptions::linkToRiteSelect()` does not exist in the PHP library, so its three effects are written out. Each
is driven off the `Rite` enum, so a third rite added to the library needs no change here.

**No national tier** (`false === $selectedRite->hasNationalTier()`): the nation select is not rendered and the
diocese select spans the full row. Any posted `national_calendar` is ignored, and — the case an earlier draft
of this spec missed — the response is not read for one either. On a successful diocesan response the example
back-fills the nation select from `settings.national_calendar`, which an Ambrosian response does not carry;
since `$selectedNation` is always `false` under such a rite, that guard would always be entered and always
dereference a missing property. The asymmetry has to be handled on the way back in as well as on the way out. This mirrors `CalendarSelect`'s
own reasoning — it "skips the national pass entirely rather than rendering an empty group" — and means the
form cannot construct the nation-under-a-riteless-tier combination that `CalendarRequest` now refuses, so the
new `InvalidArgumentException` is unreachable from the UI rather than merely caught.

**Fixed temporal options** (`$selectedRite->hasFixedTemporalOptions()`): the Epiphany, Ascension, Corpus
Christi and Eternal High Priest inputs are disabled and omitted from the request. This joins the existing
condition that disables the same inputs for national and diocesan calendars; the two are OR'd rather than
duplicated.

**Minimum year** (`$selectedRite->minYear()`): applied in two places.

- The rendered input, which advertises the real floor so the browser refuses 1972 under Ambrosian and clamps
  a below-floor value already in the field. This needs no code here: `ApiOptions` takes the rite from the
  shared `$options` array and sets it on `yearInput` itself.
- `$selectedRite->minYear()` replaces the `YEAR_LOWER_LIMIT = 1970` constant in the example's own server-side
  clamp, since a client-side `min` constrains only a cooperating browser.

`YEAR_UPPER_LIMIT` stays a constant at 9999; no rite varies it.

### 4. The rite in the request path

`$calendarRequest->rite($selectedRite)` is called unconditionally, so the segment is emitted for the Roman
rite as well: `/calendar/roman/2026`, `/calendar/ambrosian/diocese/milano_it/2026`.

This is a deliberate change to what the Request Details card shows on every request, Roman ones included. It
follows the library's own rationale — a form built from a `RiteSelect` knows its rite explicitly, so it says
so — and matches the JavaScript examples, where passing `riteSelect` to `listenTo()` marks the rite explicit.
The alternative, emitting the segment only for non-Roman rites, was considered and rejected: it would keep
familiar URLs at the cost of the example no longer demonstrating the thing it is being updated to demonstrate.

### 5. Locale correctness

Two defects in the example, both the same ones v4.1.0 fixed in the library.

**Region guessing.** Line 232 reads `$region = strtoupper($baseLocale)`, which turns `en` into `en_EN` — a
locale that exists on no system. Line 234 then feeds that to every component as `$options['locale']`. It
becomes:

```php
$region = LocaleResolver::likelyRegion($baseLocale);
if ('' === $region) {
    $region = strtoupper($baseLocale); // unchanged fallback for a language CLDR does not know
}
```

`likelyRegion()` returns `''` rather than throwing for an unknown language, so the old guess stays as the
fallback rather than being deleted.

**`LANGUAGE` never set.** The `setlocale()` ladder at lines 244-252 is replaced by the library's, and
`LANGUAGE` is pinned alongside it so the example's own gettext survives a host that exports it:

```php
$applied = setlocale(LC_ALL, LocaleResolver::candidates($fullLocale));
ScopedLocale::pinLanguage($fullLocale, $applied);
```

`pinLanguage()` is used rather than `ScopedLocale::apply()` because this is process bootstrap, not a scope:
there is no later point at which the example would want the host's original locale back.

### 6. Containing the `ApiOptions` `LANGUAGE` pin

`ApiOptions` sets the process locale and pins `LANGUAGE`, and does not put either back. The library is
explicit about why it cannot: restoring immediately "would undo the locale the inputs are about to translate
in". `CalendarSelect`, `RiteSelect` and `WebCalendar` all restore; `ApiOptions` is the exception.

**When the pin happens.** In the constructor, not at render. `prepareL10n()` is called from `__construct()`
(`ApiOptions.php:189`) and pins there (`:273`); `getForm()` explicitly "does not touch the process locale or
`LANGUAGE`" (`:410`). The locale set at construction has to survive until the inputs render, which is the
whole reason the class leaves it set.

**Which case this affects.** Standalone, none: the example constructs `ApiOptions` with the same
`$options['locale']` it uses for its own gettext, so the value left behind is the value it wanted. The case
that matters is the include path — `$directAccess === false`, how `LiturgicalCalendarFrontend` embeds this
file. There the example never sets a locale of its own, the host owns it, and `ApiOptions` overwrites the
host's `LANGUAGE` for the rest of its request.

So the containment must span construction through render, and restore what was there rather than pin what the
example would have chosen. The two `getForm()` calls move out of the markup into the logic section — the
shape `$webCalendarHtml` already uses — and the scope brackets both ends:

```php
// before the component is constructed
$localeScope = ScopedLocale::apply(LC_ALL, $fullLocale);
$apiOptions  = new ApiOptions($options);

// … POST handling configures the inputs …

// after the last render
$apiOptionsAllPathsHtml = $apiOptions->getForm(PathType::ALL_PATHS);
$apiOptionsBasePathHtml = $apiOptions->getForm(PathType::BASE_PATH);
$localeScope->restore();
```

`restore()` puts back the locale and the `LANGUAGE` in force before the scope opened, including the case where
`LANGUAGE` was unset — which `pinLanguage()` cannot express, since it only ever sets a value.

The span is wide, covering the POST-handling block, and it is not exception-safe: a throw between the two ends
leaves the host's locale changed. Wrapping ~250 lines in `try`/`finally` is disproportionate for an example,
and the request handling inside already catches its own exceptions, so this is accepted rather than solved.

The markup then echoes the two strings.

### 7. Auto-submit on rite change

Switching rite has to rebuild the diocese list before an Ambrosian see can be picked, which on a POST-only
form would otherwise take two submits. A listener in `php/script.js` submits the form when the rite changes:

```javascript
document.getElementById('rite')?.addEventListener('change', (event) => {
    event.target.form?.submit();
});
```

Guarded with `?.` because `index.php` is includable in another page, where the element may be absent.

### 8. Documentation

The PHP section of `README.md` gains the `^4.2` requirement and a note on the rite select. `CLAUDE.md` names
no components version for the PHP example and needs no change.

## Out of scope

`php/composer.json` declares `"test": "phpunit tests"` but no `php/tests/` directory exists, so the script
fails today and did before this change. Creating a test suite for the example is separate work and is not
undertaken here.

Unrelated refactoring of `index.php` — a 34 KB single file — is not undertaken either. The changes above stay
within the sections they touch.

Porting `ApiOptions::linkToRiteSelect()` to the PHP library is not undertaken. It would let the component
handle the year floor, the four temporal inputs and the calendar rebuild instead of the example hand-rolling
them, and it would delete most of section 3 — but it is a library feature in its own right, not a step in
updating an example. The `Year::min()` prerequisite is included only because without it the example cannot
render a correct form at all.

## Verification

In `liturgy-components-php`, the prerequisite is verified by that repository's own suite: `composer test`,
`composer analyse` and `composer lint` all pass, with a new test asserting `Year` renders `min="1970"` by
default and `min="1976"` after `min(1976)`.

In `examples`, there being no test suite, verification is:

1. `composer install` in `php/` resolves `liturgical-calendar/components` at v4.2.x.

2. `vendor/bin/phpcs` passes.

3. Against a local API on port 8000, by hand:

   - Roman rite, no nation: URL reads `/calendar/roman/{year}`, calendar renders.
   - Roman rite, nation and diocese: both selects behave as before, URL carries the rite segment first.
   - Switching to Ambrosian auto-submits; the nation select disappears; the diocese select lists Bergamo,
     Lugano, Milano and Novara as a flat list with no `<optgroup>`.
   - Ambrosian diocese selected: URL reads `/calendar/ambrosian/diocese/{diocese}/{year}` and the calendar
     renders.
   - Under Ambrosian the four temporal inputs are disabled, the year input renders `min="1976"`, and a year
     below 1976 submitted past the browser clamps rather than erroring.
   - With the page in a non-English locale, the "Generate Calendar" button below the `ApiOptions` form renders
     in that locale rather than in `ApiOptions`' own.

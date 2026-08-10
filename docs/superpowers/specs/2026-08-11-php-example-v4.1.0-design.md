# PHP example: liturgy-components-php v4.1.0

Bump `php/` from `liturgical-calendar/components` `^3.3` (v3.3.1 installed) to `^4.1`, and wire in the rite
awareness and locale handling that arrived in v4.0.0 and v4.1.0.

The target is parity with what the JavaScript examples received in `86ea0c6` and `f0354e1`: a rite select
driving the calendar list and the request path. The PHP library does not offer the one piece that makes that
cheap in JavaScript — `ApiOptions::linkToRiteSelect()` is JS-only — so the behaviour it implies is written out
by hand here, driven off the `Rite` enum rather than hardcoded.

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

Two properties of this example shape every decision below. It is a plain POST form with no live rebuilding,
so a rite change only reaches the server on a submit. And it renders two `CalendarSelect`s — a nation select
and a diocese select — where the JavaScript examples render one.

## Design

### 1. Dependency

`php/composer.json`: `"liturgical-calendar/components": "^3.3"` becomes `"^4.1"`, followed by
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
diocese select spans the full row. Any posted `national_calendar` is ignored. This mirrors `CalendarSelect`'s
own reasoning — it "skips the national pass entirely rather than rendering an empty group" — and means the
form cannot construct the nation-under-a-riteless-tier combination that `CalendarRequest` now refuses, so the
new `InvalidArgumentException` is unreachable from the UI rather than merely caught.

**Fixed temporal options** (`$selectedRite->hasFixedTemporalOptions()`): the Epiphany, Ascension, Corpus
Christi and Eternal High Priest inputs are disabled and omitted from the request. This joins the existing
condition that disables the same inputs for national and diocesan calendars; the two are OR'd rather than
duplicated.

**Minimum year** (`$selectedRite->minYear()`): replaces the `YEAR_LOWER_LIMIT = 1970` constant in the year
clamp. The Ambrosian rite begins in 1976, the first year of its reformed Missal. `YEAR_UPPER_LIMIT` is
unchanged.

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

`ApiOptions` translates its inputs when they render rather than when they are constructed, so it sets the
locale and `LANGUAGE` and leaves both set. The example currently calls `getForm()` inline in its markup, at
lines 742 and 745, while `dgettext('litexmplphp', …)` calls continue below it — including the "Generate
Calendar" button. Left alone, those render in `ApiOptions`' locale rather than the example's.

The two `getForm()` calls move out of the markup and into the logic section, with the example's locale
re-pinned immediately after:

```php
$apiOptionsAllPathsHtml = $apiOptions->getForm(PathType::ALL_PATHS);
$apiOptionsBasePathHtml = $apiOptions->getForm(PathType::BASE_PATH);

$applied = setlocale(LC_ALL, LocaleResolver::candidates($fullLocale));
ScopedLocale::pinLanguage($fullLocale, $applied);
```

The markup then echoes the two strings. This follows the shape `$webCalendarHtml` already uses in this file —
built in the logic section, echoed in the markup — rather than introducing a new pattern.

`CalendarSelect`, `RiteSelect` and `WebCalendar` restore the locale themselves as of v4.1.0, so their inline
`getSelect()` and `buildTable()` calls need no such treatment. `ApiOptions` is the only leak.

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

The PHP section of `README.md` gains the `^4.1` requirement and a note on the rite select. `CLAUDE.md` names
no components version for the PHP example and needs no change.

## Out of scope

`php/composer.json` declares `"test": "phpunit tests"` but no `php/tests/` directory exists, so the script
fails today and did before this change. Creating a test suite for the example is separate work and is not
undertaken here.

Unrelated refactoring of `index.php` — a 34 KB single file — is not undertaken either. The changes above stay
within the sections they touch.

## Verification

There being no test suite, verification is:

1. `composer install` in `php/` resolves `liturgical-calendar/components` at v4.1.x.

2. `vendor/bin/phpcs` passes.

3. Against a local API on port 8000, by hand:

   - Roman rite, no nation: URL reads `/calendar/roman/{year}`, calendar renders.
   - Roman rite, nation and diocese: both selects behave as before, URL carries the rite segment first.
   - Switching to Ambrosian auto-submits; the nation select disappears; the diocese select lists Bergamo,
     Lugano, Milano and Novara as a flat list with no `<optgroup>`.
   - Ambrosian diocese selected: URL reads `/calendar/ambrosian/diocese/{diocese}/{year}` and the calendar
     renders.
   - Under Ambrosian the four temporal inputs are disabled, and a year below 1976 clamps rather than erroring.
   - With the page in a non-English locale, the "Generate Calendar" button below the `ApiOptions` form renders
     in that locale rather than in `ApiOptions`' own.

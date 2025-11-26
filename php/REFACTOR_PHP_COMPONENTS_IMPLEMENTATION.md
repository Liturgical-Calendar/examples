# Refactoring Roadmap: PHP Components Example Implementation

## Overview

Refactor `LiturgicalCalendarFrontend/examples/php/index.php` from a custom class-based approach to a modern,
component-based architecture aligned with the `liturgy-components-php/examples/webcalendar/bootstrap.php` pattern.

## Goals

- Remove custom classes (LitSettings, Utilities) and enums
- Use `liturgy-components-php` package exclusively
- Add production-ready features (caching, logging, retry logic)
- Support both standalone and included deployment modes
- Inherit locale from parent application when included
- Support environments with or without Bootstrap already loaded
- Use environment variables for configuration

## Progress Tracking

- [ ] Phase 1: Environment & Autoloader Setup
- [ ] Phase 2: Remove Custom Classes & Enums
- [ ] Phase 3: Initialize ApiClient & HTTP Infrastructure
- [ ] Phase 4: Refactor POST Handling
- [ ] Phase 5: Locale Handling & Inheritance
- [ ] Phase 6: Modern HTML Structure & Bootstrap Detection
- [ ] Phase 7: Component Initialization
- [ ] Phase 8: Update .env.example
- [ ] Phase 9: Remove Obsolete Code
- [ ] Phase 10: Error Handling & User Experience
- [ ] Phase 11: Testing & Verification

---

## Phase 1: Environment & Autoloader Setup

### Current Issues

- Hardcoded autoloader path: `require dirname(__FILE__) . '/vendor/autoload.php'` (line 15)
- `$isStaging` logic for API URL determination (lines 35-47)
- Limited `.env` file search (only current directory)

### Tasks

- [ ] Replace hardcoded autoloader with directory walker
  - [ ] Walk up directory tree to find `vendor/autoload.php`
  - [ ] Stop after 10 levels or reaching filesystem root
  - [ ] Die with helpful error if not found
  - [ ] **Reference:** `liturgy-components-php/examples/webcalendar/bootstrap.php` lines 3-36

- [ ] Enhance environment variable loading
  - [ ] Make Dotenv conditional: `if (class_exists('Dotenv\Dotenv'))`
  - [ ] Search for `.env` files in multiple locations:
    - Current directory (`__DIR__`)
    - Directory containing `vendor` folder (from autoloader discovery)
  - [ ] Load all variants: `.env`, `.env.local`, `.env.development`, `.env.production`
  - [ ] Use `safeLoad()` instead of requiring values
  - [ ] Use `ifPresent()` for validation instead of `required()`

- [ ] Remove `$isStaging` logic entirely
  - [ ] Delete lines 35-37
  - [ ] Delete `$stagingURL` variable
  - [ ] Delete `$endpointV` variable
  - [ ] Delete lines 38-47 (conditional API URL logic)

- [ ] Add environment variable defaults
  - [ ] Set production defaults if not defined:

    ```php
    $_ENV['API_PROTOCOL'] = $_ENV['API_PROTOCOL'] ?? 'https';
    $_ENV['API_HOST'] = $_ENV['API_HOST'] ?? 'litcal.johnromanodorazio.com';
    $_ENV['API_PORT'] = $_ENV['API_PORT'] ?? '';
    $_ENV['API_BASE_PATH'] = $_ENV['API_BASE_PATH'] ?? '/api/dev';
    ```

  - [ ] Construct `$apiBaseUrl` from environment variables:

    ```php
    $apiPort = !empty($_ENV['API_PORT']) ? ":{$_ENV['API_PORT']}" : '';
    $apiBaseUrl = rtrim("{$_ENV['API_PROTOCOL']}://{$_ENV['API_HOST']}{$apiPort}{$_ENV['API_BASE_PATH']}", '/');
    ```

- [ ] Add DEBUG_MODE support
  - [ ] Read from environment: `$debugMode = filter_var($_ENV['DEBUG_MODE'] ?? 'false', FILTER_VALIDATE_BOOLEAN);`
  - [ ] Use for conditional logging and error display

### Code Reference

**Target pattern from bootstrap.php:**

```php
// Locate autoloader by walking up the directory tree
$currentDir = __DIR__;
$autoloaderPath = null;
$level = 0;

while (true) {
    $candidatePath = $currentDir . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';

    if (file_exists($candidatePath)) {
        $autoloaderPath = $candidatePath;
        break;
    }

    if ($level > 10) {
        break;
    }

    $parentDir = dirname($currentDir);
    if ($parentDir === $currentDir) {
        break;
    }

    ++$level;
    $currentDir = $parentDir;
}

if (null === $autoloaderPath) {
    die('Error: Unable to locate vendor/autoload.php. Please run `composer install` in the project root.');
}

require_once $autoloaderPath;
```

---

## Phase 2: Remove Custom Classes & Enums

### Files to Delete

- [ ] `src/LitSettings.php` (entire class)
- [ ] `src/Utilities.php` (entire class)
- [ ] `src/Enums/Epiphany.php`
- [ ] `src/Enums/Ascension.php`
- [ ] `src/Enums/CorpusChristi.php`
- [ ] `src/Enums/YearType.php`
- [ ] `src/Enums/LitLocale.php`
- [ ] `src/Enums/FeastType.php` (if exists)
- [ ] `src/Enums/StatusCode.php`

### Remove Import Statements

- [ ] Remove lines 20-22 (LitSettings, Utilities, Input imports)
- [ ] Remove all `use LiturgicalCalendar\Examples\Php\Enums\*` imports

### Add New Import Statements

- [ ] Add ApiClient import:

  ```php
  use LiturgicalCalendar\Components\ApiClient;
  ```

- [ ] Add MetadataProvider import:

  ```php
  use LiturgicalCalendar\Components\Metadata\MetadataProvider;
  ```

- [ ] Add HTTP factory import:

  ```php
  use LiturgicalCalendar\Components\Http\HttpClientFactory;
  ```

- [ ] Add Cache imports (optional):

  ```php
  use LiturgicalCalendar\Components\Cache\ArrayCache;
  ```

### Replacement Notes

1. **LitSettings → Inline POST handling**
   - Move validation logic directly into POST processing block
   - Use native PHP validation (filter_var, is_numeric, etc.)
   - Use MetadataProvider static methods for calendar validation

2. **Utilities → ApiClient + CalendarRequest**
   - Replace `Utilities::sendAPIRequest()` with `CalendarRequest` fluent API
   - Replace `Utilities::retrieveMetadata()` with `MetadataProvider::getInstance()`
   - Remove all cURL code

3. **Custom Enums → Use components package Enums**
   - These enums already exist in `liturgy-components-php` or should be added there
   - Remove custom duplicates from example

---

## Phase 3: Initialize ApiClient & HTTP Infrastructure

### Add Production-Ready Setup

**Reference:** `bootstrap.php` lines 59-177

- [ ] Add optional Logger setup (Monolog)

  ```php
  $logger = null;

  if (class_exists('Monolog\Logger')) {
      $logsDir = __DIR__ . '/logs';

      if (!is_dir($logsDir)) {
          if ($debugMode) {
              error_log('Creating logs directory: ' . $logsDir);
          }
          $result = mkdir($logsDir, 0755, true);
          if (!$result) {
              $lastError = error_get_last();
              $errorMsg = $lastError['message'] ?? 'unknown';
              error_log('Failed to create logs directory: ' . $errorMsg);
          }
      }

      try {
          $logger = new Monolog\Logger('liturgical-calendar');
          $logger->pushHandler(new Monolog\Handler\StreamHandler(
              $logsDir . '/litcal.log',
              Monolog\Level::Debug
          ));
          if ($debugMode) {
              error_log('Logger initialized successfully');
          }
          $logger->info('Logger initialized successfully');
      } catch (\Exception $e) {
          error_log('Error creating logger: ' . $e->getMessage());
      }
  } elseif ($debugMode) {
      error_log('Monolog not found - run `composer install` to enable logging');
  }
  ```

- [ ] Add optional Cache setup

  ```php
  if (class_exists('Symfony\Component\Cache\Adapter\FilesystemAdapter')) {
      $filesystemAdapter = new Symfony\Component\Cache\Adapter\FilesystemAdapter(
          'litcal',
          3600 * 24,
          __DIR__ . '/cache'
      );
      $cache = new Symfony\Component\Cache\Psr16Cache($filesystemAdapter);
  } else {
      $cache = new ArrayCache();
  }
  ```

- [ ] Create production HTTP client

  ```php
  $httpClient = HttpClientFactory::createProductionClient(
      cache: $cache,
      logger: $logger,
      cacheTtl: 3600 * 24,
      maxRetries: 3,
      failureThreshold: 5
  );
  ```

- [ ] Initialize ApiClient singleton

  ```php
  $apiClient = ApiClient::getInstance([
      'apiUrl' => $apiBaseUrl,
      'httpClient' => $httpClient
  ]);
  ```

### Import Requirements

- [ ] Add required imports:

  ```php
  use Monolog\Logger;
  use Monolog\Handler\StreamHandler;
  use Symfony\Component\Cache\Adapter\FilesystemAdapter;
  use Symfony\Component\Cache\Psr16Cache;
  ```

---

## Phase 4: Refactor POST Handling

### Current Approach Issues

- Uses `LitSettings` class to parse and validate POST data (lines 86-146)
- Uses `Utilities::prepareQueryData()` and `Utilities::sendAPIRequest()` (lines 121-122)
- Custom cURL implementation

### New Approach

**Reference:** `bootstrap.php` lines 203-411

- [ ] Replace LitSettings initialization (line 86) with direct POST processing
- [ ] Remove lines 84-87 (metadata retrieval and LitSettings instantiation)
- [ ] Add POST processing block with inline validation

  ```php
  if (isset($_POST) && !empty($_POST)) {
      $requestData = [];
      $requestHeaders = ['Accept: application/json'];

      foreach ($_POST as $key => $value) {
          // Sanitize string values
          if (is_string($value)) {
              $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
          }

          switch ($key) {
              case 'year_type':
                  if (null !== $value && !empty($value)) {
                      $requestData[$key] = $value;
                  }
                  $apiOptions->yearTypeInput->selectedValue($value);
                  break;
              case 'epiphany':
              case 'ascension':
              case 'corpus_christi':
              case 'eternal_high_priest':
                  // Only add to request data for General Roman Calendar
                  $nationalCalendar = $_POST['national_calendar'] ?? '';
                  $diocesanCalendar = $_POST['diocesan_calendar'] ?? '';
                  if (empty($nationalCalendar) && empty($diocesanCalendar) && null !== $value && !empty($value)) {
                      $requestData[$key] = $value;
                  }
                  $camelCaseKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))) . 'Input');
                  $apiOptions->$camelCaseKey->selectedValue($value);
                  break;
              case 'holydays_of_obligation':
                  if (is_array($value)) {
                      $sanitizedValues = array_map(
                          fn($item) => is_string($item) ? htmlspecialchars($item, ENT_QUOTES, 'UTF-8') : $item,
                          $value
                      );

                      $nationalCalendar = $_POST['national_calendar'] ?? '';
                      $diocesanCalendar = $_POST['diocesan_calendar'] ?? '';
                      if (empty($nationalCalendar) && empty($diocesanCalendar) && !empty($sanitizedValues)) {
                          $requestData[$key] = $sanitizedValues;
                      }

                      $apiOptions->holydaysOfObligationInput->selectedValue($sanitizedValues);
                  }
                  break;
          }
      }
  }
  ```

- [ ] Add calendar selection validation using MetadataProvider

  ```php
  $selectedDiocese = (isset($_POST['diocesan_calendar']) && !empty($_POST['diocesan_calendar']))
      ? htmlspecialchars($_POST['diocesan_calendar'], ENT_QUOTES, 'UTF-8')
      : false;
  $selectedNation = (isset($_POST['national_calendar']) && !empty($_POST['national_calendar']))
      ? htmlspecialchars($_POST['national_calendar'], ENT_QUOTES, 'UTF-8')
      : false;
  $selectedLocale = (isset($_POST['locale']) && !empty($_POST['locale']))
      ? htmlspecialchars($_POST['locale'], ENT_QUOTES, 'UTF-8')
      : null;

  if ($selectedLocale) {
      $requestHeaders[] = 'Accept-Language: ' . $selectedLocale;
  }

  if ($selectedDiocese && $selectedNation && false === MetadataProvider::isValidDioceseForNation($selectedDiocese, $selectedNation)) {
      $selectedDiocese = false;
      unset($_POST['diocesan_calendar']);
  }
  ```

- [ ] Build CalendarRequest using fluent API

  ```php
  try {
      $calendarRequest = $apiClient->calendar();

      if ($selectedDiocese) {
          $calendarRequest->diocese($selectedDiocese);
      } elseif ($selectedNation) {
          $calendarRequest->nation($selectedNation);
      }

      if (isset($_POST['year']) && is_numeric($_POST['year'])) {
          $calendarRequest->year((int) $_POST['year']);
      }

      if ($selectedLocale) {
          $calendarRequest->locale($selectedLocale);
      }

      if (!empty($requestData['year_type'] ?? null)) {
          $calendarRequest->yearType($requestData['year_type']);
      }

      // Set mobile feast settings (only for General Roman Calendar)
      if (!$selectedDiocese && !$selectedNation) {
          if (!empty($requestData['epiphany'] ?? null)) {
              $calendarRequest->epiphany($requestData['epiphany']);
          }
          if (!empty($requestData['ascension'] ?? null)) {
              $calendarRequest->ascension($requestData['ascension']);
          }
          if (!empty($requestData['corpus_christi'] ?? null)) {
              $calendarRequest->corpusChristi($requestData['corpus_christi']);
          }
          if (isset($requestData['eternal_high_priest'])) {
              $calendarRequest->eternalHighPriest(
                  filter_var($requestData['eternal_high_priest'], FILTER_VALIDATE_BOOLEAN)
              );
          }
          if (!empty($requestData['holydays_of_obligation'] ?? null)) {
              $calendarRequest->holydaysOfObligation($requestData['holydays_of_obligation']);
          }
      }

      $requestUrl = $calendarRequest->getRequestUrl();
      $LiturgicalCalendar = $calendarRequest->get();
  } catch (\Exception $e) {
      // Handle error (Phase 10)
  }
  ```

- [ ] Update ApiOptions inputs based on response

  ```php
  if (property_exists($LiturgicalCalendar, 'settings') && $LiturgicalCalendar->settings instanceof \stdClass) {
      $apiOptions->epiphanyInput->selectedValue($LiturgicalCalendar->settings->epiphany);
      $apiOptions->ascensionInput->selectedValue($LiturgicalCalendar->settings->ascension);
      $apiOptions->corpusChristiInput->selectedValue($LiturgicalCalendar->settings->corpus_christi);
      $apiOptions->eternalHighPriestInput->selectedValue($LiturgicalCalendar->settings->eternal_high_priest ? 'true' : 'false');
      $apiOptions->localeInput->selectedValue($LiturgicalCalendar->settings->locale);
      $apiOptions->yearTypeInput->selectedValue($LiturgicalCalendar->settings->year_type);
      $apiOptions->yearInput->selectedValue($LiturgicalCalendar->settings->year);
      $holyDaysOfObligationProperties = array_keys(array_filter(
          (array) $LiturgicalCalendar->settings->holydays_of_obligation,
          fn(bool $v) => $v === true
      ));
      $apiOptions->holydaysOfObligationInput->selectedValue($holyDaysOfObligationProperties);
  }
  ```

- [ ] Remove old code:
  - [ ] Delete lines 120-131 (old API request code)
  - [ ] Delete lines 84-87 (metadata and LitSettings)

---

## Phase 5: Locale Handling & Inheritance

### Goal

Inherit locale from parent application when included, while supporting standalone mode

### Tasks

- [ ] Detect if included or standalone

  ```php
  $directAccess = (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']));
  ```

- [ ] Add locale detection with priority order

  ```php
  $detectedLocale = null;

  // 1. Check if parent application set a locale variable
  if (!$directAccess && isset($parentLocale)) {
      $detectedLocale = $parentLocale;
  }
  // 2. Check POST data
  elseif (isset($_POST['locale']) && !empty($_POST['locale'])) {
      $detectedLocale = $_POST['locale'];
  }
  // 3. Check cookie
  elseif (!empty($_COOKIE['currentLocale'])) {
      $detectedLocale = $_COOKIE['currentLocale'];
  }
  // 4. Check Accept-Language header
  elseif (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
      $detectedLocale = \Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE']);
  }
  // 5. Default to English
  else {
      $detectedLocale = 'en';
  }

  $detectedLocale = \Locale::canonicalize($detectedLocale);
  $baseLocale = \Locale::getPrimaryLanguage($detectedLocale);
  ```

- [ ] Add optional gettext support (for backward compatibility)

  ```php
  // Only setup gettext if running standalone AND function exists
  if ($directAccess && function_exists('bindtextdomain')) {
      $textDomainPath = __DIR__ . '/i18n';
      if (is_dir($textDomainPath)) {
          bindtextdomain('litexmplphp', $textDomainPath);
          textdomain('litexmplphp');

          // Set locale for gettext
          $localeArray = [
              $detectedLocale . '.utf8',
              $detectedLocale . '.UTF-8',
              $baseLocale . '_' . strtoupper($baseLocale) . '.UTF-8',
              $baseLocale
          ];
          setlocale(LC_ALL, $localeArray);
      }
  }

  // Fallback _() function if gettext not available
  if (!function_exists('_')) {
      function _($text) {
          return $text;
      }
  }
  ```

- [ ] Remove old locale handling code:
  - [ ] Delete lines 51-65 (old locale detection)
  - [ ] Delete cookie-setting logic (LitSettings lines 248-260)
  - [ ] Delete hardcoded domain references

---

## Phase 6: Modern HTML Structure & Bootstrap Detection

### Goal

Work standalone OR within a page that already has Bootstrap

### Tasks

- [ ] Add Bootstrap detection (when included)

  ```php
  $hasBootstrap = !$directAccess && (
      isset($bootstrapLoaded) && $bootstrapLoaded === true
  );
  ```

- [ ] Replace old HTML wrapper (lines 152-176) with conditional wrapper

  ```php
  if ($directAccess) {
      ?>
      <!DOCTYPE html>
      <html lang="<?php echo $baseLocale; ?>">
      <head>
          <meta charset="utf-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title><?php echo _('Liturgical Calendar Generator'); ?></title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
              integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
              crossorigin="anonymous">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css"
              integrity="sha512-5Hs3dF2AEPkpNAR7UiOHba+lRSJNeM2ECkwxUIxC1Q/FLycGTbNapWXB4tP889k5T5Ju8fs4b1P5z/iB4nMfSQ=="
              crossorigin="anonymous"
              referrerpolicy="no-referrer">
          <style>
              /* Include table styles from bootstrap.php lines 428-555 */
          </style>
      </head>
      <body class="p-4">
      <?php
  } else {
      // When included, optionally load Bootstrap if not present
      if (!$hasBootstrap) {
          echo '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">';
      }
  }
  ```

- [ ] Convert display logic to Bootstrap 5 cards pattern

  ```php
  <div class="container-fluid">
      <!-- Header (only for direct access) -->
      <?php if ($directAccess) : ?>
      <div class="row mb-4">
          <div class="col-12">
              <h1 class="text-center mb-2">
                  <i class="fas fa-church me-2"></i>
                  <?php echo _('Liturgical Calendar Components PHP'); ?>
              </h1>
              <p class="text-center text-muted"><?php echo _('Bootstrap 5 Example with PSR-Compliant HTTP Client'); ?></p>
          </div>
      </div>
      <?php endif; ?>

      <!-- Calendar Options Card -->
      <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
              <h2 class="h5 mb-0">
                  <i class="fas fa-cog me-2"></i>
                  <?php echo _('Calendar Options'); ?>
              </h2>
          </div>
          <div class="card-body">
              <form method="post">
                  <!-- Form content -->
              </form>
          </div>
      </div>

      <!-- Request Details Card -->
      <?php if (isset($requestUrl) && !empty($requestUrl)) : ?>
      <div class="card shadow-sm mb-4">
          <div class="card-header bg-info text-white">
              <h3 class="h5 mb-0">
                  <i class="fas fa-info-circle me-2"></i>
                  <?php echo _('Request Details'); ?>
              </h3>
          </div>
          <div class="card-body">
              <!-- Request details content -->
          </div>
      </div>
      <?php endif; ?>

      <!-- Calendar Display Card -->
      <?php if (isset($webCalendarHtml) && !empty($webCalendarHtml)) : ?>
      <div class="card shadow-sm">
          <div class="card-header bg-success text-white">
              <h3 class="h5 mb-0">
                  <i class="fas fa-calendar-week me-2"></i>
                  <?php echo _('Liturgical Calendar'); ?>
              </h3>
          </div>
          <div class="card-body">
              <?php echo $webCalendarHtml; ?>
          </div>
      </div>
      <?php else : ?>
      <div class="alert alert-primary text-center" role="alert">
          <i class="fas fa-arrow-up me-2"></i>
          <?php echo _('Please fill in the form above and click "Generate Calendar" to view the liturgical calendar.'); ?>
      </div>
      <?php endif; ?>
  </div>
  ```

- [ ] Add closing HTML wrapper

  ```php
  <?php
  if ($directAccess) {
      ?>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
          crossorigin="anonymous"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/js/all.min.js"
          integrity="sha512-1JkMy1LR9bTo3psH+H4SV5bO2dFylgOy+UJhMus1zF4VEFuZVu5lsi4I6iIndE4N9p01z1554ZDcvMSjMaqCBQ=="
          crossorigin="anonymous"
          referrerpolicy="no-referrer"></script>
      </body>
      </html>
      <?php
  }
  ```

- [ ] Copy table styles from `bootstrap.php` lines 428-555 to inline `<style>` block

- [ ] Remove old display code:
  - [ ] Delete lines 152-176 (old HTML wrapper)
  - [ ] Delete lines 178-240 (old display logic)
  - [ ] Delete lines 241-247 (old closing wrapper)

---

## Phase 7: Component Initialization

### Current Pattern Issues

- Uses URL parameter in constructor: `$options = ['url' => rtrim(METADATA_URL, '/calendars')]` (line 60)
- Creates components before ApiClient initialization

### New Pattern

Components automatically use ApiClient configuration when initialized after ApiClient

- [ ] Move component initialization to AFTER ApiClient initialization
- [ ] Remove URL option from CalendarSelect constructors
- [ ] Update CalendarSelect initialization:

  ```php
  $calendarSelectNations = new CalendarSelect();
  $calendarSelectNations->label(true)
      ->labelText(_('Nation'))
      ->labelClass('form-label')
      ->id('national_calendar')
      ->name('national_calendar')
      ->class('form-select')
      ->allowNull()
      ->setOptions(OptionsType::NATIONS);

  $calendarSelectDioceses = new CalendarSelect();
  $calendarSelectDioceses->label(true)
      ->labelText(_('Diocese'))
      ->labelClass('form-label')
      ->id('diocesan_calendar')
      ->name('diocesan_calendar')
      ->class('form-select')
      ->allowNull()
      ->setOptions(OptionsType::DIOCESES);
  ```

- [ ] Update ApiOptions initialization:

  ```php
  $apiOptions = new ApiOptions();
  $apiOptions->acceptHeaderInput->hide();
  Input::setGlobalWrapper('div');
  Input::setGlobalWrapperClass('form-group col col-md-3');
  Input::setGlobalLabelClass('form-label');
  Input::setGlobalInputClass('form-select');
  $apiOptions->epiphanyInput->wrapperClass('col col-md-3');
  $apiOptions->ascensionInput->wrapperClass('col col-md-2');
  $apiOptions->corpusChristiInput->wrapperClass('col col-md-2');
  $apiOptions->eternalHighPriestInput->wrapperClass('col col-md-2');
  $apiOptions->yearTypeInput->wrapperClass('col col-md-2');
  $apiOptions->yearInput->class('form-control')->wrapperClass('col col-md-2');
  ```

- [ ] Remove old component initialization (lines 59-95)

---

## Phase 8: Update .env.example

### Tasks

- [ ] Replace current `.env.example` content with:

  ```env
  APP_ENV=development
  API_PROTOCOL=http
  API_HOST=localhost
  API_PORT=8000
  # API base path (must start with leading slash or be empty)
  API_BASE_PATH=/api/dev
  # Enable verbose debug logging (true/false)
  DEBUG_MODE=false
  ```

---

## Phase 9: Remove Obsolete Code

### Tasks

- [ ] Delete obsolete constants:
  - [ ] Remove `LITCAL_API_URL` definition
  - [ ] Remove `METADATA_URL` definition

- [ ] Remove debugging comments:
  - [ ] Delete lines 115-117 (textdomain path debug comments)

- [ ] Clean up old variables:
  - [ ] Remove `$submitParent` variable and logic (lines 152, 175)
  - [ ] Remove unused `$LitCalData` initialization (line 87)

- [ ] Remove old form generation code:
  - [ ] Delete lines 193-209 (old form structure)

- [ ] Remove old message display:
  - [ ] Delete lines 216-223 (old messages table)

- [ ] Remove old configuration display:
  - [ ] Delete lines 225-239 (old configuration output)

---

## Phase 10: Error Handling & User Experience

### Tasks

- [ ] Add try-catch around CalendarRequest

  ```php
  $webCalendarHtml = '';
  $requestUrl = '';

  try {
      $calendarRequest = $apiClient->calendar();

      // ... build request ...

      $requestUrl = $calendarRequest->getRequestUrl();
      $LiturgicalCalendar = $calendarRequest->get();

      // ... build WebCalendar ...

      $webCalendar = new WebCalendar($LiturgicalCalendar);
      $webCalendar->id('LitCalTable')
          ->firstColumnGrouping(Grouping::BY_LITURGICAL_SEASON)
          ->psalterWeekGrouping()
          ->removeHeaderRow()
          ->seasonColor(ColorAs::CSS_CLASS)
          ->seasonColorColumns(Column::LITURGICAL_SEASON)
          ->eventColor(ColorAs::INDICATOR)
          ->eventColorColumns(Column::EVENT)
          ->monthHeader()
          ->dateFormat(DateFormat::DAY_ONLY)
          ->columnOrder(ColumnOrder::GRADE_FIRST)
          ->gradeDisplay(GradeDisplay::ABBREVIATED);

      $webCalendarHtml = $webCalendar->buildTable();
      $webCalendarHtml .= '<div class="alert alert-info text-center mt-3">';
      $webCalendarHtml .= '<i class="fas fa-calendar-check me-2"></i>';
      $webCalendarHtml .= $webCalendar->daysCreated() . ' ' . _('event days created');
      $webCalendarHtml .= '</div>';

  } catch (\Exception $e) {
      $webCalendarHtml = '<div class="alert alert-danger">';
      $webCalendarHtml .= '<i class="fas fa-exclamation-triangle me-2"></i>';
      $webCalendarHtml .= _('Error') . ': ' . htmlspecialchars($e->getMessage());
      $webCalendarHtml .= '</div>';

      if ($debugMode && $logger) {
          $logger->error('Calendar request failed', [
              'error' => $e->getMessage(),
              'request_url' => $requestUrl,
              'diocese' => $selectedDiocese ?? null,
              'nation' => $selectedNation ?? null,
              'year' => $_POST['year'] ?? null
          ]);
      }
  }
  ```

- [ ] Add year validation constants

  ```php
  const YEAR_LOWER_LIMIT = 1970;
  const YEAR_UPPER_LIMIT = 9999;
  ```

- [ ] Add year validation in POST handling

  ```php
  if (isset($_POST['year'])) {
      $year = filter_var($_POST['year'], FILTER_VALIDATE_INT);
      if ($year && $year >= YEAR_LOWER_LIMIT && $year <= YEAR_UPPER_LIMIT) {
          $calendarRequest->year($year);
      } else {
          // Show error or use default year
          $year = (int) date('Y');
          $calendarRequest->year($year);
      }
  }
  ```

- [ ] Add user-friendly error messages for common issues:
  - Invalid year range
  - Invalid diocese for nation
  - API connection failures
  - Invalid calendar selections

---

## Phase 11: Testing & Verification

### Pre-Testing Setup

- [ ] Install dependencies: `composer install`
- [ ] Create `.env.local` with development settings
- [ ] Ensure API is running on localhost:8000 (if testing locally)

### Test Cases

#### Standalone Mode

- [ ] **Direct Access via URL**
  - [ ] Access `examples/php/index.php` directly
  - [ ] Verify Bootstrap CSS loads
  - [ ] Verify Font Awesome icons display
  - [ ] Verify header and page structure appears

- [ ] **General Roman Calendar**
  - [ ] Leave nation and diocese empty
  - [ ] Set year to 2024
  - [ ] Click "Generate Calendar"
  - [ ] Verify calendar displays
  - [ ] Verify mobile feast settings are editable
  - [ ] Verify Epiphany, Ascension, Corpus Christi, Eternal High Priest inputs are enabled

- [ ] **National Calendar**
  - [ ] Select a nation (e.g., "United States")
  - [ ] Verify dioceses dropdown updates
  - [ ] Click "Generate Calendar"
  - [ ] Verify mobile feast settings are disabled
  - [ ] Verify calendar displays with national settings

- [ ] **Diocesan Calendar**
  - [ ] Select a nation
  - [ ] Select a diocese
  - [ ] Click "Generate Calendar"
  - [ ] Verify mobile feast settings are disabled
  - [ ] Verify calendar displays with diocesan settings

#### Included Mode

- [ ] **Create test parent page:**

  ```php
  <?php
  $bootstrapLoaded = true; // Bootstrap already loaded
  $parentLocale = 'it'; // Italian locale from parent
  ?>
  <!DOCTYPE html>
  <html>
  <head>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  </head>
  <body>
      <h1>Parent Page</h1>
      <?php include 'examples/php/index.php'; ?>
  </body>
  </html>
  ```

- [ ] **Test included mode:**
  - [ ] Verify Bootstrap CSS doesn't load twice
  - [ ] Verify locale inherits from `$parentLocale`
  - [ ] Verify no `<html>`, `<head>`, or `<body>` tags are output
  - [ ] Verify form submits correctly

#### Validation Tests

- [ ] **Invalid Diocese for Nation**
  - [ ] Select nation "Italy"
  - [ ] Manually set diocese to "boston_us" (via browser dev tools)
  - [ ] Submit form
  - [ ] Verify diocese selection is cleared

- [ ] **Year Range Validation**
  - [ ] Test year 1969 (below minimum)
  - [ ] Verify error message or fallback to current year
  - [ ] Test year 10000 (above maximum)
  - [ ] Verify error message or fallback to current year
  - [ ] Test year 2024 (valid)
  - [ ] Verify calendar generates successfully

- [ ] **Locale Inheritance**
  - [ ] Test with cookie set
  - [ ] Test with Accept-Language header
  - [ ] Test with parent locale variable
  - [ ] Test with POST locale
  - [ ] Verify priority order is respected

#### Environment Tests

- [ ] **Development Environment**
  - [ ] Set `APP_ENV=development` in `.env.local`
  - [ ] Set `API_HOST=localhost`, `API_PORT=8000`
  - [ ] Verify API URL uses localhost

- [ ] **Production Environment**
  - [ ] Remove `.env.local`
  - [ ] Verify API URL defaults to production
  - [ ] Verify HTTPS protocol

- [ ] **Debug Mode**
  - [ ] Set `DEBUG_MODE=true`
  - [ ] Trigger an error
  - [ ] Verify detailed logging appears
  - [ ] Set `DEBUG_MODE=false`
  - [ ] Verify errors are less verbose

#### Optional Features

- [ ] **With Monolog (Logging)**
  - [ ] Install: `composer require monolog/monolog`
  - [ ] Verify `logs/litcal.log` is created
  - [ ] Trigger an API error
  - [ ] Verify error is logged to file

- [ ] **With Symfony Cache (Persistent Caching)**
  - [ ] Install: `composer require symfony/cache`
  - [ ] Verify `cache/` directory is created
  - [ ] Make first request
  - [ ] Make second request
  - [ ] Verify second request is faster (cached)

- [ ] **Without Optional Dependencies**
  - [ ] Run `composer install --no-dev`
  - [ ] Verify application still works
  - [ ] Verify ArrayCache is used as fallback
  - [ ] Verify no logger errors

#### Error Handling

- [ ] **API Connection Failure**
  - [ ] Stop the API server
  - [ ] Submit form
  - [ ] Verify friendly error message displays
  - [ ] Verify error is logged (if logger available)

- [ ] **Invalid API Response**
  - [ ] Test with malformed API endpoint
  - [ ] Verify error handling works
  - [ ] Verify user sees meaningful error

- [ ] **Missing .env File**
  - [ ] Remove all `.env` files
  - [ ] Verify application uses production defaults
  - [ ] Verify API URL points to production

### Performance Tests

- [ ] **Caching Performance**
  - [ ] Enable Symfony cache
  - [ ] Make first calendar request
  - [ ] Note response time
  - [ ] Make identical second request
  - [ ] Verify response time is significantly faster

- [ ] **Metadata Caching**
  - [ ] Make multiple requests with different nations
  - [ ] Verify metadata is only fetched once (check logs or network tab)

### Security Tests

- [ ] **XSS Prevention**
  - [ ] Submit form with `<script>alert('XSS')</script>` in inputs
  - [ ] Verify scripts are escaped and don't execute

- [ ] **SQL Injection (API-side, but verify passthrough)**
  - [ ] Submit form with SQL-like inputs
  - [ ] Verify application doesn't break

### Browser Compatibility

- [ ] Test in Chrome/Edge
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test on mobile device

### Code Quality Checks

- [ ] Run `composer lint` (if available)
- [ ] Run `composer analyse` (if available)
- [ ] Check for PHP errors: `php -l index.php`
- [ ] Verify no warnings or notices in error log

---

## Success Criteria

- [ ] All custom classes and enums removed
- [ ] Application uses `liturgy-components-php` exclusively
- [ ] Works in both standalone and included modes
- [ ] Inherits locale from parent application
- [ ] Supports Bootstrap already loaded scenario
- [ ] Environment-based configuration works
- [ ] Optional dependencies (Monolog, Symfony Cache) enhance but aren't required
- [ ] Error handling is user-friendly
- [ ] All test cases pass
- [ ] Code is cleaner and more maintainable
- [ ] Performance is improved (caching)

---

## Benefits Summary

1. **Reduced code complexity:** ~250 lines removed (LitSettings + Utilities + Enums)
2. **Improved maintainability:** Uses components package exclusively, no custom duplicates
3. **Production-ready:** Includes caching, logging, retry logic, circuit breaker
4. **Better separation of concerns:** Display logic separated from data processing
5. **Flexible deployment:** Works standalone or included
6. **Environment-aware:** Uses `.env` files for configuration
7. **Modern standards:** PSR-compliant HTTP client, singleton patterns
8. **Locale inheritance:** Respects parent application's locale
9. **Bootstrap-aware:** Doesn't reload CSS if already present
10. **Better error handling:** User-friendly messages, detailed logging

---

## Notes

- Keep this document updated as you complete each phase
- Mark checkboxes with `[x]` as tasks are completed
- Document any deviations or issues encountered
- Update test results as they're completed

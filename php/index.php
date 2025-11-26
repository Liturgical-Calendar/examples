<?php
// phpcs:disable PSR1.Files.SideEffects
/**
 * Liturgical Calendar display script using cURL and PHP
 * Author: John Romano D'Orazio
 * Email: priest@johnromanodorazio.com
 * Licensed under the Apache 2.0 License
 * Version 3.0
 * Date Created: 27 December 2017
 */

ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);

// ============================================================================
// Import Required Classes
// ============================================================================
use LiturgicalCalendar\Components\ApiClient;
use LiturgicalCalendar\Components\ApiOptions;
use LiturgicalCalendar\Components\ApiOptions\Input;
use LiturgicalCalendar\Components\ApiOptions\PathType;
use LiturgicalCalendar\Components\CalendarSelect;
use LiturgicalCalendar\Components\CalendarSelect\OptionsType;
use LiturgicalCalendar\Components\WebCalendar;
use LiturgicalCalendar\Components\WebCalendar\Grouping;
use LiturgicalCalendar\Components\WebCalendar\ColorAs;
use LiturgicalCalendar\Components\WebCalendar\Column;
use LiturgicalCalendar\Components\WebCalendar\ColumnOrder;
use LiturgicalCalendar\Components\WebCalendar\DateFormat;
use LiturgicalCalendar\Components\WebCalendar\GradeDisplay;
use LiturgicalCalendar\Components\Metadata\MetadataProvider;
use LiturgicalCalendar\Components\Http\HttpClientFactory;
use LiturgicalCalendar\Components\Cache\ArrayCache;

// ============================================================================
// Detect Direct Access vs. Included
// ============================================================================
$directAccess = (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']));

if ($directAccess) {
    // ============================================================================
    // Locate autoloader by walking up the directory tree
    // ============================================================================
    $currentDir = __DIR__;
    $autoloaderPath = null;
    $vendorDir = null;

    // Walk up directories looking for vendor/autoload.php
    $level = 0;
    while (true) {
        $candidatePath = $currentDir . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';

        if (file_exists($candidatePath)) {
            $autoloaderPath = $candidatePath;
            $vendorDir = dirname($candidatePath);
            break;
        }

        // Don't look more than 10 levels up
        if ($level > 10) {
            break;
        }

        $parentDir = dirname($currentDir);
        if ($parentDir === $currentDir) { // Reached the filesystem root
            break;
        }

        ++$level;
        $currentDir = $parentDir;
    }

    if (null === $autoloaderPath) {
        die('Error: Unable to locate vendor/autoload.php. Please run `composer install` in the project root.');
    }

    require_once $autoloaderPath;

    // ============================================================================
    // Environment Configuration
    // ============================================================================
    // Load environment variables if Dotenv is available
    if (class_exists('Dotenv\Dotenv')) {
        // Search for .env files in multiple locations
        $envLocations = [
            __DIR__,  // Current directory
            dirname($vendorDir)  // Directory containing vendor folder
        ];

        foreach ($envLocations as $envLocation) {
            if (is_dir($envLocation)) {
                $dotenv = Dotenv\Dotenv::createImmutable(
                    $envLocation,
                    ['.env', '.env.local', '.env.development', '.env.staging', '.env.production'],
                    false
                );
                $dotenv->ifPresent(['API_PROTOCOL', 'API_HOST', 'API_BASE_PATH'])->notEmpty();
                $dotenv->ifPresent(['API_PORT'])->isInteger();
                $dotenv->safeLoad();
                break; // Use first valid location
            }
        }
    }

    // Set default environment variables if not already set
    $_ENV['API_PROTOCOL'] = $_ENV['API_PROTOCOL'] ?? 'https';
    $_ENV['API_HOST'] = $_ENV['API_HOST'] ?? 'litcal.johnromanodorazio.com';
    $_ENV['API_PORT'] = $_ENV['API_PORT'] ?? '';
    $_ENV['API_BASE_PATH'] = $_ENV['API_BASE_PATH'] ?? '/api/dev';

    // Build Base API URL
    $apiPort    = !empty($_ENV['API_PORT']) ? ":{$_ENV['API_PORT']}" : '';
    $apiBaseUrl = rtrim("{$_ENV['API_PROTOCOL']}://{$_ENV['API_HOST']}{$apiPort}{$_ENV['API_BASE_PATH']}", '/');
    $debugMode  = filter_var($_ENV['DEBUG_MODE'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

    // ============================================================================
    // Setup PSR-Compliant HTTP Client with Production Features
    // ============================================================================

    // 1. Setup Logger (Monolog) - if available
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

    // 2. Setup Cache - Filesystem cache (if available) or ArrayCache fallback
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

    // 3. Create Production-Ready HTTP Client
    $httpClient = HttpClientFactory::createProductionClient(
        cache: $cache,
        logger: $logger,
        cacheTtl: 3600 * 24,
        maxRetries: 3,
        failureThreshold: 5
    );

    // 4. Initialize ApiClient Singleton
    $apiClient = ApiClient::getInstance([
        'apiUrl' => $apiBaseUrl,
        'httpClient' => $httpClient
    ]);
}


// ============================================================================
// Locale Handling & Inheritance
// ============================================================================
$detectedLocale = null;

// 1. Check if parent application set a locale via setlocale()
if (!$directAccess) {
    $currentLocale = setlocale(LC_ALL, 0);
    // Only use if not the default "C" locale
    if ($currentLocale !== false && $currentLocale !== 'C') {
        $detectedLocale = $currentLocale;
    }
} else {
    // 2. Check POST data
    if (isset($_POST['locale']) && !empty($_POST['locale'])) {
        $detectedLocale = $_POST['locale'];
    }
    // 3. Check cookie
    if (!$detectedLocale && !empty($_COOKIE['currentLocale'])) {
        $detectedLocale = $_COOKIE['currentLocale'];
    }
    // 4. Check Accept-Language header
    if (!$detectedLocale && isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        $detectedLocale = \Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE']);
    }
}

// 5. Default to English
if (!$detectedLocale) {
    $detectedLocale = 'en_US';
}

$detectedLocale = \Locale::canonicalize($detectedLocale);
$baseLocale     = \Locale::getPrimaryLanguage($detectedLocale);
$region         = \Locale::getRegion($detectedLocale);
if (null === $region || empty($region)) {
    $region = strtoupper($baseLocale); // make an attempt at a possible region code
}
$fullLocale = $baseLocale . '_' . $region;

// Setup gettext if running standalone AND function exists
if ($directAccess && function_exists('bindtextdomain')) {
    $textDomainPath = __DIR__ . '/i18n';
    if (is_dir($textDomainPath)) {
        bindtextdomain('litexmplphp', $textDomainPath);
        textdomain('litexmplphp');

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
    }
}

// Fallback dgettext() function if gettext not available
if (!function_exists('dgettext')) {
    function dgettext(string $_textdomain, string $text)
    {
        return $text;
    }
}

$options = ['locale' => $fullLocale];

// ============================================================================
// Initialize Components
// ============================================================================
$calendarSelectNations = new CalendarSelect($options);
$calendarSelectNations->label(true)
    ->labelText('Nation')
    ->labelClass('form-label')
    ->id('national_calendar')
    ->name('national_calendar')
    ->class('form-select')
    ->allowNull()
    ->setOptions(OptionsType::NATIONS);

$calendarSelectDioceses = new CalendarSelect($options);
$calendarSelectDioceses->label(true)
    ->labelText('Diocese')
    ->labelClass('form-label')
    ->id('diocesan_calendar')
    ->name('diocesan_calendar')
    ->class('form-select')
    ->allowNull()
    ->setOptions(OptionsType::DIOCESES);

$apiOptions = new ApiOptions($options);
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

// ============================================================================
// Year Validation Constants
// ============================================================================
const YEAR_LOWER_LIMIT = 1970;
const YEAR_UPPER_LIMIT = 9999;

// ============================================================================
// POST Request Handling
// ============================================================================
$webCalendarHtml = '';
$requestUrl = '';

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
                // Handle array input (multi-select)
                if (is_array($value)) {
                    $sanitizedValues = array_values(array_map(
                        fn($item) => is_string($item) ? htmlspecialchars($item, ENT_QUOTES, 'UTF-8') : $item,
                        $value
                    ));

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

    // Validate diocese for nation
    if ($selectedDiocese && $selectedNation && false === MetadataProvider::isValidDioceseForNation($selectedDiocese, $selectedNation)) {
        $selectedDiocese = false;
        unset($_POST['diocesan_calendar']);
    }

    // Disable mobile feast inputs for national/diocesan calendars
    if ($selectedDiocese || $selectedNation) {
        $apiOptions->epiphanyInput->disabled();
        $apiOptions->ascensionInput->disabled();
        $apiOptions->corpusChristiInput->disabled();
        $apiOptions->eternalHighPriestInput->disabled();
        $apiOptions->holydaysOfObligationInput->disabled();
    }

    // Update calendar selects based on selection
    if ($selectedDiocese) {
        if ($selectedNation) {
            $calendarSelectNations->selectedOption($selectedNation);
            $calendarSelectDioceses->nationFilter($selectedNation)->setOptions(OptionsType::DIOCESES_FOR_NATION);
            $calendarSelectDioceses->selectedOption($selectedDiocese);
        }
        $apiOptions->localeInput->setOptionsForCalendar('diocese', $selectedDiocese);
    } elseif ($selectedNation) {
        $calendarSelectNations->selectedOption($selectedNation);
        $calendarSelectDioceses->nationFilter($selectedNation)->setOptions(OptionsType::DIOCESES_FOR_NATION);
        $apiOptions->localeInput->setOptionsForCalendar('nation', $selectedNation);
    }

    // ========================================================================
    // Make Calendar Request using CalendarRequest (via ApiClient)
    // ========================================================================
    try {
        $calendarRequest = $apiClient->calendar();

        // Set calendar type (diocese takes precedence over nation)
        if ($selectedDiocese) {
            $calendarRequest->diocese($selectedDiocese);
        } elseif ($selectedNation) {
            $calendarRequest->nation($selectedNation);
        }

        // Set year if provided
        if (isset($_POST['year'])) {
            $year = filter_var($_POST['year'], FILTER_VALIDATE_INT);
            if ($year && $year >= YEAR_LOWER_LIMIT && $year <= YEAR_UPPER_LIMIT) {
                $calendarRequest->year($year);
            } else {
                // Fallback to current year if invalid
                $calendarRequest->year((int) date('Y'));
            }
        }

        // Set locale if provided
        if ($selectedLocale) {
            $calendarRequest->locale($selectedLocale);
        }

        // Set year type if provided
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

        // Get request URL for display purposes BEFORE executing
        $requestUrl = $calendarRequest->getRequestUrl();

        // Execute the request
        $LiturgicalCalendar = $calendarRequest->get();

        // Update form inputs based on response
        if (property_exists($LiturgicalCalendar, 'settings') && $LiturgicalCalendar->settings instanceof \stdClass) {
            $apiOptions->epiphanyInput->selectedValue($LiturgicalCalendar->settings->epiphany);
            $apiOptions->ascensionInput->selectedValue($LiturgicalCalendar->settings->ascension);
            $apiOptions->corpusChristiInput->selectedValue($LiturgicalCalendar->settings->corpus_christi);
            $apiOptions->eternalHighPriestInput->selectedValue($LiturgicalCalendar->settings->eternal_high_priest ? 'true' : 'false');
            $apiOptions->localeInput->selectedValue($LiturgicalCalendar->settings->locale);
            $apiOptions->yearTypeInput->selectedValue($LiturgicalCalendar->settings->year_type);
            $apiOptions->yearInput->selectedValue($LiturgicalCalendar->settings->year);

            // Handle holydays of obligation
            $holyDaysOfObligationProperties = array_keys(array_filter(
                (array) $LiturgicalCalendar->settings->holydays_of_obligation,
                fn(bool $v) => $v === true
            ));
            $apiOptions->holydaysOfObligationInput->selectedValue($holyDaysOfObligationProperties);

            // If diocese selected without nation, set nation from response
            if ($selectedDiocese && false === $selectedNation) {
                $calendarSelectNations->selectedOption($LiturgicalCalendar->settings->national_calendar);
                $calendarSelectDioceses->nationFilter($LiturgicalCalendar->settings->national_calendar)
                    ->setOptions(OptionsType::DIOCESES_FOR_NATION)
                    ->selectedOption($selectedDiocese);
            }
        }

        // Build WebCalendar
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
        $webCalendarHtml .= $webCalendar->daysCreated() . ' event days created';
        $webCalendarHtml .= '</div>';

    } catch (\Exception $e) {
        // Handle any errors from CalendarRequest
        $webCalendarHtml = '<div class="alert alert-danger">';
        $webCalendarHtml .= '<i class="fas fa-exclamation-triangle me-2"></i>';
        $webCalendarHtml .= 'Error: ' . htmlspecialchars($e->getMessage());
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
}


// ============================================================================
// BEGIN DISPLAY LOGIC
// ============================================================================

// Detect if Bootstrap is already loaded (when included in another page)
$hasBootstrap = !$directAccess && (isset($bootstrapLoaded) && $bootstrapLoaded === true);

if ($directAccess) {
    // The file is being accessed directly via a web URL
    ?>
<!DOCTYPE html>
<html lang="<?php echo $baseLocale; ?>">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo dgettext('litexmplphp', 'Liturgical Calendar Generator'); ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
        crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.1/css/all.min.css"
        integrity="sha512-5Hs3dF2AEPkpNAR7UiOHba+lRSJNeM2ECkwxUIxC1Q/FLycGTbNapWXB4tP889k5T5Ju8fs4b1P5z/iB4nMfSQ=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-multiselect@2.0.0/dist/css/bootstrap-multiselect.min.css">
    <style>
        body {
            background-color: #f8f9fa;
        }

        /* Liturgical Calendar Table Styling */
        #LitCalTable {
            width: 90%;
            margin: 30px auto;
            padding: 10px;
            background: white;
            border-collapse: collapse;
            border-spacing: 1px;
        }

        #LitCalTable caption {
            caption-side: top;
            text-align: center;
        }

        #LitCalTable colgroup .col2 {
            width: 10%;
        }

        #LitCalTable td {
            padding: 4px 6px;
            border: 1px dashed lightgray;
        }

        #LitCalTable td.rotate {
            width: 1.5em;
            white-space: nowrap;
            text-align: center;
            vertical-align: middle;
        }

        #LitCalTable td.rotate div {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 1.8em;
            font-weight: bold;
            writing-mode: vertical-rl;
            transform: rotate(180.0deg);
        }

        #LitCalTable .monthHeader {
            text-align: center;
            background-color: #ECA;
            color: darkslateblue;
            font-weight: bold;
        }

        #LitCalTable .dateEntry {
            font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
            font-size: .8em;
        }

        #LitCalTable .eventDetails {
            color: #BD752F;
        }

        #LitCalTable .liturgicalGrade {
            text-align: center;
            font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
        }

        #LitCalTable .liturgicalGrade.liturgicalGrade_0 {
            visibility: hidden;
        }

        #LitCalTable .liturgicalGrade_0,
        #LitCalTable .liturgicalGrade_1,
        #LitCalTable .liturgicalGrade_2 {
            font-size: .9em;
        }

        #LitCalTable .liturgicalGrade_3 {
            font-size: .9em;
        }

        #LitCalTable .liturgicalGrade_4,
        #LitCalTable .liturgicalGrade_5 {
            font-size: 1em;
        }

        #LitCalTable .liturgicalGrade_6,
        #LitCalTable .liturgicalGrade_7 {
            font-size: 1em;
            font-weight: bold;
        }

        .liturgicalGrade.liturgicalGrade_0,
        .liturgicalGrade.liturgicalGrade_1,
        .liturgicalGrade.liturgicalGrade_2 {
            font-style: italic;
            color: gray;
        }

        /* Liturgical Colors */
        #LitCalTable td.purple {
            background-color: plum;
            color: black;
        }

        #LitCalTable td.EASTER_TRIDUUM.purple {
            background-color: palevioletred;
            color: white;
        }

        #LitCalTable td.white {
            background-color: whitesmoke;
            color: black;
        }

        #LitCalTable td.red {
            background-color: lightpink;
            color: black;
        }

        #LitCalTable td.rose {
            background-color: mistyrose;
            color: black;
        }

        #LitCalTable td.green {
            background-color: lightgreen;
            color: black;
        }
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
?>

<div class="container-fluid">
    <!-- Header -->
    <?php if ($directAccess) : ?>
    <div class="row mb-4">
        <div class="col-12">
            <h1 class="text-center mb-2">
                <i class="fas fa-church me-2"></i>
                <?php echo dgettext('litexmplphp', 'Liturgical Calendar Components PHP'); ?>
            </h1>
            <p class="text-center text-muted"><?php echo dgettext('litexmplphp', 'Bootstrap 5 Example with PSR-Compliant HTTP Client'); ?></p>
        </div>
    </div>
    <?php else: ?>
    <h1 style="text-align:center;"><?php echo dgettext('litexamplphp', 'Liturgical Calendar Calculation for a Given Year'); ?></h1>
    <h2 style="text-align:center;"><?php echo dgettext('litexamplphp', 'PHP example'); ?></h2>
    <?php endif; ?>

    <!-- Calendar Options Card -->
    <div class="card shadow-sm mb-4">
        <div class="card-header bg-primary text-white">
            <h2 class="h5 mb-0">
                <i class="fas fa-cog me-2"></i>
                <?php echo dgettext('litexmplphp', 'Calendar Options'); ?>
            </h2>
        </div>
        <div class="card-body">
            <form method="post">
                <div class="row">
                    <div class="col-md-6">
                        <?php echo $calendarSelectNations->getSelect(); ?>
                    </div>
                    <div class="col-md-6">
                        <?php echo $calendarSelectDioceses->getSelect(); ?>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <h6 class="mt-3 mb-2 text-muted">
                            <i class="fas fa-sliders-h me-2"></i>
                            <?php echo dgettext('litexmplphp', 'API Parameters'); ?>
                        </h6>
                    </div>
                </div>
                <div class="row">
                    <?php echo $apiOptions->getForm(PathType::ALL_PATHS); ?>
                </div>
                <div class="row mb-2">
                    <?php echo $apiOptions->getForm(PathType::BASE_PATH); ?>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <?php if (!$directAccess) : ?>
                        <input type="hidden" name="example" value="PHP">
                        <?php endif; ?>
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-calendar-alt me-2"></i>
                            <?php echo dgettext('litexmplphp', 'Generate Calendar'); ?>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Request Details Card -->
    <?php if (isset($requestUrl) && !empty($requestUrl)) : ?>
    <div class="card shadow-sm mb-4">
        <div class="card-header bg-info text-white">
            <h3 class="h5 mb-0">
                <i class="fas fa-info-circle me-2"></i>
                <?php echo dgettext('litexmplphp', 'Request Details'); ?>
            </h3>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <h6 class="text-muted"><?php echo dgettext('litexmplphp', 'Request URL'); ?>:</h6>
                <code class="d-block p-2 bg-light rounded"><?php echo htmlspecialchars($requestUrl); ?></code>
            </div>
            <?php if (!empty($requestData)) : ?>
            <div class="mb-3">
                <h6 class="text-muted"><?php echo dgettext('litexmplphp', 'Request Data'); ?>:</h6>
                <div class="row">
                    <?php foreach ($requestData as $key => $value) : ?>
                    <div class="col-md-4 mb-2">
                        <span class="badge bg-secondary"><?php echo htmlspecialchars($key); ?>:</span>
                        <span class="ms-2"><?php
                        if ($value === null || $value === '') {
                            echo 'null';
                        } elseif (is_array($value)) {
                            echo htmlspecialchars(implode(', ', $value));
                        } else {
                            echo htmlspecialchars($value);
                        }
                        ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
            <?php if (!empty($requestHeaders)) : ?>
            <div>
                <h6 class="text-muted"><?php echo dgettext('litexmplphp', 'Request Headers'); ?>:</h6>
                <div class="row">
                    <?php foreach ($requestHeaders as $header) : ?>
                    <div class="col-md-6 mb-2">
                        <code class="d-block p-2 bg-light rounded"><?php echo htmlspecialchars($header); ?></code>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Web Calendar Card -->
    <?php if (isset($webCalendarHtml) && !empty($webCalendarHtml)) : ?>
    <div class="card shadow-sm">
        <div class="card-header bg-success text-white">
            <h3 class="h5 mb-0">
                <i class="fas fa-calendar-week me-2"></i>
                <?php echo dgettext('litexmplphp', 'Liturgical Calendar'); ?>
            </h3>
        </div>
        <div class="card-body">
            <?php echo $webCalendarHtml; ?>
        </div>
    </div>
    <?php
    if (property_exists($LiturgicalCalendar, 'messages') && is_array($LiturgicalCalendar->messages) && count($LiturgicalCalendar->messages) > 0) {
        echo '<table id="LitCalMessages"><thead><tr><th colspan=2 style="text-align:center;">' . dgettext('litexamplphp', 'Information about the current calculation of the Liturgical Year') . '</th></tr></thead>';
        echo '<tbody>';
        foreach ($LiturgicalCalendar->messages as $idx => $message) {
            echo "<tr><td>{$idx}</td><td>{$message}</td></tr>";
        }
        echo '</tbody></table>';
    }
    ?>
    <?php else : ?>
    <div class="alert alert-primary text-center" role="alert">
        <i class="fas fa-arrow-up me-2"></i>
        <?php echo dgettext('litexmplphp', 'Please fill in the form above and click "Generate Calendar" to view the liturgical calendar.'); ?>
    </div>
    <?php endif; ?>
</div>

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
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap-multiselect@2.0.0/dist/js/bootstrap-multiselect.min.js"></script>
    <script src="script.js"></script>
</body>
</html>
<?php
}

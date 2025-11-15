<?php
// phpcs:disable PSR1.Files.SideEffects
/**
 * Liturgical Calendar display script using cURL and PHP
 * Author: John Romano D'Orazio
 * Email: priest@johnromanodorazio.com
 * Licensed under the Apache 2.0 License
 * Version 2.4
 * Date Created: 27 December 2017
 */

ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);

require dirname(__FILE__) . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__, ['.env', '.env.local', '.env.development', '.env.production'], false);
//$dotenv->required(['APP_ENV', 'API_PROTOCOL', 'API_HOST', 'API_PORT']);
$dotenv->safeLoad();

use LiturgicalCalendar\Examples\Php\LitSettings;
use LiturgicalCalendar\Examples\Php\Utilities;
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

$isStaging  = ( strpos($_SERVER['HTTP_HOST'], '-staging') !== false || strpos($_SERVER['HTTP_HOST'], 'localhost') !== false );
$stagingURL = $isStaging ? '-staging' : '';
$endpointV  = $isStaging ? 'dev' : 'v4';
if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development') {
    if (false === isset($_ENV['API_PROTOCOL']) || false === isset($_ENV['API_HOST']) || false === isset($_ENV['API_PORT'])) {
        die('API_PROTOCOL, API_HOST and API_PORT must be defined in .env.development or similar dotenv when APP_ENV is development');
    }
    define('LITCAL_API_URL', "{$_ENV['API_PROTOCOL']}://{$_ENV['API_HOST']}:{$_ENV['API_PORT']}/calendar");
    define('METADATA_URL', "{$_ENV['API_PROTOCOL']}://{$_ENV['API_HOST']}:{$_ENV['API_PORT']}/calendars");
} else {
    define('LITCAL_API_URL', "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendar");
    define('METADATA_URL', "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendars");
}

$directAccess = ( basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']) );

$envLocale = setlocale(LC_TIME, 0);
if (null === $envLocale || 'C' === $envLocale) {
    setlocale(LC_ALL, 'en_US.UTF-8');
    $envLocale = setlocale(LC_ALL, 0);
}

$baseLocale            = Locale::getPrimaryLanguage($envLocale);
$options               = [
    'url' => rtrim(METADATA_URL, '/calendars')
];
$calendarSelectNations = new CalendarSelect($options);
$calendarSelectNations->label(true)->labelText('nation')->labelClass('form-label')
    ->id('national_calendar')->name('national_calendar')->class('form-select')->allowNull()->setOptions(OptionsType::NATIONS)
    ->locale($baseLocale);

$calendarSelectDioceses = new CalendarSelect($options);
$calendarSelectDioceses->label(true)->labelText('diocese')->labelClass('form-label')
    ->id('diocesan_calendar')->name('diocesan_calendar')->class('form-select')->allowNull()->setOptions(OptionsType::DIOCESES)
    ->locale($baseLocale);

$options = [
    'url'    => rtrim(METADATA_URL, '/calendars'),
    'locale' => $baseLocale
];

$apiOptions = new ApiOptions($options);
$apiOptions->acceptHeaderInput->hide();
Input::setGlobalWrapper('div');
Input::setGlobalWrapperClass('form-group col col-md-3');
Input::setGlobalLabelClass('form-label');
Input::setGlobalInputClass('form-select');

//$Metadata = Utilities::retrieveMetadata();
$metadata    = CalendarSelect::getMetadata();
$litSettings = new LitSettings($_POST, $metadata, $directAccess);
$LitCalData  = null;

$apiOptions->epiphanyInput->selectedValue($litSettings->Epiphany);
$apiOptions->ascensionInput->selectedValue($litSettings->Ascension);
$apiOptions->corpusChristiInput->selectedValue($litSettings->CorpusChristi);
$apiOptions->eternalHighPriestInput->selectedValue($litSettings->EternalHighPriest ? 'true' : 'false');
$apiOptions->yearTypeInput->selectedValue($litSettings->YearType)->wrapperClass('col col-md-2');
$apiOptions->yearInput->class('form-control')->wrapperClass('col col-md-2');
if ($litSettings->NationalCalendar !== null || $litSettings->DiocesanCalendar !== null) {
    $apiOptions->epiphanyInput->disabled();
    $apiOptions->ascensionInput->disabled();
    $apiOptions->corpusChristiInput->disabled();
    $apiOptions->eternalHighPriestInput->disabled();
}
if ($litSettings->NationalCalendar) {
    $calendarSelectNations->selectedOption($litSettings->NationalCalendar);
    $calendarSelectDioceses->nationFilter($litSettings->NationalCalendar)->setOptions(OptionsType::DIOCESES_FOR_NATION);
    if ($litSettings->DiocesanCalendar === null) {
        $apiOptions->localeInput->setOptionsForCalendar('nation', $litSettings->NationalCalendar);
    }
}
if ($litSettings->DiocesanCalendar) {
    $calendarSelectDioceses->selectedOption($litSettings->DiocesanCalendar);
    $apiOptions->localeInput->setOptionsForCalendar('diocese', $litSettings->DiocesanCalendar);
}

// debug value of expected textdomain path
echo '<!-- expected textdomain path: ' . $litSettings->expectedTextDomainPath . ' -->';
// debug value of set textdomain path
echo '<!-- set textdomain path: ' . $litSettings->currentTextDomainPath . ' -->';


if ($litSettings->Year >= 1970 && $litSettings->Year <= 9999) {
    $queryData  = Utilities::prepareQueryData($litSettings);
    $response   = Utilities::sendAPIRequest($queryData, $metadata);
    $LitCalData = json_decode($response);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo 'There was an error decoding the JSON data: ' . json_last_error_msg() . PHP_EOL;
        echo '<pre>';
        var_dump($response);
        echo '</pre>';
        die();
    }
    $apiOptions->localeInput->selectedValue($LitCalData->settings->locale);
    $webCalendar = new WebCalendar($LitCalData);
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
}


/**************************
 * BEGIN DISPLAY LOGIC
 *************************/
$submitParent = '';
if ($directAccess) {
    // The file is being accessed directly via a web URL
    ?>
<!doctype html>

<head>
    <title><?php echo 'Generate Roman Calendar'; ?></title>
    <meta charset="UTF-8">
    <link rel="icon" type="image/x-icon" href="../../favicon.ico">
    <meta name="msapplication-TileColor" content="#ffffff" />
    <link rel="stylesheet" type="text/css" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css"
        integrity="sha512-jnSuA4Ss2PkkikSOLtYs8BlYIeeIK1h99ty4YfvRPAlzr377vr3CXDb7sb7eEEBYjDtcYj+AjBH3FLv5uSJuXg=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer" />
</head>

<body>
    <?php
} else {
    // The file is being included in another PHP script
    // We need to make sure that the submit will submit to the parent script
    $submitParent = '<input type="hidden" name="example" value="PHP">';
}

echo '<h1 style="text-align:center;">' . _('Liturgical Calendar Calculation for a Given Year') . ' (' . $litSettings->Year . ')</h1>';
echo '<h2 style="text-align:center;">' . sprintf(
    _('HTML presentation elaborated by PHP using a CURL request to a %s'),
    '<a href="' . LITCAL_API_URL . '">PHP engine</a>'
) . '</h2>';

if ($litSettings->Year > 9999) {
    $litSettings->Year = 9999;
}

if ($litSettings->Year < 1970) {
    echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">';
    echo _('You are requesting a year prior to 1970: it is not possible to request years prior to 1970.');
    echo '</div>';
}
echo '<form method="POST" id="ApiOptionsForm">';
echo '<fieldset style="margin-bottom:6px;"><legend>' . _('Customize options for generating the Roman Calendar') . '</legend>';
echo '<div class="row">';
echo '<div class="form-group col col-md-2">' . $calendarSelectNations->getSelect() . '</div>';
echo '<div class="form-group col col-md-3">' . $calendarSelectDioceses->getSelect() . '</div>';
echo $apiOptions->getForm(PathType::ALL_PATHS);
echo '</div>';
echo '<div class="row mb-2">';
echo $apiOptions->getForm(PathType::BASE_PATH);
echo '</div>';
echo '<div class="row">';
echo '<div class="form-group col col-md-3 mx-auto text-center">';
echo $submitParent . '<input type="SUBMIT" class="btn btn-primary" value="' . strtoupper(_('Generate Roman Calendar')) . '" />';
echo '</div>';
echo '</div>';
echo '</fieldset>';
echo '</form>';

if ($litSettings->Year >= 1970) {
    echo $webCalendar->buildTable();
    echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">' . $webCalendar->daysCreated() . ' event days created</div>';
}

if (property_exists($LitCalData, 'messages') && is_array($LitCalData->messages) && count($LitCalData->messages) > 0) {
    echo '<table id="LitCalMessages"><thead><tr><th colspan=2 style="text-align:center;">' . _('Information about the current calculation of the Liturgical Year') . '</th></tr></thead>';
    echo '<tbody>';
    foreach ($LitCalData->messages as $idx => $message) {
        echo "<tr><td>{$idx}</td><td>{$message}</td></tr>";
    }
    echo '</tbody></table>';
}

echo '<div style="text-align:center;border:2px groove White;border-radius:6px;margin:0px auto;padding-bottom:6px;">';
echo '<h6><b>' . _('Configurations sent in the request') . '</b></h6>';
echo '<b>nation</b>: ' . ( $litSettings->NationalCalendar ?? 'null' ) . ', <b>diocese</b>: ' . ( $litSettings->DiocesanCalendar ?? 'null' ) . ', <b>year</b>: ' . $litSettings->Year . ', <b>year_type</b>: ' . $litSettings->YearType . ', <b>locale</b>: ' . $litSettings->Locale;
if ($litSettings->NationalCalendar === null && $litSettings->DiocesanCalendar === null) {
    echo '<br>';
    echo '<b>epiphany</b>: ' . $litSettings->Epiphany . ', <b>ascension</b>: ' . $litSettings->Ascension . ', <b>corpus_christi</b>: ' . $litSettings->CorpusChristi . ', <b>eternal_high_priest</b>: ' . ( $litSettings->EternalHighPriest ? 'true' : 'false' );
}

echo '<hr>';

echo '<h6><b>' . _('Configurations received in the response') . '</b></h6>';
echo '<b>nation</b>: ' . ( $LitCalData->settings->national_calendar ?? 'null' ) . ', <b>diocese</b>: ' . ( $LitCalData->settings->diocesan_calendar ?? 'null' ) . ', <b>year</b>: ' . ( $LitCalData->settings->year ?? 'null' ) . ', <b>year_type</b>: ' . ( $LitCalData->settings->year_type ?? 'null' ) . ', <b>locale</b>: ' . ( $LitCalData->settings->locale ?? 'null' );
echo '<br>';
echo '<b>epiphany</b>: ' . ( $LitCalData->settings->epiphany ?? 'null' ) . ', <b>ascension</b>: ' . ( $LitCalData->settings->ascension ?? 'null' ) . ', <b>corpus_christi</b>: ' . ( $LitCalData->settings->corpus_christi ?? 'null' ) . ', <b>eternal_high_priest</b>: ' . ( $LitCalData->settings->eternal_high_priest ? 'true' : 'false' );
echo '</div>';

if ($directAccess) {
    // The file is being accessed directly
    ?>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
</body>
    <?php
}

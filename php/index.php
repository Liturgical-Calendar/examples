<?php

/**
 * Liturgical Calendar display script using CURL and PHP
 * Author: John Romano D'Orazio
 * Email: priest@johnromanodorazio.com
 * Licensed under the Apache 2.0 License
 * Version 2.4
 * Date Created: 27 December 2017
 */

ini_set('error_reporting', E_ALL);
ini_set("display_errors", 1);

require dirname(__FILE__) . '/vendor/autoload.php';

use LiturgicalCalendar\Examples\Php\LitSettings;
use LiturgicalCalendar\Examples\Php\Utilities;
use LiturgicalCalendar\Components\ApiOptions;
use LiturgicalCalendar\Components\ApiOptions\Input;
use LiturgicalCalendar\Components\ApiOptions\PathType;
use LiturgicalCalendar\Components\CalendarSelect;
use LiturgicalCalendar\Components\CalendarSelect\OptionsType;
use LiturgicalCalendar\Components\WebCalendar;

$isStaging = ( strpos($_SERVER['HTTP_HOST'], "-staging") !== false || strpos($_SERVER['HTTP_HOST'], "localhost") !== false );
$stagingURL = $isStaging ? "-staging" : "";
$endpointV = $isStaging ? "dev" : "v3";
define("LITCAL_API_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendar");
define("METADATA_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendars");
$directAccess = (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']));

$baseLocale = Locale::getPrimaryLanguage(setlocale(LC_ALL, 0) ?? 'en-US');

$calendarSelectNations = new CalendarSelect();
$calendarSelectNations->label(true)->labelText('nation')->labelClass('d-block mb-1')
    ->id('national_calendar')->name('national_calendar')->allowNull()->setOptions(OptionsType::NATIONS)
    ->locale($baseLocale);

$calendarSelectDioceses = new CalendarSelect();
$calendarSelectDioceses->label(true)->labelText('diocese')->labelClass('d-block mb-1')
    ->id('diocesan_calendar')->name('diocesan_calendar')->allowNull()->setOptions(OptionsType::DIOCESES)
    ->locale($baseLocale);

$apiOptions = new ApiOptions(['locale' => $baseLocale]);
$apiOptions->acceptHeaderInput->hide();
Input::setGlobalWrapper('td');
Input::setGlobalLabelClass('api-option-label');

//$Metadata = Utilities::retrieveMetadata();
$metadata = CalendarSelect::getMetadata();
$litSettings = new LitSettings($_POST, $metadata, $directAccess);
$LitCalData = null;

$primaryLanguage = Locale::getPrimaryLanguage($litSettings->Locale);
$apiOptions->localeInput->selectedValue($primaryLanguage);
$apiOptions->epiphanyInput->selectedValue($litSettings->Epiphany);
$apiOptions->ascensionInput->selectedValue($litSettings->Ascension);
$apiOptions->corpusChristiInput->selectedValue($litSettings->CorpusChristi);
$apiOptions->eternalHighPriestInput->selectedValue($litSettings->EternalHighPriest ? 'true' : 'false');
$apiOptions->yearTypeInput->selectedValue($litSettings->YearType);
if ($litSettings->NationalCalendar !== null || $litSettings->DiocesanCalendar !== null) {
    $apiOptions->epiphanyInput->disabled();
    $apiOptions->ascensionInput->disabled();
    $apiOptions->corpusChristiInput->disabled();
    $apiOptions->eternalHighPriestInput->disabled();
    $apiOptions->localeInput->disabled();
}
if ($litSettings->NationalCalendar) {
    $calendarSelectNations->selectedOption($litSettings->NationalCalendar);
    $calendarSelectDioceses->nationFilter($litSettings->NationalCalendar)->setOptions(OptionsType::DIOCESES_FOR_NATION);
}
if ($litSettings->DiocesanCalendar) {
    $calendarSelectDioceses->selectedOption($litSettings->DiocesanCalendar);
}

// debug value of expected textdomain path
echo '<!-- expected textdomain path: ' . $litSettings->expectedTextDomainPath . ' -->';
// debug value of set textdomain path
echo '<!-- set textdomain path: ' . $litSettings->currentTextDomainPath . ' -->';


if ($litSettings->Year >= 1970 && $litSettings->Year <= 9999) {
    $queryData  = Utilities::prepareQueryData($litSettings);
    $response   = Utilities::sendAPIRequest($queryData);
    $LitCalData = json_decode($response);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "There was an error decoding the JSON data: " . json_last_error_msg() . PHP_EOL;
        echo "<pre>";
        var_dump($response);
        echo "</pre>";
        die();
    }

    $webCalendar = new WebCalendar($LitCalData);
    $webCalendar->id('LitCalTable');
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
    <title><?php echo dgettext('litexmplphp', "Generate Roman Calendar") ?></title>
    <meta charset="UTF-8">
    <link rel="icon" type="image/x-icon" href="../../favicon.ico">
    <meta name="msapplication-TileColor" content="#ffffff" />
    <meta name="msapplication-TileImage" content="../../assets/easter-egg-5-144-279148.png">
    <link rel="apple-touch-icon-precomposed" sizes="152x152" href="../../assets/easter-egg-5-152-279148.png">
    <link rel="apple-touch-icon-precomposed" sizes="144x144" href="../../assets/easter-egg-5-144-279148.png">
    <link rel="apple-touch-icon-precomposed" sizes="120x120" href="../../assets/easter-egg-5-120-279148.png">
    <link rel="apple-touch-icon-precomposed" sizes="114x114" href="../../assets/easter-egg-5-114-279148.png">
    <link rel="apple-touch-icon-precomposed" sizes="72x72" href="../../assets/easter-egg-5-72-279148.png">
    <link rel="apple-touch-icon-precomposed" href="../../assets/easter-egg-5-57-279148.png">
    <link rel="icon" href="../../assets/easter-egg-5-32-279148.png" sizes="32x32">
    <link rel="stylesheet" type="text/css" href="styles.css">
</head>

<body>
    <div><a class="backNav" href="https://litcal<?php echo $stagingURL; ?>.johnromanodorazio.com/usage.php">↩      <?php echo dgettext('litexmplphp', "Go back") ?>      ↩</a></div>
    <?php
} else {
    // The file is being included in another PHP script
    // We need to make sure that the submit will submit to the parent script
    $submitParent = '<input type="hidden" name="example" value="PHP">';
    // We need to inline the styles
    ?>
<style>
    <?php include 'styles.css'; ?>
</style>
    <?php
}

echo '<h1 style="text-align:center;">' . dgettext('litexmplphp', 'Liturgical Calendar Calculation for a Given Year') . ' (' . $litSettings->Year . ')</h1>';
echo '<h2 style="text-align:center;">' . sprintf(dgettext('litexmplphp', 'HTML presentation elaborated by PHP using a CURL request to a %s'), "<a href=\"" . LITCAL_API_URL . "\">PHP engine</a>") . '</h2>';

if ($litSettings->Year > 9999) {
    $litSettings->Year = 9999;
}

if ($litSettings->Year < 1970) {
    echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">';
    echo dgettext('litexmplphp', 'You are requesting a year prior to 1970: it is not possible to request years prior to 1970.');
    echo '</div>';
}
echo '<form method="POST" id="ApiOptionsForm">';
echo '<fieldset style="margin-bottom:6px;"><legend>' . dgettext('litexmplphp', 'Customize options for generating the Roman Calendar') . '</legend>';
echo '<table style="width:100%;"><tr>';

echo $apiOptions->getForm(PathType::BASE_PATH);
echo '</tr>';
echo '<tr>';
echo '<td><label>year<br><input type="number" name="year" id="year" min="1970" max="9999" value="' . $litSettings->Year . '" /></label></td>';
echo $apiOptions->getForm(PathType::ALL_PATHS);
echo '<td colspan="1">' . $calendarSelectNations->getSelect() . '</td>';
echo '<td colspan="2">' . $calendarSelectDioceses->getSelect() . '</td>';
echo '</tr><tr>';
echo '<td colspan="5" style="text-align:center;padding:15px;">' . $submitParent . '<input type="SUBMIT" value="' . strtoupper(dgettext('litexmplphp', 'Generate Roman Calendar')) . '" /></td>';
echo '</tr></table>';
echo '</fieldset>';
echo '</form>';

echo '<div style="text-align:center;border:2px groove White;border-radius:6px;margin:0px auto;padding-bottom:6px;">';
echo '<h6><b>' . dgettext('litexmplphp', 'Configurations sent in the request') . '</b></h6>';
if ($litSettings->NationalCalendar === null && $litSettings->DiocesanCalendar === null) {
    echo '<b>epiphany</b>: ' . $litSettings->Epiphany . ', <b>ascension</b>: ' . $litSettings->Ascension . ', <b>corpus_christi</b>: ' . $litSettings->CorpusChristi . ', <b>eternal_high_priest</b>: ' . ($litSettings->EternalHighPriest ? 'true' : 'false') . ', <b>locale</b>: ' . $litSettings->Locale;
    echo '<br>';
}
echo '<b>year</b>: ' . $litSettings->Year . ', <b>year_type</b>: ' . $litSettings->YearType . ', <b>nation</b>: ' . ($litSettings->NationalCalendar ?? 'null') . ', <b>diocese</b>: ' . ($litSettings->DiocesanCalendar ?? 'null');
echo '<hr>';
echo '<h6><b>' . dgettext('litexmplphp', 'Configurations received in the response') . '</b></h6>';
echo '<b>epiphany</b>: ' . ($LitCalData->settings->epiphany ?? 'null') . ', <b>ascension</b>: ' . ($LitCalData->settings->ascension ?? 'null') . ', <b>corpus_christi</b>: ' . ($LitCalData->settings->corpus_christi ?? 'null') . ', <b>eternal_high_priest</b>: ' . ($LitCalData->settings->eternal_high_priest ? 'true' : 'false') . ', <b>locale</b>: ' . ($LitCalData->settings->locale ?? 'null');
echo '<br /><b>year</b>: ' . ($LitCalData->settings->year ?? 'null') . ', <b>year_type</b>: ' . ($LitCalData->settings->year_type ?? 'null') . ', <b>nation</b>: ' . ($LitCalData->settings->national_calendar ?? 'null') . ', <b>diocese</b>: ' . ($LitCalData->settings->diocesan_calendar ?? 'null');
echo '</div>';

if ($litSettings->Year >= 1970) {
    echo $webCalendar->buildTable();
    echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">' . $webCalendar->daysCreated() . ' event days created</div>';
}

if (property_exists($LitCalData, 'messages') && is_array($LitCalData->messages) && count($LitCalData->messages) > 0) {
    echo '<table id="LitCalMessages"><thead><tr><th colspan=2 style="text-align:center;">' . dgettext('litexmplphp', "Information about the current calculation of the Liturgical Year") . '</th></tr></thead>';
    echo '<tbody>';
    foreach ($LitCalData->messages as $idx => $message) {
        echo "<tr><td>{$idx}</td><td>{$message}</td></tr>";
    }
    echo '</tbody></table>';
}

if ($directAccess) {
    // The file is being accessed directly
    ?>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
</body>
    <?php
}

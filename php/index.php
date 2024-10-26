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
use LiturgicalCalendar\Examples\Php\Festivity;
use LiturgicalCalendar\Components\ApiOptions;
use LiturgicalCalendar\Components\ApiOptions\Input;
use LiturgicalCalendar\Components\ApiOptions\PathType;

$isStaging = ( strpos($_SERVER['HTTP_HOST'], "-staging") !== false );
$stagingURL = $isStaging ? "-staging" : "";
$endpointV = $isStaging ? "dev" : "v3";
define("LITCAL_API_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendar");
define("METADATA_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendars");
$directAccess = (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']));

$baseLocale = Locale::getPrimaryLanguage(setlocale(LC_ALL, 0));
$litSettings = new LitSettings($_GET, $directAccess);

// debug value of expected textdomain path
echo '<!-- expected textdomain path: ' . $litSettings->expectedTextDomainPath . ' -->';
// debug value of set textdomain path
echo '<!-- set textdomain path: ' . $litSettings->currentTextDomainPath . ' -->';

$nationalCalendarOptions = '<option value="">---</option>';
$diocesanCalendarOptions = '<option value="">---</option>';

$MetaData = Utilities::retrieveMetadata();
if ($MetaData !== null) {
    $litSettings->setMetaData($MetaData, $stagingURL);
    $nationalCalendarOptions = Utilities::buildNationOptions($MetaData["national_calendars_keys"], $litSettings->NationalCalendar, $litSettings->Locale);
    [$diocesanCalendarOptions, $diocesesCount] = Utilities::buildDioceseOptions($MetaData, $litSettings->NationalCalendar, $litSettings->DiocesanCalendar);
} else {
    echo "There was an error retrieving the Metadata!";
    die();
}

if ($litSettings->Year >= 1970 && $litSettings->Year <= 9999) {
    $queryData  = Utilities::prepareQueryData($litSettings);
    $response   = Utilities::sendAPIRequest($queryData);
    $LitCalData = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "There was an error decoding the JSON data: " . json_last_error_msg() . PHP_EOL;
        echo "<pre>";
        var_dump($response);
        echo "</pre>";
        die();
    }

    $LitCal = null;
    if (isset($LitCalData["litcal"])) {
        $LitCal = $LitCalData["litcal"];
    } else {
        echo "We do not have enough information. Returned data has no `litcal` property:" . PHP_EOL;
        echo "<pre>";
        var_dump($LitCalData);
        echo "</pre>";
        die();
    }

    foreach ($LitCal as $key => $value) {
        // retransform each entry from an associative array to a Festivity class object
        $LitCal[$key] = new Festivity($LitCal[$key]);
    }
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
echo '<form method="GET" id="ApiOptionsForm">';
echo '<fieldset style="margin-bottom:6px;"><legend>' . dgettext('litexmplphp', 'Customize options for generating the Roman Calendar') . '</legend>';
echo '<table style="width:100%;"><tr>';

$apiOptions = new ApiOptions(['locale' => $baseLocale]);
$apiOptions->acceptHeaderInput->hide();
Input::setGlobalWrapper('td');
Input::setGlobalLabelClass('api-option-label');
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
echo $apiOptions->getForm(PathType::BASE_PATH);
echo '</tr>';
echo '<tr>';
echo '<td><label>year<br><input type="number" name="year" id="year" min="1970" max="9999" value="' . $litSettings->Year . '" /></label></td>';
echo $apiOptions->getForm(PathType::ALL_PATHS);

echo '</tr><tr>';
echo '<td colspan="5" style="text-align:center;padding:18px;"><i>' . dgettext('litexmplphp', 'Choose a calendar') . '</i></td>';
echo '</tr><tr>';
echo '<td colspan="5" style="text-align:center;"><label>nation<br><select id="national_calendar" name="national_calendar">' . $nationalCalendarOptions . '</select></label>';
echo '<label style="margin-left: 18px;">diocese<br><select id="diocesan_calendar" name="diocesan_calendar"' . ($diocesesCount < 1 ? ' disabled' : '') . '>' . $diocesanCalendarOptions . '</select></label></td>';
echo '</tr><tr>';
echo '<td colspan="5" style="text-align:center;padding:15px;">' . $submitParent . '<input type="SUBMIT" value="' . strtoupper(dgettext('litexmplphp', 'Generate Roman Calendar')) . '" /></td>';
echo '</tr></table>';
echo '</fieldset>';
echo '</form>';

echo '<div style="text-align:center;border:2px groove White;border-radius:6px;margin:0px auto;padding-bottom:6px;">';

echo '<h6><b>' . dgettext('litexmplphp', 'Configurations used to generate this calendar') . '</b></h6>';
echo '<b>epiphany</b>: ' . $litSettings->Epiphany . ', <b>ascension</b>: ' . $litSettings->Ascension . ', <b>corpus_christi</b>: ' . $litSettings->CorpusChristi . ', <b>eternal_high_priest</b>: ' . ($litSettings->EternalHighPriest ? 'true' : 'false') . ', <b>locale</b>: ' . $litSettings->Locale;
echo '<br /><b>nation</b>: ' . ($litSettings->NationalCalendar ?? 'null') . ', <b>diocese</b>: ' . ($litSettings->DiocesanCalendar ?? 'null') . ', <b>year</b>: ' . $litSettings->Year . ', <b>year_type</b>: ' . $litSettings->YearType;
echo '</div>';

if ($litSettings->Year >= 1970) {
    echo '<table id="LitCalTable">';
    echo '<thead><tr><th>' . dgettext('litexmplphp', "Month") . '</th><th>' . dgettext('litexmplphp', "Date in Gregorian Calendar") . '</th><th>' . dgettext('litexmplphp', "General Roman Calendar Festivity") . '</th><th>' . dgettext('litexmplphp', "Grade of the Festivity") . '</th></tr></thead>';
    echo '<tbody>';


    $dayCnt = 0;
    //for($i=1997;$i<=2037;$i++){

    $LitCalKeys = array_keys($LitCal);

    $currentMonth = 0; //1=January, ... 12=December
    $newMonth = false;

    //print_r($LitCalKeys);
    //echo count($LitCalKeys);
    for ($keyindex = 0; $keyindex < count($LitCalKeys); $keyindex++) {
        $dayCnt++;
        $keyname = $LitCalKeys[$keyindex];
        $festivity = $LitCal[$keyname];
        //If we are at the start of a new month, count how many events we have in that same month, so we can display the Month table cell
        if ((int) $festivity->date->format('n') !== $currentMonth) {
            $newMonth = true;
            $currentMonth = (int) $festivity->date->format('n');
            $cm = 0;
            Utilities::countSameMonthEvents($keyindex, $LitCal, $cm);
        }

        //Let's check if we have more than one event on the same day, such as optional memorials...
        $cc = 0;
        Utilities::countSameDayEvents($keyindex, $LitCal, $cc);
        if ($cc > 0) {
            for ($ev = 0; $ev <= $cc; $ev++) {
                $keyname = $LitCalKeys[$keyindex];
                $festivity = $LitCal[$keyname];
                Utilities::buildHTML($festivity, $LitCal, $newMonth, $cc, $cm, $litSettings->Locale, $ev);
                $keyindex++;
            }
            $keyindex--;
        } else {
            Utilities::buildHTML($festivity, $LitCal, $newMonth, $cc, $cm, $litSettings->Locale, null);
        }
    }

    echo '</tbody></table>';

    echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">' . $dayCnt . ' event days created</div>';
}

if (isset($LitCalData["messages"]) && is_array($LitCalData["messages"]) && count($LitCalData["messages"]) > 0) {
    echo '<table id="LitCalMessages"><thead><tr><th colspan=2 style="text-align:center;">' . dgettext('litexmplphp', "Information about the current calculation of the Liturgical Year") . '</th></tr></thead>';
    echo '<tbody>';
    foreach ($LitCalData["messages"] as $idx => $message) {
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

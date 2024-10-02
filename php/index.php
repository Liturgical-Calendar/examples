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

require 'vendor/autoload.php';

use LiturgicalCalendar\Examples\Php\LitSettings;
use LiturgicalCalendar\Examples\Php\Utilities;
use LiturgicalCalendar\Examples\Php\Festivity;

$isStaging = ( strpos($_SERVER['HTTP_HOST'], "-staging") !== false );
$stagingURL = $isStaging ? "-staging" : "";
$endpointV = $isStaging ? "dev" : "v3";
define("LITCAL_API_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendar");
define("METADATA_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/calendars");

$litSettings = new LitSettings($_GET);

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
    $queryData = Utilities::prepareQueryData($litSettings);
    $response = Utilities::sendAPIRequest($queryData);
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
        $LitCal[$key] = new Festivity(
            $LitCal[$key]["name"],
            $LitCal[$key]["date"],
            $LitCal[$key]["color"],
            $LitCal[$key]["type"],
            $LitCal[$key]["grade"],
            $LitCal[$key]["common"],
            $LitCal[$key]["liturgical_year"] ?? null,
            $LitCal[$key]["display_grade"]
        );
    }
}


/**************************
 * BEGIN DISPLAY LOGIC
 *************************/

?>
<!doctype html>

<head>
    <title><?php echo _("Generate Roman Calendar") ?></title>
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
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
</head>

<body>
    <div><a class="backNav" href="https://litcal<?php echo $stagingURL; ?>.johnromanodorazio.com/usage.php">↩      <?php echo _("Go back") ?>      ↩</a></div>

    <?php

    echo '<h1 style="text-align:center;">' . _("Liturgical Calendar Calculation for a Given Year") . ' (' . $litSettings->Year . ')</h1>';
    echo '<h2 style="text-align:center;">' . sprintf(_("HTML presentation elaborated by PHP using a CURL request to a %s"), "<a href=\"" . LITCAL_API_URL . "\">PHP engine</a>") . '</h2>';

    if ($litSettings->Year > 9999) {
        $litSettings->Year = 9999;
    }

    if ($litSettings->Year < 1970) {
        echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">';
        echo _('You are requesting a year prior to 1970: it is not possible to request years prior to 1970.');
        echo '</div>';
    }
    $c = $litSettings->Locale === 'la' ? new Collator('en') : new Collator($litSettings->Locale);
    $AllAvailableLocales = array_filter(ResourceBundle::getLocales(''), function ($value) {
        return strpos($value, 'POSIX') === false;
    });
    $AllAvailableLocales = array_reduce($AllAvailableLocales, function ($carry, $item) use ($litSettings) {
        if ($litSettings->Locale === 'la') {
            $carry[$item] = [ Locale::getDisplayName($item, 'en'), Locale::getDisplayName($item, 'en') ];
        } else {
            $carry[$item] = [ Locale::getDisplayName($item, $litSettings->Locale), Locale::getDisplayName($item, 'en') ];
        }
        return $carry;
    }, []);
    $AllAvailableLocales['la'] = [ 'Latin', 'Latin' ];
    $c->asort($AllAvailableLocales);
    echo '<form method="GET">';
    echo '<fieldset style="margin-bottom:6px;"><legend>' . _('Customize options for generating the Roman Calendar') . '</legend>';
    echo '<table style="width:100%;"><tr>';
    echo '<td><label>' . _('YEAR') . ': <input type="number" name="year" id="year" min="1970" max="9999" value="' . $litSettings->Year . '" /></label></td>';
    echo '<td><label>' . _('EPIPHANY') . ': <select name="epiphany" id="epiphany"><option value="JAN6" ' . ($litSettings->Epiphany === "JAN6" ? " selected" : "") . '>' . _('January 6') . '</option><option value="SUNDAY_JAN2_JAN8" ' . ($litSettings->Epiphany === "SUNDAY_JAN2_JAN8" ? " selected" : "") . '>' . _('Sunday between January 2 and January 8') . '</option></select></label></td>';
    echo '<td><label>' . _('ASCENSION') . ': <select name="ascension" id="ascension"><option value="THURSDAY" ' . ($litSettings->Ascension === "THURSDAY" ? " selected" : "") . '>' . _('Thursday') . '</option><option value="SUNDAY" ' . ($litSettings->Ascension === "SUNDAY" ? " selected" : "") . '>' . _('Sunday') . '</option></select></label></td>';
    echo '<td><label>' . _('CORPUS CHRISTI') . ': <select name="corpuschristi" id="corpuschristi"><option value="THURSDAY" ' . ($litSettings->CorpusChristi === "THURSDAY" ? " selected" : "") . '>' . _('Thursday') . '</option><option value="SUNDAY" ' . ($litSettings->CorpusChristi === "SUNDAY" ? " selected" : "") . '>' . _('Sunday') . '</option></select></label></td>';
    echo '<td><input type="hidden" value="' . $litSettings->Locale . '" /><label>' . _('LOCALE') . ': ';
    echo '<select name="locale" id="locale">';
    foreach ($AllAvailableLocales as $locale => $displayName) {
        echo "<option value=\"$locale\" title=\"" . $displayName[1] . "\"" . ($litSettings->Locale === $locale ? ' selected' : '') . ">" . $displayName[0] . "</option>";
    }
    echo '</select></label></td>';
    echo '</tr><tr>';
    echo '<td colspan="5" style="text-align:center;padding:18px;"><i>' . _('or') . '</i><br /><i>' . _("Choose the desired calendar from the list") . '</i></td>';
    echo '</tr><tr>';
    echo '<td colspan="5" style="text-align:center;"><label>' . _('NATION') . ': <select id="nationalcalendar" name="nationalcalendar">' . $nationalCalendarOptions . '</select></label>';
    echo '<label style="margin-left: 18px;">' . _('DIOCESE') . ': <select id="diocesancalendar" name="diocesancalendar"' . ($diocesesCount < 1 ? ' DISABLED' : '') . '>' . $diocesanCalendarOptions . '</select></label></td>';
    echo '</tr><tr>';
    echo '<td colspan="5" style="text-align:center;padding:15px;"><input type="SUBMIT" value="' . strtoupper(_("Generate Roman Calendar")) . '" /></td>';
    echo '</tr></table>';
    echo '</fieldset>';
    echo '</form>';

    echo '<div style="text-align:center;border:2px groove White;border-radius:6px;width:60%;margin:0px auto;padding-bottom:6px;">';

    echo '<h3>' . _('Configurations being used to generate this calendar:') . '</h3>';
    echo '<span>' . _('YEAR') . ' = ' . $litSettings->Year . ', ' . _('EPIPHANY') . ' = ' . $litSettings->Epiphany . ', ' . _('ASCENSION') . ' = ' . $litSettings->Ascension . ', ' . _('CORPUS CHRISTI') . ' = ' . $litSettings->CorpusChristi . ', ' . _('LOCALE') . ' = ' . $litSettings->Locale . '</span>';
    echo '<br /><span>' . _('NATION') . ' = ' . $litSettings->NationalCalendar . ', ' . _('DIOCESE') . ' = ' . $litSettings->DiocesanCalendar . '</span>';
    echo '</div>';

    if ($litSettings->Year >= 1970) {
        echo '<table id="LitCalTable">';
        echo '<thead><tr><th>' . _("Month") . '</th><th>' . _("Date in Gregorian Calendar") . '</th><th>' . _("General Roman Calendar Festivity") . '</th><th>' . _("Grade of the Festivity") . '</th></tr></thead>';
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
        echo '<table id="LitCalMessages"><thead><tr><th colspan=2 style="text-align:center;">' . _("Information about the current calculation of the Liturgical Year") . '</th></tr></thead>';
        echo '<tbody>';
        foreach ($LitCalData["messages"] as $idx => $message) {
            echo "<tr><td>{$idx}</td><td>{$message}</td></tr>";
        }
        echo '</tbody></table>';
    }

    ?>
</body>

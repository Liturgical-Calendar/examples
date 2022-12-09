<?php

/**
 * Liturgical Calendar display script using CURL and PHP
 * Author: John Romano D'Orazio 
 * Email: priest@johnromanodorazio.com
 * Licensed under the Apache 2.0 License
 * Version 2.3
 * Date Created: 27 December 2017
 */

ini_set('error_reporting', E_ALL);
ini_set("display_errors", 1);

include_once( 'includes/enums/LitLocale.php' );
include_once( 'includes/Festivity.php' );
include_once( 'includes/Functions.php' );
include_once( 'includes/LitSettings.php' );
include_once( 'includes/StatusCodes.php' );


$isStaging = ( strpos( $_SERVER['HTTP_HOST'], "-staging" ) !== false );
$stagingURL = $isStaging ? "-staging" : "";
$endpointV = $isStaging ? "dev" : "v3";
define("LITCAL_API_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/LitCalEngine.php");
define("METADATA_URL", "https://litcal.johnromanodorazio.com/api/{$endpointV}/LitCalMetadata.php");

$litSettings = new LitSettings( $_GET );

$nationalCalendarOptions = '<option value="">---</option>';
$diocesanCalendarOptions = '<option value="">---</option>';

$MetaData = retrieveMetadata();
if( $MetaData !== null ) {
    $litSettings->setMetaData( $MetaData, $stagingURL );
    $nations = getNationsIndex( $MetaData );
    $nationalCalendarOptions = buildNationOptions( $nations, $litSettings->NationalCalendar );
    [$diocesanCalendarOptions, $diocesesCount] = buildDioceseOptions( $MetaData, $litSettings->NationalCalendar, $litSettings->DiocesanCalendar );
} else {
    echo "There was an error retrieving the Metadata!";
    die();
}

$SUNDAY_CYCLE = ["A", "B", "C"];
$WEEKDAY_CYCLE = ["I", "II"];

if ($litSettings->YEAR >= 1970 && $litSettings->YEAR <= 9999) {

    $result = sendAPIRequest(prepareQueryData( $litSettings ));
    $LitCalData = json_decode($result, true);

    if( json_last_error() !== JSON_ERROR_NONE ) {
        echo "There was an error decoding the JSON data: " . json_last_error_msg() . PHP_EOL;
        echo "<pre>";
        var_dump($result);
        echo "</pre>";
        die();
    }

    $LitCal = array();
    if( isset( $LitCalData["LitCal"] ) ) {
        $LitCal = $LitCalData["LitCal"];
    } else {
        echo "We do not have enough information. Returned data has no LitCal property:" . PHP_EOL;
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
            $LitCal[$key]["liturgicalYear"] ?? null,
            $LitCal[$key]["displayGrade"]
        );
    }
}


/**************************
 * BEGIN DISPLAY LOGIC
 * 
 *************************/

?>
<!doctype html>

<head>
    <title><?php echo _("Generate Roman Calendar" ) ?></title>
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

    echo '<h1 style="text-align:center;">' . _( "Liturgical Calendar Calculation for a Given Year" ) . ' (' . $litSettings->YEAR . ')</h1>';
    echo '<h2 style="text-align:center;">' . sprintf(_( "HTML presentation elaborated by PHP using a CURL request to a %s" ), "<a href=\"" . LITCAL_API_URL ."\">PHP engine</a>") . '</h2>';

    if($litSettings->YEAR > 9999){
        $litSettings->YEAR = 9999;
    }
    
    if ($litSettings->YEAR < 1970) {
        echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">';
        echo _( 'You are requesting a year prior to 1970: it is not possible to request years prior to 1970.' );
        echo '</div>';
    }
    $c = new Collator($litSettings->LOCALE);
    $AllAvailableLocales = array_filter(ResourceBundle::getLocales(''), function ($value) {
        return strpos($value, 'POSIX') === false;
    });
    $AllAvailableLocales = array_reduce($AllAvailableLocales, function($carry, $item) use($litSettings) {
        $carry[$item] = [ Locale::getDisplayName($item, $litSettings->LOCALE), Locale::getDisplayName($item, 'en') ];
        return $carry;
    },[]);
    $AllAvailableLocales['la'] = [ 'Latin', 'Latin' ];
    $c->asort($AllAvailableLocales);
    echo '<form method="GET">';
    echo '<fieldset style="margin-bottom:6px;"><legend>' . _( 'Customize options for generating the Roman Calendar' ) . '</legend>';
    echo '<table style="width:100%;"><tr>';
    echo '<td><label>' . _( 'YEAR' ) . ': <input type="number" name="year" id="year" min="1970" max="9999" value="' . $litSettings->YEAR . '" /></label></td>';
    echo '<td><label>' . _( 'EPIPHANY' ) . ': <select name="epiphany" id="epiphany"><option value="JAN6" ' . ($litSettings->Epiphany === "JAN6" ? " SELECTED" : "") . '>'. _('January 6') . '</option><option value="SUNDAY_JAN2_JAN8" ' . ($litSettings->Epiphany === "SUNDAY_JAN2_JAN8" ? " SELECTED" : "") . '>' . _('Sunday between January 2 and January 8') . '</option></select></label></td>';
    echo '<td><label>' . _( 'ASCENSION' ) . ': <select name="ascension" id="ascension"><option value="THURSDAY" ' . ($litSettings->Ascension === "THURSDAY" ? " SELECTED" : "") . '>'. _('Thursday') . '</option><option value="SUNDAY" ' . ($litSettings->Ascension === "SUNDAY" ? " SELECTED" : "") . '>' . _('Sunday') . '</option></select></label></td>';
    echo '<td><label>' . _( 'CORPUS CHRISTI' ) . ': <select name="corpuschristi" id="corpuschristi"><option value="THURSDAY" ' . ($litSettings->CorpusChristi === "THURSDAY" ? " SELECTED" : "") . '>' . _('Thursday') . '</option><option value="SUNDAY" ' . ($litSettings->CorpusChristi === "SUNDAY" ? " SELECTED" : "") . '>' . _('Sunday') . '</option></select></label></td>';
    echo '<td><input type="hidden" value="' . $litSettings->LOCALE . '" /><label>' . _('LOCALE') . ': ';
    echo '<select name="locale" id="locale">';
    foreach( $AllAvailableLocales as $locale => $displayName ) {
        echo "<option value=\"$locale\" title=\"" . $displayName[1] . "\"" . ($litSettings->LOCALE === $locale ? ' SELECTED' : '') . ">" . $displayName[0] . "</option>";
    }
    echo '</select></label></td>';
    echo '</tr><tr>';
    echo '<td colspan="5" style="text-align:center;padding:18px;"><i>' . _( 'or' ) . '</i><br /><i>' . _("Choose the desired calendar from the list") . '</i></td>';
    echo '</tr><tr>';
    echo '<td colspan="5" style="text-align:center;"><label>NATION: <select id="nationalcalendar" name="nationalcalendar">' . $nationalCalendarOptions . '</select></label>';
    echo '<label style="margin-left: 18px;">DIOCESE: <select id="diocesancalendar" name="diocesancalendar"' . ($diocesesCount < 1 ? ' DISABLED' : '') . '>' . $diocesanCalendarOptions . '</select></label></td>';
    echo '</tr><tr>';
    echo '<td colspan="5" style="text-align:center;padding:15px;"><input type="SUBMIT" value="' . strtoupper(_( "Generate Roman Calendar" )) . '" /></td>';
    echo '</tr></table>';
    echo '</fieldset>';
    echo '</form>';

    echo '<div style="text-align:center;border:2px groove White;border-radius:6px;width:60%;margin:0px auto;padding-bottom:6px;">';

    echo '<h3>' . _( 'Configurations being used to generate this calendar:' ) . '</h3>';
    echo '<span>' . _( 'YEAR' ) . ' = ' . $litSettings->YEAR . ', ' . _('EPIPHANY' ) . ' = ' . $litSettings->Epiphany . ', ' . _('ASCENSION' ) . ' = ' . $litSettings->Ascension . ', CORPUS CHRISTI = ' . $litSettings->CorpusChristi . ', LOCALE = ' . $litSettings->LOCALE . '</span>';
    echo '<br /><span>' . _( 'NATION' ) . ' = ' . $litSettings->NationalCalendar . ', ' . _('DIOCESE' ) . ' = ' . $litSettings->DiocesanCalendar . '</span>';
    echo '</div>';

    if ($litSettings->YEAR >= 1970) {
        echo '<table id="LitCalTable">';
        echo '<thead><tr><th>' . _( "Month" ) . '</th><th>' . _( "Date in Gregorian Calendar" ) . '</th><th>' . _( "General Roman Calendar Festivity" ) . '</th><th>' . _( "Grade of the Festivity" ) . '</th></tr></thead>';
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
            if((int) $festivity->date->format('n') !== $currentMonth){
                $newMonth = true;
                $currentMonth = (int) $festivity->date->format('n');
                $cm = 0;
                countSameMonthEvents($keyindex, $LitCal, $cm);
            }

            //Let's check if we have more than one event on the same day, such as optional memorials...
            $cc = 0;
            countSameDayEvents($keyindex, $LitCal, $cc);
            if ($cc > 0) {

                for ($ev = 0; $ev <= $cc; $ev++) {
                    $keyname = $LitCalKeys[$keyindex];
                    $festivity = $LitCal[$keyname];
                    buildHTML( $festivity, $LitCal, $newMonth, $cc, $cm, $keyname, $litSettings->LOCALE, $ev );
                    $keyindex++;
                }
                $keyindex--;
            } else {
                buildHTML( $festivity, $LitCal, $newMonth, $cc, $cm, $keyname, $litSettings->LOCALE, null );
            }
        }

        echo '</tbody></table>';

        echo '<div style="text-align:center;border:3px ridge Green;background-color:LightBlue;width:75%;margin:10px auto;padding:10px;">' . $dayCnt . ' event days created</div>';
    }

    if (isset($LitCalData["Messages"]) && is_array($LitCalData["Messages"]) && count($LitCalData["Messages"]) > 0 ) {
        echo '<table id="LitCalMessages"><thead><tr><th colspan=2 style="text-align:center;">' . _( "Information about the current calculation of the Liturgical Year" ) . '</th></tr></thead>';
        echo '<tbody>';
        foreach($LitCalData["Messages"] as $idx => $message){
            echo "<tr><td>{$idx}</td><td>{$message}</td></tr>";
        }
        echo '</tbody></table>';
    }


    ?>
</body>

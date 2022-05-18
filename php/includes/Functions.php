<?php
include_once('includes/enums/LitColor.php');
include_once('includes/enums/LitGrade.php');
include_once('includes/enums/LitCommon.php');

$daysOfTheWeek = [
    "dies Solis",
    "dies Lunæ",
    "dies Martis",
    "dies Mercurii",
    "dies Iovis",
    "dies Veneris",
    "dies Saturni"
];

$months = [
    "",
    "Ianuarius",
    "Februarius",
    "Martius",
    "Aprilis",
    "Maius",
    "Iunius",
    "Iulius",
    "Augustus",
    "September",
    "October",
    "November",
    "December"
];

/**************************
 * UTILITY FUNCTIONS
 *************************/

function countSameDayEvents( $currentKeyIndex, $EventsArray, &$cc ) {
    $Keys = array_keys($EventsArray);
    $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
    if ($currentKeyIndex < count($Keys) - 1) {
        $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
        if ($nextFestivity->date == $currentFestivity->date) {
            $cc++;
            countSameDayEvents($currentKeyIndex + 1, $EventsArray, $cc);
        }
    }
}

function countSameMonthEvents( $currentKeyIndex, $EventsArray, &$cm ) {
    $Keys = array_keys($EventsArray);
    $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
    if ($currentKeyIndex < count($Keys) - 1) {
        $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
        if ($nextFestivity->date->format('n') == $currentFestivity->date->format('n')) {
            $cm++;
            countSameMonthEvents($currentKeyIndex + 1, $EventsArray, $cm);
        }
    }
}

function retrieveMetadata() {
    $metadata = null;
    $ch = curl_init();
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    curl_setopt( $ch, CURLOPT_URL, METADATA_URL );
    curl_setopt( $ch, CURLOPT_HTTPHEADER, ['Accept: application/json'] );
    $metadataRaw = curl_exec( $ch );
    if( $metadataRaw !== false ){
        $metadata = json_decode( $metadataRaw, true );
    }
    curl_close( $ch );
    return $metadata["LitCalMetadata"];
}

function sendAPIRequest( $queryData ) {

    $ch = curl_init();
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    curl_setopt( $ch, CURLOPT_URL, LITCAL_API_URL );
    curl_setopt( $ch, CURLOPT_HTTPHEADER, ['Accept: application/json'] );
    curl_setopt( $ch, CURLOPT_POST, 1 );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query( $queryData ) );

    $result = curl_exec($ch);

    if (curl_errno($ch)) {
        die("Could not send request. Curl error: " . curl_error($ch));
    } else {
        $resultStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($resultStatus != 200) {
            header('Content-Type: text/html');
            $htmlBody = "<body style=\"background-color:pink;color:darkred;\">";
            $htmlBody .= "<div style=\"text-align:center;padding: 20px;margin: 20px auto;\">";
            $htmlBody .= "<h1>Request failed.</h1>";
            $htmlBody .= "<h2>" . StatusCodes::getMessageForCode($resultStatus) . "</h2>";
            $htmlBody .= "<p>$result</p>";
            $htmlBody .= "</div></body>";
            die($htmlBody);
        }
    }

    curl_close($ch);
    return $result;

}

function getNationsIndex( $MetaData ) {
    $nations = [];
    if( $MetaData !== null ) {
        $nations = array_column($MetaData["DiocesanCalendars"], "nation");
    }
    foreach( array_keys($MetaData["NationalCalendars"]) as $key ) {
        if( !in_array( $key, $nations ) ) {
            array_push( $nations, $key );
        }
    }
    return array_unique( $nations, SORT_STRING );
}

function buildDioceseOptions( $MetaData, $NATION, $DIOCESE ) {
    $options = '<option value=""></option>';
    if( $MetaData !== null ) {
        foreach( $MetaData["DiocesanCalendars"] as $key => $value ){
            if( $value['nation'] === $NATION ) {
                $options .= "<option value='{$key}'" . ( $DIOCESE === $key ? ' SELECTED' : '' ) . ">{$value['diocese']}</option>";
            }
        }
    }
    return $options;
}

function buildNationOptions( $nations, $NATION ) {
    $options = '<option value="">---</option>';
    foreach( $nations as $nationVal ) {
        $options .= "<option value='{$nationVal}'" . ($nationVal === $NATION ? ' SELECTED' : '') . ">$nationVal</option>";
    }
    return $options;
}

function prepareQueryData( $litSettings ) {
    $queryData = [
        "year"          => $litSettings->YEAR,
        "epiphany"      => $litSettings->Epiphany,
        "ascension"     => $litSettings->Ascension,
        "corpuschristi" => $litSettings->CorpusChristi,
        "locale"        => $litSettings->LOCALE
    ];
    if( $litSettings->NationalCalendar !== null ) {
        $queryData["nationalcalendar"] = $litSettings->NationalCalendar;
    }
    if( $litSettings->DiocesanCalendar !== null ) {
        $queryData["diocesancalendar"] = $litSettings->DiocesanCalendar;
    }
    return $queryData;
}

function getSeasonColor( $festivity, $LitCal ) {
    $SeasonColor = "green";
    if (($festivity->date > $LitCal["Advent1"]->date  && $festivity->date < $LitCal["Christmas"]->date) || ($festivity->date > $LitCal["AshWednesday"]->date && $festivity->date < $LitCal["Easter"]->date)) {
        $SeasonColor = "purple";
    } else if ($festivity->date > $LitCal["Easter"]->date && $festivity->date < $LitCal["Pentecost"]->date) {
        $SeasonColor = "white";
    } else if ($festivity->date > $LitCal["Christmas"]->date || $festivity->date < $LitCal["BaptismLord"]->date) {
        $SeasonColor = "white";
    }
    return $SeasonColor;
}

function processColors( $festivity, $locale ) {
    //We will apply the color for the single festivity only to it's own table cells
    $possibleColors = is_string( $festivity->color ) ? explode(",", $festivity->color) : $festivity->color;
    $CSScolor = $possibleColors[0];
    $festivityColorString = "";
    if(count($possibleColors) === 1){
        $festivityColorString = LitColor::i18n( $possibleColors[0], $locale );
    } else if (count($possibleColors) > 1){
        $possibleColors = array_map(function($txt) use ($locale){
            return LitColor::i18n( $txt, $locale );
        }, $possibleColors);
        $festivityColorString = implode("</i> " . _( "or" ) . " <i>", $possibleColors);
    }
    return [ $CSScolor, $festivityColorString ];
}

function buildHTML( $festivity, $LitCal, &$newMonth, $cc, $cm, $keyname, $locale, $ev = null ) {
    global $daysOfTheWeek;
    global $months;
    $monthFmt = IntlDateFormatter::create($locale, IntlDateFormatter::FULL, IntlDateFormatter::FULL, 'UTC', IntlDateFormatter::GREGORIAN, 'MMMM' );
    $dateFmt  = IntlDateFormatter::create($locale, IntlDateFormatter::FULL, IntlDateFormatter::FULL, 'UTC', IntlDateFormatter::GREGORIAN, 'EEEE d MMMM yyyy');
    
    $litGrade = new LitGrade( $locale );
    $litCommon = new LitCommon( $locale );
    $festivity->common = $litCommon->C( $festivity->common );
    $highContrast = ['purple', 'red', 'green'];
    $SeasonColor = getSeasonColor( $festivity, $LitCal );
    [ $CSScolor, $festivityColorString ] = processColors( $festivity, $locale );

    echo '<tr style="background-color:' . $SeasonColor . ';' . (in_array($SeasonColor, $highContrast) ? 'color:white;' : '') . '">';
    if($newMonth){
        $monthRwsp = $cm + 1;
        echo '<td class="rotate" rowspan = "' . $monthRwsp . '"><div>' . ($locale === LitLocale::LATIN ? strtoupper( $months[ (int)$festivity->date->format('n') ] ) : strtoupper( $monthFmt->format( $festivity->date->format('U') ) ) ) . '</div></td>';
        $newMonth = false;
    }
    $dateString = "";
    $displayGrade = "";
    if($keyname === 'AllSouls'){
        $displayGrade = _( "COMMEMORATION" );
    }
    else if((int)$festivity->date->format('N') !== 7){
        $displayGrade = $litGrade->i18n( $festivity->grade );
    }
    switch ($locale) {
        case LitLocale::LATIN:
            $dayOfTheWeek = (int)$festivity->date->format('w'); //w = 0-Sunday to 6-Saturday
            $dayOfTheWeekLatin = $daysOfTheWeek[$dayOfTheWeek];
            $month = (int)$festivity->date->format('n'); //n = 1-January to 12-December
            $monthLatin = $months[$month];
            $dateString = $dayOfTheWeekLatin . ' ' . $festivity->date->format('j') . ' ' . $monthLatin . ' ' . $festivity->date->format('Y');
            break;
        case LitLocale::ENGLISH:
            $dateString = $festivity->date->format('D, F jS, Y'); // G:i:s e') . "offset = " . $festivity->hourOffset;
            break;
        default:
            $dateString = $dateFmt->format( $festivity->date->format('U') );
    }
    if( $ev === null ) {
        echo '<td class="dateEntry">' . $dateString . '</td>';
    }
    else if ($ev === 0) {
        echo '<td class="dateEntry" rowspan="' . ($cc + 1) . '">' . $dateString . '</td>';
    }
    $currentCycle = property_exists($festivity, "liturgicalYear") && $festivity->liturgicalYear !== null && $festivity->liturgicalYear !== "" ? " (" . $festivity->liturgicalYear . ")" : "";
    $festivityCommonStr = is_array( $festivity->common ) ? implode( ', ', $festivity->common ) : $festivity->common;
    echo '<td style="background-color:' . $CSScolor . ';' . (in_array($CSScolor, $highContrast) ? 'color:white;' : 'color:black;') . '">' . $festivity->name . $currentCycle . ' - <i>' . $festivityColorString . '</i><br /><i>' . $festivityCommonStr . '</i></td>';
    echo '<td style="background-color:' . $CSScolor . ';' . (in_array($CSScolor, $highContrast) ? 'color:white;' : 'color:black;') . '">' . $displayGrade . '</td>';
    echo '</tr>';


    //echo '<td>' . $festivity->name . $currentCycle . ' - <i>' . $festivityColorString . '</i><br /><i>' . $festivity->common . '</i></td>';
    //echo '<td>' . $displayGrade . '</td>';

}

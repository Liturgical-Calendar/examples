<?php

namespace LiturgicalCalendar\Examples\Php;

use LiturgicalCalendar\Examples\Php\Enums\LitLocale;
use LiturgicalCalendar\Examples\Php\Enums\StatusCode;

class Utilities
{
    public const DAYS_OF_THE_WEEK_LATIN = [
        "dies Solis",
        "dies Lunæ",
        "dies Martis",
        "dies Mercurii",
        "dies Iovis",
        "dies Veneris",
        "dies Saturni"
    ];

    public const MONTHS_LATIN = [
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

    /**
     * Recursively counts the number of subsequent festivities in the same day.
     *
     * @param int $currentKeyIndex The current position in the array of festivities.
     * @param array $EventsArray The array of festivities.
     * @param int $cc [reference] The count of subsequent festivities in the same day.
     */
    public static function countSameDayEvents($currentKeyIndex, $EventsArray, &$cc)
    {
        $Keys = array_keys($EventsArray);
        $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
        if ($currentKeyIndex < count($Keys) - 1) {
            $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
            if ($nextFestivity->date == $currentFestivity->date) {
                $cc++;
                self::countSameDayEvents($currentKeyIndex + 1, $EventsArray, $cc);
            }
        }
    }

    /**
     * Counts the number of subsequent festivities in the same month.
     *
     * @param int $currentKeyIndex
     * @param array $EventsArray
     * @param int $cm
     */
    public static function countSameMonthEvents($currentKeyIndex, $EventsArray, &$cm)
    {
        $Keys = array_keys($EventsArray);
        $currentFestivity = $EventsArray[$Keys[$currentKeyIndex]];
        if ($currentKeyIndex < count($Keys) - 1) {
            $nextFestivity = $EventsArray[$Keys[$currentKeyIndex + 1]];
            if ($nextFestivity->date->format('n') == $currentFestivity->date->format('n')) {
                $cm++;
                self::countSameMonthEvents($currentKeyIndex + 1, $EventsArray, $cm);
            }
        }
    }

    /**
     * Retrieve the metadata from the liturgical calendar API, if available.
     * @return array|null the metadata array, or null if it cannot be retrieved
     */
    public static function retrieveMetadata()
    {
        $metadata = null;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_URL, METADATA_URL);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
        $metadataRaw = curl_exec($ch);
        if ($metadataRaw !== false) {
            $metadata = json_decode($metadataRaw, true);
        }
        curl_close($ch);
        return $metadata !== null ? $metadata["litcal_metadata"] : null;
    }

    /**
     * Sends an API request to the Liturgical Calendar service using the provided query data.
     *
     * Constructs the request URL based on the provided query parameters, which may include
     * diocesan or national calendar identifiers, locale, and year. The request is sent as a POST
     * request with the remaining query data as the request body.
     *
     * If a diocesan calendar is specified, the request targets the diocesan endpoint; otherwise,
     * if a national calendar is specified, it targets the national endpoint. If a locale is
     * specified, it adds the corresponding Accept-Language header. If a year is specified, it
     * appends the year to the URL.
     *
     * @param array $queryData An associative array containing query parameters for the API request.
     * @return string The response from the API request.
     * @throws Exception If the request fails or the HTTP response status is not 200.
     */
    public static function sendAPIRequest($queryData)
    {
        $url = LITCAL_API_URL;
        $headers = ['Accept: application/json'];
        if (isset($queryData["diocesan_calendar"])) {
            $url = LITCAL_API_URL . "/diocese/" . $queryData["diocesan_calendar"];
            unset($queryData["diocesan_calendar"]);
            unset($queryData["national_calendar"]);
        } elseif (isset($queryData["national_calendar"])) {
            $url = LITCAL_API_URL . "/nation/" . $queryData["national_calendar"];
            unset($queryData["national_calendar"]);
        } elseif (isset($queryData["locale"])) {
            $headers[] = 'Accept-Language: ' . $queryData["locale"];
            unset($queryData["locale"]);
        }
        if (isset($queryData["year"])) {
            $url .= "/" . $queryData["year"];
            unset($queryData["year"]);
        }
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($queryData));
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
                $htmlBody .= "<h2>" . StatusCode::getMessageForCode($resultStatus) . "</h2>";
                $htmlBody .= "<p>$result</p>";
                $htmlBody .= "</div></body>";
                die($htmlBody);
            }
        }

        curl_close($ch);
        return $result;
    }


    /**
     * Generates an HTML string for a dropdown list of options for selecting a diocese based on the given list of diocesan calendars.
     *
     * @param array $MetaData A list of metadata about the diocesan calendars available.
     * @param string $NATION The currently selected nation.
     * @param string $DIOCESE The currently selected diocese.
     *
     * @return array A list containing the HTML string for the dropdown options and the number of options that were generated.
     */
    public static function buildDioceseOptions($MetaData, $NATION, $DIOCESE)
    {
        $options = '<option value=""></option>';
        $i = 0;
        if ($MetaData !== null) {
            foreach ($MetaData["diocesan_calendars"] as $diocesanCalendar) {
                if ($diocesanCalendar['nation'] === $NATION) {
                    $options .= "<option value='{$diocesanCalendar['calendar_id']}'" . ( $DIOCESE === $diocesanCalendar['calendar_id'] ? ' selected' : '' ) . ">{$diocesanCalendar['diocese']}</option>";
                    ++$i;
                }
            }
        }
        return [$options, $i ];
    }

    /**
     * Generates an HTML string for a dropdown list of options for selecting a nation based on the given list of nation codes.
     *
     * @param array $nations A list of 2-letter nation codes to include in the dropdown.
     * @param string|null $NATION The currently selected nation.
     * @param string $locale The locale to use for displaying the nation names.
     *
     * @return string An HTML string for a dropdown list of options.
     */
    public static function buildNationOptions(array $nations, ?string $NATION, string $locale)
    {
        $options = '<option value="">---</option>';
        foreach ($nations as $nationVal) {
            $countryName = \Locale::getDisplayRegion("-{$nationVal}", $locale);
            $options .= "<option value='{$nationVal}'" . ($nationVal === $NATION ? ' selected' : '') . ">$countryName</option>";
        }
        $options .= "<!-- current selected nation is {$NATION} -->";
        return $options;
    }

    /**
     * Prepares query data for sending API requests based on the given liturgical settings.
     *
     * @param LitSettings $litSettings An instance of LitSettings containing the necessary configuration.
     *
     * @return array An associative array containing query parameters such as year, epiphany, ascension,
     *               corpus christi, eternal high priest, year type, locale, and optionally national and diocesan calendars.
     */
    public static function prepareQueryData($litSettings)
    {
        $queryData = [
            "year"           => $litSettings->Year,
            "epiphany"       => $litSettings->Epiphany,
            "ascension"      => $litSettings->Ascension,
            "corpus_christi" => $litSettings->CorpusChristi,
            "eternal_high_priest" => ($litSettings->EternalHighPriest ? 'true' : 'false'),
            "year_type"      => $litSettings->YearType,
            "locale"         => $litSettings->Locale
        ];
        if ($litSettings->NationalCalendar !== null) {
            $queryData["national_calendar"] = $litSettings->NationalCalendar;
        }
        if ($litSettings->DiocesanCalendar !== null) {
            $queryData["diocesan_calendar"] = $litSettings->DiocesanCalendar;
        }
        return $queryData;
    }

    /**
     * Determines the liturgical color for the Liturgical Season, to apply to liturgical events within that season.
     *
     * @param Festivity $festivity The festivity for which the color is determined.
     * @param array $LitCal The liturgical calendar containing key events and their dates.
     * @return string The color representing the liturgical season (e.g., "green", "purple", "white").
     */
    public static function getSeasonColor($festivity, $LitCal)
    {
        $SeasonColor = "green";
        if (($festivity->date > $LitCal["Advent1"]->date  && $festivity->date < $LitCal["Christmas"]->date) || ($festivity->date > $LitCal["AshWednesday"]->date && $festivity->date < $LitCal["Easter"]->date)) {
            $SeasonColor = "purple";
        } elseif ($festivity->date > $LitCal["Easter"]->date && $festivity->date < $LitCal["Pentecost"]->date) {
            $SeasonColor = "white";
        } elseif ($festivity->date > $LitCal["Christmas"]->date || $festivity->date < $LitCal["BaptismLord"]->date) {
            $SeasonColor = "white";
        }
        return $SeasonColor;
    }

    /**
     * Outputs a table row for the given festivity from the requested Liturgical Calendar
     *
     * @param Festivity $festivity The festivity to display
     * @param array $LitCal The Liturgical Calendar
     * @param bool $newMonth Whether we are starting a new month
     * @param int $cc Count of Celebrations on the same day
     * @param int $cm Count of Celebrations on the same month
     * @param string $locale The locale to use for date and month formatting
     * @param int $ev Whether we need to set the rowspan based on the number of liturgical events within the same day. If null, we are displaying only a single liturgical event and we do not need to set rowspan, otherwise we set the rowspan on the the first liturgical event based on how many liturgical events there are in the given day.
     */
    public static function buildHTML($festivity, $LitCal, &$newMonth, $cc, $cm, $locale, $ev = null)
    {
        $monthFmt = \IntlDateFormatter::create($locale, \IntlDateFormatter::FULL, \IntlDateFormatter::FULL, 'UTC', \IntlDateFormatter::GREGORIAN, 'MMMM');
        $dateFmt  = \IntlDateFormatter::create($locale, \IntlDateFormatter::FULL, \IntlDateFormatter::FULL, 'UTC', \IntlDateFormatter::GREGORIAN, 'EEEE d MMMM yyyy');
        $highContrast = ['purple', 'red', 'green'];
        $SeasonColor = self::getSeasonColor($festivity, $LitCal);
        echo '<tr style="background-color:' . $SeasonColor . ';' . (in_array($SeasonColor, $highContrast) ? 'color:white;' : '') . '">';
        if ($newMonth) {
            $monthRwsp = $cm + 1;
            echo '<td class="rotate" rowspan = "' . $monthRwsp . '"><div>' . ($locale === LitLocale::LATIN || $locale === LitLocale::LATIN_PRIMARY_LANGUAGE ? strtoupper(self::MONTHS_LATIN[ (int)$festivity->date->format('n') ]) : strtoupper($monthFmt->format($festivity->date->format('U'))) ) . '</div></td>';
            $newMonth = false;
        }
        $dateString = "";
        switch (explode('_', $locale)[0]) {
            case LitLocale::LATIN_PRIMARY_LANGUAGE:
                $dayOfTheWeek = (int)$festivity->date->format('w'); //w = 0-Sunday to 6-Saturday
                $dayOfTheWeekLatin = self::DAYS_OF_THE_WEEK_LATIN[$dayOfTheWeek];
                $month = (int)$festivity->date->format('n'); //n = 1-January to 12-December
                $monthLatin = self::MONTHS_LATIN[$month];
                $dateString = $dayOfTheWeekLatin . ' ' . $festivity->date->format('j') . ' ' . $monthLatin . ' ' . $festivity->date->format('Y');
                break;
            case 'en':
                $dateString = $festivity->date->format('D, F jS, Y');
                break;
            default:
                $dateString = $dateFmt->format($festivity->date->format('U'));
        }
        if ($ev === null) {
            echo '<td class="dateEntry">' . $dateString . '</td>';
        } elseif ($ev === 0) {
            echo '<td class="dateEntry" rowspan="' . ($cc + 1) . '">' . $dateString . '</td>';
        }
        $currentCycle = property_exists($festivity, "liturgical_year") && $festivity->liturgical_year !== null && $festivity->liturgical_year !== "" ? " (" . $festivity->liturgical_year . ")" : "";
        echo '<td style="background-color:' . $festivity->color[0] . ';' . (in_array($festivity->color[0], $highContrast) ? 'color:white;' : 'color:black;') . '">' . $festivity->name . $currentCycle . ' - <i>' . implode(' ' . dgettext('litexmplphp', 'or') . ' ', $festivity->color_lcl) . '</i><br /><i>' . $festivity->common_lcl . '</i></td>';
        echo '<td style="background-color:' . $festivity->color[0] . ';' . (in_array($festivity->color[0], $highContrast) ? 'color:white;' : 'color:black;') . '">' . ($festivity->display_grade !== '' ? $festivity->display_grade : $festivity->grade_lcl) . '</td>';
        echo '</tr>';
    }

    /**
     * Function called after a successful installation of the Catholic Liturgical Calendar examples.
     * It prints a message of thanksgiving to God and a prayer for the Pope.
     *
     * @return void
     */
    public static function postInstall(): void
    {
        printf("\t\033[4m\033[1;44mCatholic Liturgical Calendar components\033[0m\n");
        printf("\t\033[0;33mAd Majorem Dei Gloriam\033[0m\n");
        printf("\t\033[0;36mOremus pro Pontifice nostro Francisco Dominus\n\tconservet eum et vivificet eum et beatum faciat eum in terra\n\tet non tradat eum in animam inimicorum ejus\033[0m\n");
    }
}

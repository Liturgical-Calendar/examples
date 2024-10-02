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

    public static function sendAPIRequest($queryData)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_URL, LITCAL_API_URL);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
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

    public static function buildNationOptions(array $nations, ?string $NATION, string $locale)
    {
        $options = '<option value="">---</option>';
        foreach ($nations as $nationVal) {
            $countryName = \Locale::getDisplayRegion("-{$nationVal}", $locale);
            $options .= "<option value='{$nationVal}'" . ($nationVal === $NATION ? ' selected' : '') . ">$countryName</option>";
        }
        return $options;
    }

    public static function prepareQueryData($litSettings)
    {
        $queryData = [
            "year"           => $litSettings->Year,
            "epiphany"       => $litSettings->Epiphany,
            "ascension"      => $litSettings->Ascension,
            "corpus_christi" => $litSettings->CorpusChristi,
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
        echo '<td style="background-color:' . $festivity->color[0] . ';' . (in_array($festivity->color[0], $highContrast) ? 'color:white;' : 'color:black;') . '">' . $festivity->name . $currentCycle . ' - <i>' . implode(' ' . _('or') . ' ', $festivity->color_lcl) . '</i><br /><i>' . $festivity->common_lcl . '</i></td>';
        echo '<td style="background-color:' . $festivity->color[0] . ';' . (in_array($festivity->color[0], $highContrast) ? 'color:white;' : 'color:black;') . '">' . ($festivity->display_grade !== '' ? $festivity->display_grade : $festivity->grade_lcl) . '</td>';
        echo '</tr>';
    }

    public static function postInstall(): void
    {
        printf("\t\033[4m\033[1;44mCatholic Liturgical Calendar components\033[0m\n");
        printf("\t\033[0;33mAd Majorem Dei Gloriam\033[0m\n");
        printf("\t\033[0;36mOremus pro Pontifice nostro Francisco Dominus\n\tconservet eum et vivificet eum et beatum faciat eum in terra\n\tet non tradat eum in animam inimicorum ejus\033[0m\n");
    }
}

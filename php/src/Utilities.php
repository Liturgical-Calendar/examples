<?php

namespace LiturgicalCalendar\Examples\Php;

use LiturgicalCalendar\Examples\Php\Enums\StatusCode;
use LiturgicalCalendar\Examples\Php\LitSettings;

class Utilities
{
    private static array $requestData    = [];
    private static array $requestHeaders = [];
    private static string $requestUrl    = "";

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
    public static function sendAPIRequest(array $queryData)
    {
        $url = LITCAL_API_URL;
        $headers = ['Accept: application/json'];
        if (isset($queryData["diocesan_calendar"])) {
            $url .= "/diocese/" . $queryData["diocesan_calendar"];
            unset($queryData["diocesan_calendar"]);
            unset($queryData["national_calendar"]);
        } elseif (isset($queryData["national_calendar"])) {
            $url .= "/nation/" . $queryData["national_calendar"];
            unset($queryData["national_calendar"]);
        }
        if (isset($queryData["locale"])) {
            $headers[] = 'Accept-Language: ' . $queryData["locale"];
            unset($queryData["locale"]);
        }
        if (isset($queryData["year"])) {
            $url .= "/" . $queryData["year"];
            unset($queryData["year"]);
        }
        self::$requestData = $queryData;
        self::$requestHeaders = $headers;
        self::$requestUrl = $url;
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
                $htmlBody = "<div style=\"text-align:center;padding: 20px;margin: 20px auto;background-color:pink;color:darkred;\">";
                $htmlBody .= "<h1>Request failed.</h1>";
                $htmlBody .= "<h2>" . StatusCode::getMessageForCode($resultStatus) . "</h2>";
                $htmlBody .= "<p>$result</p>";
                $htmlBody .= '<h3><b>Request URL</b></h3>';
                $htmlBody .= '<div class="col-12">' . self::$requestUrl . '</div>';
                $htmlBody .= '<h3><b>Request Data</b></h3>';
                foreach (self::$requestData as $key => $value) {
                    $htmlBody .= '<div class="col-2"><b>' . $key . '</b>: ' . ($value === null || empty($value) ? 'null' : $value) . '</div>';
                }
                $htmlBody .= '<h3><b>Request Headers</b></h3>';
                foreach (self::$requestHeaders as $key => $value) {
                    $htmlBody .= '<div class="col-2"><b>' . $key . '</b>: ' . $value . '</div>';
                }
                $htmlBody .= "</div>";
                die($htmlBody);
            }
        }

        curl_close($ch);
        return $result;
    }


    /**
     * Prepares query data for sending API requests based on the given liturgical settings.
     *
     * @param LitSettings $litSettings An instance of LitSettings containing the necessary configuration.
     *
     * @return array An associative array containing query parameters such as year, epiphany, ascension,
     *               corpus christi, eternal high priest, year type, locale, and optionally national and diocesan calendars.
     */
    public static function prepareQueryData(LitSettings $litSettings)
    {
        $queryData = [
            "year"           => $litSettings->Year,
            "year_type"      => $litSettings->YearType,
            "locale"         => $litSettings->Locale
        ];
        // If no national or diocesan calendar is selected, use the form selected values for Epiphany, Ascension, Corpus Christi, and Eternal High Priest
        // (if a national or diocesan calendar is selected, these values are not required, because they are built into the calendar)
        if ($litSettings->NationalCalendar === null && $litSettings->DiocesanCalendar === null) {
            $queryData = array_merge($queryData, [
                "epiphany"       => $litSettings->Epiphany,
                "ascension"      => $litSettings->Ascension,
                "corpus_christi" => $litSettings->CorpusChristi,
                "eternal_high_priest" => ($litSettings->EternalHighPriest ? 'true' : 'false'),
            ]);
        }
        if ($litSettings->NationalCalendar !== null) {
            $queryData["national_calendar"] = $litSettings->NationalCalendar;
        }
        if ($litSettings->DiocesanCalendar !== null) {
            $queryData["diocesan_calendar"] = $litSettings->DiocesanCalendar;
        }
        return $queryData;
    }


    /**
     * Retrieves the request data last sent in an API request.
     *
     * @return array The request data.
     */
    public static function getRequestData(): array
    {
        return self::$requestData;
    }

    /**
     * Retrieves the HTTP headers sent in the last API request.
     *
     * @return array An array of HTTP headers.
     */
    public static function getRequestHeaders(): array
    {
        return self::$requestHeaders;
    }

    /**
     * Retrieves the URL of the last API request.
     *
     * @return string The URL of the last API request.
     */
    public static function getRequestUrl(): string
    {
        return self::$requestUrl;
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

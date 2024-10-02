<?php

namespace LiturgicalCalendar\Examples\Php;

use LiturgicalCalendar\Examples\Php\Enums\Epiphany;
use LiturgicalCalendar\Examples\Php\Enums\Ascension;
use LiturgicalCalendar\Examples\Php\Enums\CorpusChristi;
use LiturgicalCalendar\Examples\Php\Enums\LitLocale;

class LitSettings
{
    public int $Year;
    public string $Epiphany          = Epiphany::JAN6;
    public string $Ascension         = Ascension::THURSDAY;
    public string $CorpusChristi     = CorpusChristi::THURSDAY;
    public ?string $Locale           = null;
    public ?string $NationalCalendar = null;
    public ?string $DiocesanCalendar = null;
    private array $MetaData          = [];

    private const ALLOWED_PARAMS  = [
        "year",
        "epiphany",
        "ascension",
        "corpus_christi",
        "locale",
        "national_calendar",
        "diocesan_calendar"
    ];

    //If we can get more data from 1582 (year of the Gregorian reform) to 1969
    // perhaps we can lower the limit to the year of the Gregorian reform
    //For now we'll just deal with the Liturgical Calendar from the Editio Typica 1970
    //const YEAR_LOWER_LIMIT          = 1583;
    private const YEAR_LOWER_LIMIT          = 1970;

    //The upper limit is determined by the limit of PHP in dealing with DateTime objects
    private const YEAR_UPPER_LIMIT          = 9999;

    private function setVars(array $DATA)
    {
        //set values based on the GET global variable
        foreach ($DATA as $key => $value) {
            $key = strtoupper($key);
            if (in_array($key, self::ALLOWED_PARAMS)) {
                switch ($key) {
                    case "year":
                        if (gettype($value) === 'string') {
                            if (is_numeric($value) && ctype_digit($value) && strlen($value) === 4) {
                                $value = (int)$value;
                                if ($value >= self::YEAR_LOWER_LIMIT && $value <= self::YEAR_UPPER_LIMIT) {
                                    $this->Year = $value;
                                }
                            }
                        } elseif (gettype($value) === 'integer') {
                            if ($value >= self::YEAR_LOWER_LIMIT && $value <= self::YEAR_UPPER_LIMIT) {
                                $this->Year = $value;
                            }
                        }
                        break;
                    case "epiphany":
                        $this->Epiphany      = Epiphany::isValid(strtoupper($value))      ? strtoupper($value) : Epiphany::JAN6;
                        break;
                    case "ascension":
                        $this->Ascension     = Ascension::isValid(strtoupper($value))     ? strtoupper($value) : Ascension::THURSDAY;
                        break;
                    case "corpus_christi":
                        $this->CorpusChristi = CorpusChristi::isValid(strtoupper($value)) ? strtoupper($value) : CorpusChristi::THURSDAY;
                        break;
                    case "locale":
                        $this->Locale        = LitLocale::isValid($value)                 ? $value             : LitLocale::LATIN;
                        if (strpos($this->Locale, '_') === false) {
                            $this->Locale = strtolower($this->Locale);
                        }
                        break;
                    case "national_calendar":
                        $this->NationalCalendar = $value !== ""                           ? strtoupper($value) : null;
                        break;
                    case "diocesan_calendar":
                        $this->DiocesanCalendar = $value !== ""                           ? strtoupper($value) : null;
                }
            }
        }
    }

    public function __construct(array $DATA)
    {
        //set a few default values
        $this->Year = (int)date("Y");

        if (!empty($_COOKIE["currentLocale"])) {
            $this->Locale = $_COOKIE["currentLocale"];
        } elseif (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            $this->Locale = \Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        } else {
            $this->Locale = LitLocale::LATIN;
        }
        if (strpos($this->Locale, '_') === false) {
            $this->Locale = strtolower($this->Locale);
        }

        $this->setVars($DATA);
    }

    private function updateSettingsByNation(string $stagingURL)
    {
        $NationalCalendarMetadata = null;
        if ($this->NationalCalendar !== null && $this->NationalCalendar !== "VA") {
            $NationalCalendarMetadata = array_values(array_filter($this->MetaData["national_calendars"], fn ($calendar) => $calendar["calendar_id"] === $this->NationalCalendar))[0];
        }
        switch ($this->NationalCalendar) {
            case "VA":
            case null:
                $this->Epiphany         = Epiphany::JAN6;
                $this->Ascension        = Ascension::THURSDAY;
                $this->CorpusChristi    = CorpusChristi::THURSDAY;
                $this->Locale           = LitLocale::LATIN;
                break;
            default:
                $this->Epiphany         = $NationalCalendarMetadata["settings"]["epiphany"];
                $this->Ascension        = $NationalCalendarMetadata["settings"]["ascension"];
                $this->CorpusChristi    = $NationalCalendarMetadata["settings"]["corpus_christi"];
                $this->Locale           = $NationalCalendarMetadata["settings"]["locale"];
                break;
        }
        $baseLocale = strtolower(explode('_', $this->Locale)[0]);
        $localeArray = [
            $this->Locale . '.utf8',
            $this->Locale . '.UTF-8',
            $this->Locale,
            $baseLocale . '_' . strtoupper($baseLocale) . '.utf8',
            $baseLocale . '_' . strtoupper($baseLocale) . '.UTF-8',
            $baseLocale . '_' . strtoupper($baseLocale),
            $baseLocale . '.utf8',
            $baseLocale . '.UTF-8',
            $baseLocale
        ];
        setlocale(LC_ALL, $localeArray);
        bindtextdomain("litcal", "i18n");
        textdomain("litcal");
        ini_set('date.timezone', 'Europe/Vatican');
        if (!isset($_COOKIE["currentLocale"]) || $_COOKIE["currentLocale"] !== $this->Locale) {
            setcookie(
                "currentLocale",                                //name
                $this->Locale,                                  //value
                time() + 60 * 60 * 24 * 40,                     //expire in 30 days
                "/examples/",                                   //path
                "litcal{$stagingURL}.johnromanodorazio.com",    //domain
                true,                                           //https only
                false                                           //httponly (if true, cookie won't be available to javascript)
            );
        }
    }

    public function setMetaData(array $MetaData, string $stagingURL)
    {
        $this->MetaData = $MetaData;
        if ($this->DiocesanCalendar !== null) {
            $this->NationalCalendar = $this->MetaData["diocesan_calendars"][$this->DiocesanCalendar]["nation"];
        }
        $this->updateSettingsByNation($stagingURL);
    }
}

<?php

namespace LiturgicalCalendar\Examples\Php;

use LiturgicalCalendar\Examples\Php\Enums\Epiphany;
use LiturgicalCalendar\Examples\Php\Enums\Ascension;
use LiturgicalCalendar\Examples\Php\Enums\CorpusChristi;
use LiturgicalCalendar\Examples\Php\Enums\LitLocale;
use LiturgicalCalendar\Examples\Php\Enums\YearType;

class LitSettings
{
    public int $Year;
    public string $Epiphany          = Epiphany::JAN6;
    public string $Ascension         = Ascension::THURSDAY;
    public string $CorpusChristi     = CorpusChristi::THURSDAY;
    public string $YearType          = YearType::LITURGICAL;
    public bool $EternalHighPriest   = false;
    public ?string $Locale           = null;
    public ?string $NationalCalendar = null;
    public ?string $DiocesanCalendar = null;
    private ?array $MetaData         = null;
    private bool $directAccess       = false;

    private const ALLOWED_PARAMS  = [
        "year",
        "epiphany",
        "ascension",
        "corpus_christi",
        "locale",
        "national_calendar",
        "diocesan_calendar",
        "eternal_high_priest",
        "year_type"
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
                        $value = \Locale::canonicalize($value);
                        $this->Locale        = LitLocale::isValid($value)                 ? $value             : LitLocale::LATIN_PRIMARY_LANGUAGE;
                        break;
                    case "national_calendar":
                        $this->NationalCalendar = $value !== ""                           ? strtoupper($value) : null;
                        break;
                    case "diocesan_calendar":
                        $this->DiocesanCalendar = $value !== ""                           ? strtoupper($value) : null;
                        break;
                    case "eternal_high_priest":
                        $this->EternalHighPriest = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                        break;
                    case "year_type":
                        $this->YearType = YearType::isValid($value) ? $value : YearType::LITURGICAL;
                        break;
                }
            }
        }
    }

    /**
     * Constructor for LitSettings class.
     *
     * Initializes the settings for the liturgical calendar based on input data and direct access flag.
     * Sets the default year to the current year. Determines the locale from cookies, HTTP headers, or defaults to Latin if unavailable.
     * Ensures the Locale is canonicalized.
     * Delegates further variable setting to the setVars method.
     *
     * @param array $DATA An array of input parameters to initialize the settings.
     * @param bool $directAccess A flag indicating if the access is direct, default is false.
     */
    public function __construct(array $DATA, bool $directAccess = false)
    {
        //set a few default values
        $this->Year = (int)date("Y");

        if (!empty($_COOKIE["currentLocale"])) {
            $this->Locale = $_COOKIE["currentLocale"];
        } elseif (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            $this->Locale = \Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        } else {
            $this->Locale = LitLocale::LATIN_PRIMARY_LANGUAGE;
        }
        $this->Locale = \Locale::canonicalize($this->Locale);

        $this->directAccess = $directAccess;

        $this->setVars($DATA);
    }

    /**
     * Sets the Epiphany, Ascension, CorpusChristi, and Locale settings based on the selected National Calendar.
     * If the National Calendar is not set, or if it is set to "VA" (Vatican), the settings are set to their default values.
     * If the National Calendar is set to a different value, the settings are set to the corresponding values from the
     * NationalCalendarMetadata array.
     * If the directAccess flag is set to true, the function also sets the locale for the current PHP script using the
     * setlocale() function, and sets a cookie to store the current locale.
     * @param string $stagingURL the URL of the staging site (used to set the domain of the cookie)
     */
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
                $this->Locale           = LitLocale::LATIN_PRIMARY_LANGUAGE;
                break;
            default:
                $this->Epiphany         = $NationalCalendarMetadata["settings"]["epiphany"];
                $this->Ascension        = $NationalCalendarMetadata["settings"]["ascension"];
                $this->CorpusChristi    = $NationalCalendarMetadata["settings"]["corpus_christi"];
                $this->Locale           = $NationalCalendarMetadata["settings"]["locale"];
                break;
        }
        if ($this->directAccess) {
            $baseLocale = \Locale::getPrimaryLanguage($this->Locale);
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
        bindtextdomain("litexmplphp", "i18n");
        //textdomain("litcal");
        //ini_set('date.timezone', 'Europe/Vatican');
    }

    /**
     * Updates the internal metadata reference and then updates the settings based on the selected nation.
     *
     * @param array $MetaData A list of metadata about the diocesan calendars available.
     * @param string $stagingURL The URL of the staging server on which the API is hosted.
     * @return void
     */
    public function setMetaData(array $MetaData, string $stagingURL)
    {
        $this->MetaData = $MetaData;
        if ($this->DiocesanCalendar !== null) {
            $this->NationalCalendar = array_values(array_filter($this->MetaData["diocesan_calendars"], fn ($calendar) => $calendar["calendar_id"] === $this->DiocesanCalendar))[0]["nation"];
        }
        $this->updateSettingsByNation($stagingURL);
    }
}

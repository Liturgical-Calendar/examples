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
    public string $Epiphany                = Epiphany::JAN6;
    public string $Ascension               = Ascension::THURSDAY;
    public string $CorpusChristi           = CorpusChristi::THURSDAY;
    public string $YearType                = YearType::LITURGICAL;
    public bool $EternalHighPriest         = false;
    public ?string $Locale                 = null;
    public ?string $NationalCalendar       = null;
    public ?string $DiocesanCalendar       = null;
    public ?string $expectedTextDomainPath = null;
    public ?string $currentTextDomainPath  = null;
    private ?array $Metadata               = null;
    private bool $directAccess             = false;

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

    /**
     * Constructor for the LitSettings class.
     *
     * Initializes the settings for the liturgical calendar based on input data and direct access flag.
     * Sets the default year to the current year. Determines the locale from cookies, HTTP headers, or defaults to Latin if unavailable.
     * Ensures the Locale is canonicalized.
     * Delegates further variable setting to the setVars method.
     *
     * @param array $formData An array of input parameters to initialize the settings.
     * @param array $metadata An array of metadata about the national and diocesan calendars available and the supported locales.
     * @param bool $directAccess A flag indicating whether the PHP example is included within another page or being accessed directly.
     */
    public function __construct(array $formData, array $metadata, bool $directAccess = false)
    {
        // set default year value
        $this->Year = (int)date("Y");

        // set default locale value
        if (!empty($_COOKIE["currentLocale"])) {
            $this->Locale = $_COOKIE["currentLocale"];
        } elseif (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            $this->Locale = \Locale::acceptFromHttp($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        } else {
            $this->Locale = LitLocale::LATIN_PRIMARY_LANGUAGE;
        }
        $this->Locale = \Locale::canonicalize($this->Locale);

        $this->expectedTextDomainPath = dirname(__DIR__) . "/i18n";
        $this->currentTextDomainPath = bindtextdomain("litexmplphp", $this->expectedTextDomainPath);
        $this->directAccess = $directAccess;

        $this->setMetadata($metadata);
        $this->setVars($formData);
        $this->updateSettingsByCalendarMetadata();
    }

    /**
     * Private helper method to set the values of the object based on the GET global variable.
     *
     * This method is called by the constructor and sets the values of the object based on the parameters passed in the GET request.
     * The method iterates over the parameters and sets the values of the object based on the parameter names.
     * The values are validated to ensure they are within the allowed range and are of the correct type.
     *
     * @param array $DATA An associative array containing the parameters from the GET request.
     */
    private function setVars(array $DATA): void
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
                        $this->Epiphany         = Epiphany::isValid($value)      ? $value : Epiphany::JAN6;
                        break;
                    case "ascension":
                        $this->Ascension        = Ascension::isValid($value)     ? $value : Ascension::THURSDAY;
                        break;
                    case "corpus_christi":
                        $this->CorpusChristi    = CorpusChristi::isValid($value) ? $value : CorpusChristi::THURSDAY;
                        break;
                    case "locale":
                        $value = \Locale::canonicalize($value);
                        $this->Locale           = LitLocale::isValid($value)     ? $value : LitLocale::LATIN_PRIMARY_LANGUAGE;
                        break;
                    case "national_calendar":
                        $this->NationalCalendar = $this->isValidNationalCalendar($value) ? $value : null;
                        break;
                    case "diocesan_calendar":
                        $this->DiocesanCalendar = $this->isValidDiocesanCalendar($value) ? $value : null;
                        break;
                    case "eternal_high_priest":
                        $this->EternalHighPriest = is_bool($value) ? $value : filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                        break;
                    case "year_type":
                        $this->YearType         = YearType::isValid($value)      ? $value : YearType::LITURGICAL;
                        break;
                }
            }
        }
    }

    /**
     * Determines if the given value is a valid national calendar code.
     *
     * @param string $value The value to check.
     *
     * @return bool True if the value is valid, false otherwise.
     */
    private function isValidNationalCalendar($value)
    {
        return $value !== "" && $this->Metadata !== null && in_array($value, $this->Metadata["national_calendars_keys"]);
    }

    /**
     * Determines if the given value is a valid diocesan calendar code.
     *
     * @param string $value The value to check.
     *
     * @return bool True if the value is valid, false otherwise.
     */
    private function isValidDiocesanCalendar($value)
    {
        if ($this->NationalCalendar === null) {
            return $value !== "" && $this->Metadata !== null && in_array($value, $this->Metadata["diocesan_calendars_keys"]);
        } else {
            if (null === $this->Metadata) {
                return false;
            }
            $DiocesanCalendarsForNation = array_values(array_filter(
                $this->Metadata["diocesan_calendars"],
                fn ($calendar) => $calendar["nation"] === $this->NationalCalendar
            ));
            $DiocesanCalendarIds = array_column($DiocesanCalendarsForNation, "calendar_id");
            return $value !== "" && in_array($value, $DiocesanCalendarIds);
        }
    }

    /**
     * Sets the Epiphany, Ascension, CorpusChristi, and Locale settings based on the selected National or Diocesan Calendar.
     * If the National Calendar is not set, or if it is set to "VA" (Vatican), the settings are set to their default values.
     * If the National Calendar is set to a different value, the settings are set to the corresponding values from the
     * NationalCalendarMetadata array.
     * If the directAccess flag is set to true, the function also sets the locale for the current PHP script using the
     * setlocale() function, and sets a cookie to store the current locale.
     */
    private function updateSettingsByCalendarMetadata(): void
    {
        if (null === $this->Metadata) {
            return;
        }

        if ($this->NationalCalendar !== null && $this->NationalCalendar !== "VA") {
            $NationalCalendarMetadata = array_values(array_filter(
                $this->Metadata["national_calendars"],
                fn ($calendar) => $calendar["calendar_id"] === $this->NationalCalendar
            ))[0];
            switch ($this->NationalCalendar) {
                case "VA":
                case null:
                    $this->Epiphany          = Epiphany::JAN6;
                    $this->Ascension         = Ascension::THURSDAY;
                    $this->CorpusChristi     = CorpusChristi::THURSDAY;
                    $this->EternalHighPriest = false;
                    $this->Locale            = LitLocale::LATIN_PRIMARY_LANGUAGE;
                    break;
                default:
                    $this->setVars($NationalCalendarMetadata["settings"]);
                    break;
            }
        }

        if ($this->DiocesanCalendar !== null) {
            $DiocesanCalendarMetadata = array_values(array_filter(
                $this->Metadata["diocesan_calendars"],
                fn ($calendar) => $calendar["calendar_id"] === $this->DiocesanCalendar
            ))[0];
            if (array_key_exists("settings", $DiocesanCalendarMetadata)) {
                $this->setVars($DiocesanCalendarMetadata["settings"]);
            }
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
                $isStaging = ( strpos($_SERVER['HTTP_HOST'], "-staging") !== false );
                $stagingURL = $isStaging ? "-staging" : "";
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
    }

    /**
     * Updates the internal metadata reference and then updates the settings based on the selected nation.
     *
     * @param array $Metadata A list of metadata about the diocesan calendars available.
     * @return void
     */
    public function setMetadata(array $Metadata)
    {
        $this->Metadata = $Metadata;
        if ($this->DiocesanCalendar !== null) {
            $this->NationalCalendar = array_values(array_filter(
                $this->Metadata["diocesan_calendars"],
                fn ($calendar) => $calendar["calendar_id"] === $this->DiocesanCalendar
            ))[0]["nation"];
        }
    }
}
